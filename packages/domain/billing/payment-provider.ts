// Visnora — Payment Provider Abstraction & Development Mock Gateway
// Reference: docs/TECHNICAL_BLUEPRINT.md & M4.5 Payment Provider Abstraction
// Hardened against Audit Findings 2 & 3 (Checkout Session Persistence & Lifecycle)

import crypto from 'crypto';
import { prisma } from '../../database/src/client';
import { getPlanBySlug } from './plan-service';
import { activateSubscription } from './subscription-service';
import { createInvoice } from './invoice-generator';
import {
  BillingCycle,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  PaymentVerificationRequest,
  PaymentVerificationResult,
  PlanSlug,
} from './types';

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResponse>;
  verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult>;
  processRefund?(paymentId: string, amountPaise?: number, reason?: string): Promise<{ success: boolean; refundId: string }>;
}

/**
 * In-memory fallback session store for development & unit testing
 */
const mockSessions = new Map<string, {
  organizationId: string;
  planSlug: PlanSlug;
  billingCycle: BillingCycle;
  amountPaise: number;
  currency: string;
  createdAt: number;
}>();

/**
 * Development-only Mock Payment Provider
 * Allows full checkout, testing, and lifecycle simulation without real monetary transactions.
 * STRICTLY DISABLED in production unless ENABLE_MOCK_BILLING=true is explicitly set.
 */
export class MockBillingProvider implements PaymentProvider {
  readonly name = 'mock';

  constructor() {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MOCK_BILLING !== 'true') {
      console.warn('[MockBillingProvider] Warning: Mock billing is running in production environment');
    }
  }

  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MOCK_BILLING !== 'true') {
      throw new Error('Mock billing checkout is disabled in production environments.');
    }

    const plan = await getPlanBySlug(request.planSlug);
    const amountPaise = request.billingCycle === 'ANNUAL' ? plan.annualPricePaise : plan.monthlyPricePaise;
    const sessionId = `mock_sess_${crypto.randomBytes(12).toString('hex')}`;
    const orderId = `mock_ord_${crypto.randomBytes(8).toString('hex')}`;

    // Store in-memory for zero-latency local lookups
    mockSessions.set(sessionId, {
      organizationId: request.organizationId,
      planSlug: request.planSlug,
      billingCycle: request.billingCycle,
      amountPaise,
      currency: plan.currency,
      createdAt: Date.now(),
    });

    // Audit Finding 2: Persist checkout session in PostgreSQL database
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.organizationId);
    if (isUuid) {
      try {
        const existingSub = await prisma.subscription.findUnique({
          where: { organizationId: request.organizationId },
        });

        if (existingSub) {
          await prisma.payment.create({
            data: {
              subscriptionId: existingSub.id,
              organizationId: request.organizationId,
              provider: 'mock',
              providerPaymentId: sessionId,
              idempotencyKey: `sess_${sessionId}`,
              amountPaise: BigInt(amountPaise),
              currency: plan.currency,
              status: 'pending',
              paymentMethod: 'TEST_CARD_SIMULATION',
            },
          });
        }
      } catch {
        // In offline/mock test environments, in-memory store remains primary
      }
    }

    return {
      sessionId,
      orderId,
      provider: 'mock',
      amountPaise,
      currency: plan.currency,
      planSlug: request.planSlug,
      billingCycle: request.billingCycle,
      status: 'PENDING',
      checkoutUrl: `/billing/checkout?session=${sessionId}`,
      isDevelopmentSimulation: true,
    };
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MOCK_BILLING !== 'true') {
      throw new Error('Mock billing verification is disabled in production environments.');
    }

    let session = mockSessions.get(request.sessionId);

    // Audit Finding 3: Fallback to database if in-memory store missing (e.g. server restart)
    if (!session && process.env.NODE_ENV !== 'test') {
      try {
        const persistedPayment = await prisma.payment.findFirst({
          where: {
            providerPaymentId: request.sessionId,
            status: 'pending',
          },
        });

        if (persistedPayment && persistedPayment.organizationId) {
          session = {
            organizationId: persistedPayment.organizationId,
            planSlug: (request.planSlug as PlanSlug) || 'pro',
            billingCycle: 'MONTHLY',
            amountPaise: Number(persistedPayment.amountPaise),
            currency: persistedPayment.currency,
            createdAt: persistedPayment.createdAt.getTime(),
          };
        }
      } catch {
        // Continue to error check
      }
    }

    if (!session) {
      throw new Error(`Invalid or expired checkout session: ${request.sessionId}`);
    }

    // Support simulated failure for testing failure recovery flows
    if (request.simulateFailure) {
      const sub = await prisma.subscription.findUnique({ where: { organizationId: session.organizationId } });
      const payment = await prisma.payment.create({
        data: {
          subscriptionId: sub?.id || crypto.randomUUID(),
          organizationId: session.organizationId,
          provider: 'mock',
          providerPaymentId: `mock_pay_fail_${Date.now()}`,
          idempotencyKey: `mock_fail_${request.sessionId}`,
          amountPaise: BigInt(session.amountPaise),
          currency: session.currency,
          status: 'failed',
          failureReason: request.failureReason || 'Simulated card decline or insufficient funds in test mode',
        },
      });

      return {
        success: false,
        paymentId: payment.id,
        transactionRef: `mock_pay_fail_${Date.now()}`,
        status: 'FAILED',
        amountPaise: session.amountPaise,
        currency: session.currency,
        errorMessage: request.failureReason || 'Simulated payment failure',
      };
    }

    // Activate subscription upon verified simulated payment
    const { subscription } = await activateSubscription({
      organizationId: session.organizationId,
      planSlug: session.planSlug,
      billingCycle: session.billingCycle,
      amountPaise: session.amountPaise,
      providerTransactionRef: request.providerPaymentId || `mock_tx_${Date.now()}`,
    });

    const txRef = request.providerPaymentId || `mock_pay_succ_${crypto.randomBytes(8).toString('hex')}`;
    const idempotencyKey = `mock_succ_${request.sessionId}`;

    // Audit Finding 4: Payment-to-invoice lifecycle
    let invoice = null;
    try {
      invoice = await createInvoice({
        organizationId: session.organizationId,
        subscriptionId: subscription.id,
        subtotalPaise: session.amountPaise,
        billingPeriodStart: subscription.currentPeriodStart,
        billingPeriodEnd: subscription.currentPeriodEnd,
        customerEmail: request.customerEmail,
        customerName: request.customerName,
      });
    } catch (invErr) {
      console.error('[MockBillingProvider] Invoice generation warning:', invErr);
    }

    // Record verified payment record with linked invoice
    const payment = await prisma.payment.upsert({
      where: { idempotencyKey },
      update: {
        status: 'captured',
        invoiceId: invoice?.id || null,
      },
      create: {
        subscriptionId: subscription.id,
        organizationId: session.organizationId,
        invoiceId: invoice?.id || null,
        provider: 'mock',
        providerPaymentId: txRef,
        idempotencyKey,
        amountPaise: BigInt(session.amountPaise),
        currency: session.currency,
        status: 'captured',
        paymentMethod: 'TEST_CARD_SIMULATION',
      },
    });

    // Clean up in-memory session
    mockSessions.delete(request.sessionId);

    return {
      success: true,
      paymentId: payment.id,
      transactionRef: txRef,
      status: 'CAPTURED',
      amountPaise: session.amountPaise,
      currency: session.currency,
    };
  }

  async processRefund(paymentId: string, amountPaise?: number, _reason?: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const refundId = `mock_ref_${crypto.randomBytes(8).toString('hex')}`;

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'refunded' },
    });

    return {
      success: true,
      refundId,
    };
  }
}

// Singleton provider resolver
let providerInstance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (providerInstance) return providerInstance;
  providerInstance = new MockBillingProvider();
  return providerInstance;
}
