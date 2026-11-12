// POST /api/v1/billing/subscription/reactivate
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
import { reactivateSubscription } from '@/domain/billing/subscription-service';
import { assertPermission, ForbiddenError } from '@/shared/permissions/rbac';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId;

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
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

    const result = await reactivateSubscription(orgId);

    // Record audit log for reactivation
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorUserId: user.id,
        action: 'SUBSCRIPTION_REACTIVATED',
        targetEntity: 'subscription',
        targetId: result.id,
        metadata: {
          newPeriodEnd: result.currentPeriodEnd,
        },
      },
    });

    return formatSuccessResponse({
      subscription: result,
      message: 'Subscription successfully reactivated. Automatic renewal has been restored.',
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
