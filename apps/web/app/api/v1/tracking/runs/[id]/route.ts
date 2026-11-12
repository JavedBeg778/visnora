// GET /api/v1/tracking/runs/[id]
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md

import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { getTrackingRunById } from '@/domain/ai-visibility/collection-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const orgId = request.headers.get('x-organization-id') || searchParams.get('orgId');

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const run = await getTrackingRunById(id, orgId);
    return formatSuccessResponse(run);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

