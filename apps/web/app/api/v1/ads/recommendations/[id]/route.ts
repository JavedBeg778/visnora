// Visnora — PATCH /api/v1/ads/recommendations/[id]
// Update recommendation status

import { NextRequest } from 'next/server';
import { prisma } from '@/database/src/client';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const allowed = ['NEW', 'REVIEWED', 'APPLIED', 'DISMISSED'];
    if (!status || !allowed.includes(status)) {
      return formatErrorResponse(new Error(`Invalid status. Must be one of: ${allowed.join(', ')}`), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const updated = await prisma.adRecommendation.update({
      where: { id },
      data: { status },
    });

    return formatSuccessResponse(updated);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
