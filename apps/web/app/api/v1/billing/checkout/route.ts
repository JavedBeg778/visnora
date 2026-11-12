// POST /api/v1/billing/checkout
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
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

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    if (!planSlug) {
      return formatErrorResponse(new Error('planSlug is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

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

    const provider = getPaymentProvider();
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

    return formatSuccessResponse(session);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
