// GET /api/v1/billing/usage
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
import { getOrganizationUsageSummary } from '@/domain/billing/usage-meter';
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

    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
      },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this organization.');
    }

    const summary = await getOrganizationUsageSummary(orgId);

    const isWarning80 = summary.usagePercentage >= 80 && summary.usagePercentage < 100;
    const isWarning100 = summary.usagePercentage >= 100;

    return formatSuccessResponse({
      ...summary,
      isWarning80,
      isWarning100,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
