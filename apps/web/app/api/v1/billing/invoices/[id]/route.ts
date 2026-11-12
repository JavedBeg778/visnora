// GET /api/v1/billing/invoices/[id]
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
import { getInvoiceById } from '@/domain/billing/invoice-generator';
import { NotFoundError } from '@/domain/organizations/service';
import { ForbiddenError } from '@/shared/permissions/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { id } = await params;
    const inv = await prisma.invoice.findUnique({ where: { id } });

    if (!inv) {
      throw new NotFoundError(`Invoice with ID ${id} not found.`);
    }

    // Verify user is a member of the invoice's organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: inv.organizationId,
        userId: user.id,
      },
    });

    if (!membership) {
      throw new ForbiddenError('You do not have access to this invoice.');
    }

    const invoice = await getInvoiceById(inv.organizationId, id);

    return formatSuccessResponse(invoice);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
