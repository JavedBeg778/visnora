// POST /api/v1/tracking/runs/[id]/retry
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md

import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
  assertProjectAccess,
} from '@/lib/api-handler';
import { getTrackingRunById, retryFailedTrackingRun } from '@/domain/ai-visibility/collection-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json().catch(() => ({}));
    const orgId = request.headers.get('x-organization-id') || body.organizationId;

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const existingRun = await getTrackingRunById(id, orgId);
    await assertProjectAccess(orgId, existingRun.projectId, user.id, undefined, 'ANALYST');
    const result = await retryFailedTrackingRun(id, orgId, user.id);
    return formatSuccessResponse(result);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

