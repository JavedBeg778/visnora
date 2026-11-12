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
import { enqueueTrackingJob } from '@/jobs/queues/tracking-queue';

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

    // Attempt durable BullMQ queue execution if Redis is configured; fallback gracefully to after()
    let executionMode: 'BULLMQ_QUEUE' | 'SERVERLESS_AFTER_FALLBACK' = 'SERVERLESS_AFTER_FALLBACK';
    const queueResult = await enqueueTrackingJob({
      trackingRunId: trackingRun.id,
      organizationId: orgId,
      projectId,
      brandId: validated.brandId || body.brandId,
      promptIds: validated.promptIds,
      provider: validated.provider || 'google-gemini',
      model: validated.model || 'gemini-3.8-flash',
      enableGrounding: validated.enableGrounding || false,
      dryRun: validated.dryRun || false,
    });

    if (queueResult.queued) {
      executionMode = 'BULLMQ_QUEUE';
    } else {
      // Fallback: Schedule background prompt execution via Next.js after()
      after(async () => {
        try {
          await executeRun();
        } catch (bgError) {
          console.error('[TrackingPipeline] Background execution failed:', bgError);
        }
      });
    }

    return formatSuccessResponse(
      {
        ...trackingRun,
        trackingRunId: trackingRun.id,
        executionMode,
        queued: queueResult.queued,
        summary: {
          totalPrompts: trackingRun.promptCount,
          successCount: 0,
          failedCount: 0,
          status: 'RUNNING',
        },
        message:
          executionMode === 'BULLMQ_QUEUE'
            ? 'Tracking run queued for background worker execution'
            : 'Tracking run initialized and evaluating in background',
      },
      201
    );
  } catch (err) {
    return formatErrorResponse(err);
  }
}

