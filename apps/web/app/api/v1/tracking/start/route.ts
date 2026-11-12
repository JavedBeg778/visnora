// POST /api/v1/tracking/start
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md
// Hardened against Audit Finding 6 (Duplicate Collection Runs) & Finding 11 (Rate Limiting)

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
import { checkRateLimit } from '@/shared/security/rate-limiter';
import { prisma } from '@/database/src/client';

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

    // Rate Limiting: max 10 tracking starts per minute per org
    const rateLimit = await checkRateLimit(orgId, 'TRACKING');
    if (!rateLimit.allowed) {
      return formatErrorResponse(
        new Error('Tracking request rate limit exceeded. Please wait a moment before starting another run.'),
        'Too many tracking requests',
        'RATE_LIMIT_EXCEEDED',
        429
      );
    }

    const validated = StartTrackingRunSchema.parse(body);
    const requestedBrandId = validated.brandId || body.brandId || undefined;
    await assertProjectAccess(orgId, projectId, user.id, requestedBrandId, 'ANALYST');

    // Audit Finding 6: Duplicate collection run protection (within 30s)
    const activeRun = await prisma.trackingRun.findFirst({
      where: {
        organizationId: orgId,
        projectId,
        status: 'RUNNING',
        startedAt: { gt: new Date(Date.now() - 30_000) },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (activeRun) {
      return formatSuccessResponse(
        {
          ...activeRun,
          trackingRunId: activeRun.id,
          isExistingActiveRun: true,
          summary: {
            totalPrompts: activeRun.promptCount,
            successCount: 0,
            failedCount: 0,
            status: 'RUNNING',
          },
          message: 'A tracking run is already actively running for this project. Returning active run.',
        },
        200
      );
    }

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
      // Phase 3 Audit Finding 14 Hardening:
      // Production strictly requires a durable BullMQ queue. Never silently fall back to after() in production.
      const isProduction = process.env.NODE_ENV === 'production';
      const allowDevFallback = process.env.ENABLE_IN_MEMORY_TRACKING === 'true';

      if (isProduction && !allowDevFallback) {
        console.error(
          `[TrackingPipeline] Queue failure in production for run ${trackingRun.id}: ${queueResult.reason || 'REDIS_UNAVAILABLE'}. Aborting run to protect execution integrity.`
        );

        // Mark the tracking run as FAILED in database
        await prisma.trackingRun.update({
          where: { id: trackingRun.id },
          data: {
            status: 'FAILED',
            errorMessage: `Durable queue unavailable (${queueResult.reason || 'REDIS_UNAVAILABLE'}). Tracking aborted to prevent unmonitored serverless drop.`,
            completedAt: new Date(),
          },
        });

        const resp = formatErrorResponse(
          new Error('Durable background queue is currently unavailable. Please retry shortly.'),
          'Durable queue unavailable. The tracking job could not be enqueued to persistent workers.',
          'QUEUE_UNAVAILABLE',
          503
        );
        resp.headers.set('Retry-After', '30');
        return resp;
      }

      // In local development/test environments only:
      console.warn(
        `[TrackingPipeline] Notice: Running tracking run ${trackingRun.id} in development-only fallback mode via after().`
      );
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
