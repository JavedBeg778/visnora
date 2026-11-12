// GET /api/v1/billing/payments
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
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

    const payments = await prisma.payment.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            pdfUrl: true,
          },
        },
      },
    });

    const serializedPayments = payments.map((p) => ({
      ...p,
      amountPaise: Number(p.amountPaise),
      amountFormatted: `₹${(Number(p.amountPaise) / 100).toLocaleString('en-IN')}`,
    }));

    return formatSuccessResponse(serializedPayments);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
