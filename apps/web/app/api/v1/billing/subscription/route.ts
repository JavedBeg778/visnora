// GET /api/v1/billing/subscription
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
import { getOrganizationSubscription } from '@/domain/billing/subscription-service';
import { getOrganizationEntitlements } from '@/domain/billing/entitlements';
import { ForbiddenError } from '@/shared/permissions/rbac';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const orgId = request.headers.get('x-organization-id') || searchParams.get('orgId');

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    // Verify user is a member of this organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
      },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this organization.');
    }

    const subscription = await getOrganizationSubscription(orgId);
    const entitlements = await getOrganizationEntitlements(orgId);

    return formatSuccessResponse({
      subscription,
      entitlements,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
