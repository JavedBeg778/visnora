// Visnora — GET /api/v1/ads/collect/[id]
// Retrieve status of an ad collection run

import { NextRequest } from 'next/server';
import { prisma } from '@/database/src/client';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';

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
    const orgId = request.headers.get('x-organization-id');

    const run = await prisma.adCollectionRun.findUnique({
      where: { id },
      include: {
        competitor: {
          select: { id: true, canonicalName: true, domain: true },
        },
      },
    });

    if (!run) {
      return formatErrorResponse(new Error('Collection run not found'), 'Not found', 'NOT_FOUND', 404);
    }

    if (orgId && run.organizationId !== orgId) {
      return formatErrorResponse(new Error('Forbidden'), 'Access denied', 'FORBIDDEN', 403);
    }

    return formatSuccessResponse(run);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
