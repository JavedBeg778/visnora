// POST /api/v1/tracking/start
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md

import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { startTrackingRun } from '@/domain/ai-visibility/collection-engine';
import { StartTrackingRunSchema } from '@/shared/validation/index';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId;
    const projectId = body.projectId;

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    if (!projectId) {
      return formatErrorResponse(new Error('projectId is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const validated = StartTrackingRunSchema.parse(body);

    const result = await startTrackingRun({
      organizationId: orgId,
      projectId,
      userId: user.id,
      promptIds: validated.promptIds,
      groupId: validated.groupId,
      provider: validated.provider,
      model: validated.model,
      enableGrounding: validated.enableGrounding,
    });

    return formatSuccessResponse(result, 201);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

