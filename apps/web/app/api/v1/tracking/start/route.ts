// POST /api/v1/tracking/start
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md

import { NextRequest, after } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
  assertProjectAccess,
} from '@/lib/api-handler';
import { initTrackingRun } from '@/domain/ai-visibility/collection-engine';
import { StartTrackingRunSchema } from '@/shared/validation/index';

export const maxDuration = 300;

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
    const requestedBrandId = validated.brandId || body.brandId || undefined;
    await assertProjectAccess(orgId, projectId, user.id, requestedBrandId, 'ANALYST');

    const { trackingRun, executeRun } = await initTrackingRun({
      organizationId: orgId,
      projectId,
      brandId: requestedBrandId,
      userId: user.id,
      promptIds: validated.promptIds,
      groupId: validated.groupId,
      provider: validated.provider,
      model: validated.model,
      enableGrounding: validated.enableGrounding,
      dryRun: validated.dryRun,
    });

    // Schedule background prompt execution after sending HTTP 201 response immediately
    after(async () => {
      try {
        await executeRun();
      } catch (bgError) {
        console.error('[TrackingPipeline] Background execution failed:', bgError);
      }
    });

    return formatSuccessResponse(
      {
        ...trackingRun,
        trackingRunId: trackingRun.id,
        summary: {
          totalPrompts: trackingRun.promptCount,
          successCount: 0,
          failedCount: 0,
          status: 'RUNNING',
        },
        message: 'Tracking run initialized and evaluating in background',
      },
      201
    );
  } catch (err) {
    return formatErrorResponse(err);
  }
}

