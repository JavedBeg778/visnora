// PATCH /api/v1/recommendations/[id]
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md

import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { updateRecommendationStatus } from '@/domain/ai-visibility/recommendation-service';
import { UpdateRecommendationSchema } from '@/shared/validation/index';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId;

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const validated = UpdateRecommendationSchema.parse(body);
    const updated = await updateRecommendationStatus(id, orgId, validated.status);

    return formatSuccessResponse(updated);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

