// POST /api/v1/billing/subscription/cancel
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
import { cancelSubscription } from '@/domain/billing/subscription-service';
import { assertPermission, ForbiddenError } from '@/shared/permissions/rbac';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId;
    const immediate = Boolean(body.immediate);
    const reason = body.reason || 'User initiated cancellation';

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

    const result = await cancelSubscription(orgId, immediate);

    // Record audit log for cancellation
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorUserId: user.id,
        action: 'SUBSCRIPTION_CANCELED',
        targetEntity: 'subscription',
        targetId: result.id,
        metadata: {
          immediate,
          reason,
          effectiveCancellationDate: result.effectiveCancellationDate,
        },
      },
    });

    return formatSuccessResponse({
      subscription: result,
      message: immediate
        ? 'Subscription canceled immediately.'
        : `Subscription will remain active until end of billing cycle (${result.effectiveCancellationDate?.toISOString().slice(0, 10)}).`,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
