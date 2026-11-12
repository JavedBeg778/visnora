// POST /api/v1/billing/subscription/upgrade
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
import { changeSubscriptionPlan } from '@/domain/billing/subscription-service';
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

    // Role check: Only ADMIN or OWNER can upgrade subscriptions
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

    const updated = await changeSubscriptionPlan({
      organizationId: orgId,
      targetPlanSlug: planSlug,
      billingCycle,
    });

    return formatSuccessResponse({
      subscription: updated,
      message: `Subscription successfully upgraded to ${planSlug.toUpperCase()}`,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
