// Visnora — Payment Provider Abstraction & Development Mock Gateway
// Reference: docs/TECHNICAL_BLUEPRINT.md & M4.5 Payment Provider Abstraction

import crypto from 'crypto';
import { prisma } from '../../database/src/client';
import { getPlanBySlug } from './plan-service';
import { activateSubscription } from './subscription-service';
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
 * In-memory session store for development simulation
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
 * STRICTLY DISABLED in production.
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

    mockSessions.set(sessionId, {
      organizationId: request.organizationId,
      planSlug: request.planSlug,
      billingCycle: request.billingCycle,
      amountPaise,
      currency: plan.currency,
      createdAt: Date.now(),
    });

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

    const session = mockSessions.get(request.sessionId);
    if (!session) {
      throw new Error(`Invalid or expired checkout session: ${request.sessionId}`);
    }

    // Support simulated failure for testing failure recovery flows
    if (request.simulateFailure) {
      const payment = await prisma.payment.create({
        data: {
          subscriptionId: (await prisma.subscription.findUnique({ where: { organizationId: session.organizationId } }))?.id || crypto.randomUUID(),
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

    // Record verified payment record
    const payment = await prisma.payment.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        subscriptionId: subscription.id,
        organizationId: session.organizationId,
        provider: 'mock',
        providerPaymentId: txRef,
        idempotencyKey,
        amountPaise: BigInt(session.amountPaise),
        currency: session.currency,
        status: 'captured',
        paymentMethod: 'TEST_CARD_SIMULATION',
      },
    });

    // Clean up session
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

  async processRefund(paymentId: string, amountPaise?: number, reason?: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const refundPaise = amountPaise ? BigInt(amountPaise) : payment.amountPaise;
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

/**
 * Future Razorpay Adapter Extension Point
 * Ready for live credentials and webhook signature verification when the founder integrates Razorpay.
 */
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = 'razorpay';

  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    throw new Error('Razorpay integration is planned for future milestone. Use mock billing in development.');
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    throw new Error('Razorpay verification is planned for future milestone.');
  }
}

/**
 * Factory returning active payment provider.
 */
export function getPaymentProvider(): PaymentProvider {
  if (process.env.PAYMENT_PROVIDER === 'razorpay') {
    return new RazorpayPaymentProvider();
  }
  return new MockBillingProvider();
}

