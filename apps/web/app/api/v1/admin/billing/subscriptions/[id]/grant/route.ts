// POST /api/v1/admin/billing/subscriptions/[id]/grant
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
import { adminGrantPlan } from '@/domain/billing/admin-billing';
import { ForbiddenError } from '@/shared/permissions/rbac';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const adminMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!adminMembership) {
      throw new ForbiddenError('Administrative billing access required.');
    }

    const { id } = await params;
    const body = await request.json();
    const planSlug = body.planSlug;
    const billingCycle = body.billingCycle || 'MONTHLY';
    const reason = body.reason || 'Admin manual grant';
    const durationMonths = body.durationMonths || 1;

    if (!planSlug) {
      return formatErrorResponse(new Error('planSlug is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const updated = await adminGrantPlan({
      organizationId: id,
      planSlug,
      billingCycle,
      reason,
      actorUserId: user.id,
      durationMonths,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return formatSuccessResponse({
      subscription: updated,
      message: `Plan ${planSlug.toUpperCase()} successfully granted to organization ${id}`,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

