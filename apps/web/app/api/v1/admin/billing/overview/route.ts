// GET /api/v1/admin/billing/overview
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
import { getAdminBillingOverview } from '@/domain/billing/admin-billing';
import { ForbiddenError } from '@/shared/permissions/rbac';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    // Role check: Admin or Owner privilege required
    const adminMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!adminMembership) {
      throw new ForbiddenError('Administrative billing access required.');
    }

    const overview = await getAdminBillingOverview();
    return formatSuccessResponse(overview);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

