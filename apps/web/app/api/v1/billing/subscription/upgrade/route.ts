// POST /api/v1/billing/subscription/upgrade
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md
// Hardened against Audit Finding 1 (Direct Subscription Upgrade / Payment Bypass)

import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
import { changeSubscriptionPlan, getOrganizationSubscription } from '@/domain/billing/subscription-service';
import { getPaymentProvider } from '@/domain/billing/payment-provider';
import { assertPermission, ForbiddenError } from '@/shared/permissions/rbac';
import { PlanSlug, BillingCycle } from '@/domain/billing/types';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId;
    const planSlug = body.planSlug as PlanSlug;
    const billingCycle = (body.billingCycle || 'MONTHLY') as BillingCycle;
    const sessionId = body.sessionId as string | undefined;

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    if (!planSlug) {
      return formatErrorResponse(new Error('planSlug is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    // Role check: Only ADMIN or OWNER can manage subscriptions
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
      },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this organization.');
    }

    assertPermission(membership.role, 'ADMIN');

    // Audit Finding 1: Enforce payment verification workflow for paid upgrades
    const isPaidPlan = planSlug !== 'starter' && planSlug !== 'free';

    if (isPaidPlan) {
      const provider = getPaymentProvider();

      if (!sessionId) {
        // Return a required checkout session instead of directly granting paid entitlements
        const origin = request.headers.get('origin') || 'http://localhost:3000';
        const session = await provider.createCheckoutSession({
          organizationId: orgId,
          planSlug,
          billingCycle,
          customerEmail: user.email,
          customerName: user.email.split('@')[0],
          successUrl: `${origin}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
          cancelUrl: `${origin}/billing/pricing?status=cancelled`,
        });

        return formatSuccessResponse({
          requiresCheckout: true,
          checkoutSession: session,
          message: 'Paid plan upgrade requires checkout confirmation. Please complete the simulated checkout session.',
        });
      }

      // If sessionId is provided, verify payment before granting upgrade
      const verification = await provider.verifyPayment({
        organizationId: orgId,
        sessionId,
        planSlug,
        customerEmail: user.email,
        customerName: user.email.split('@')[0],
      });

      if (!verification.success) {
        return formatErrorResponse(
          new Error(verification.errorMessage || 'Payment verification failed.'),
          'Payment required',
          'PAYMENT_REQUIRED',
          402
        );
      }

      const activeSub = await getOrganizationSubscription(orgId);
      return formatSuccessResponse({
        subscription: activeSub,
        message: `Subscription successfully upgraded to ${planSlug.toUpperCase()} (Simulated Transaction Verified: ${verification.transactionRef})`,
      });
    }

    // Free / Starter downgrades can execute directly
    const updated = await changeSubscriptionPlan({
      organizationId: orgId,
      targetPlanSlug: planSlug,
      billingCycle,
    });

    return formatSuccessResponse({
      subscription: updated,
      message: `Subscription successfully updated to ${planSlug.toUpperCase()}`,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
