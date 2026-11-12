// Visnora — Production Persistent Tracking Worker (BullMQ + Redis)
// Reference: docs/TECHNICAL_BLUEPRINT.md & Finding 14 Remediation

import { Worker, Job } from 'bullmq';
import { prisma } from '../../database/src/client';
import {
  TRACKING_QUEUE_NAME,
  TrackingJobData,
  createRedisConnection,
  getRedisClient,
  isRedisAvailable,
  sanitizeLogData,
} from '../queues/tracking-queue';
import { executeTrackingRunPrompts } from '../../domain/ai-visibility/collection-engine';
import { BrandEntity } from '../../domain/ai-visibility/types';

export interface TrackingWorkerHealth {
  status: 'healthy' | 'degraded' | 'offline';
  isReady: boolean;
  redisConnected: boolean;
  concurrency: number;
  queueName: string;
  uptimeSeconds: number;
}

let trackingWorkerInstance: Worker<TrackingJobData> | null = null;
const workerStartTime = Date.now();

/**
 * Core job processor for tracking runs.
 * Guarantees cross-tenant isolation, idempotency, state persistence, and error handling.
 */
export async function processTrackingJob(job: Job<TrackingJobData>): Promise<any> {
  const {
    trackingRunId,
    organizationId,
    projectId,
    brandId,
    promptIds,
    provider,
    model,
    enableGrounding,
    dryRun,
  } = job.data;

  console.log(`[TrackingWorker] Processing job ${job.id} for tracking run ${trackingRunId}`);

  // 1. Fetch tracking run from PostgreSQL
  const trackingRun = await prisma.trackingRun.findUnique({
    where: { id: trackingRunId },
  });

  if (!trackingRun) {
    throw new Error(`Tracking run ${trackingRunId} not found in database`);
  }

  // 2. Strict Cross-Tenant Verification:
  // Authoritative tenant ownership is anchored to the database record.
  // If the queue payload contains a mismatched organization or project ID, reject immediately.
  // CRITICAL SECURITY REQUIREMENT:
  // Do NOT mutate or mark FAILED the legitimate tracking run belonging to another tenant!
  // Forged queue payloads must not be allowed to poison another tenant's execution.
  if (trackingRun.organizationId !== organizationId || trackingRun.projectId !== projectId) {
    const errorMsg = `Cross-tenant violation: Run ${trackingRunId} (authoritative org: ${trackingRun.organizationId}, proj: ${trackingRun.projectId}) does not match unverified payload tenant (org: ${organizationId}, proj: ${projectId})`;
    console.error(`[TrackingWorker] SECURITY ALERT: ${errorMsg}`);
    throw new Error('Unauthorized: Queue payload tenant does not match tracking run owner');
  }

  // 3. Idempotency & Terminal State Check:
  // Completed runs are terminal and must NEVER be re-executed
  if (['COMPLETED', 'PARTIALLY_COMPLETED'].includes(trackingRun.status)) {
    console.log(
      `[TrackingWorker] Tracking run ${trackingRunId} is already completed (${trackingRun.status}). Skipping execution.`
    );
    return { skipped: true, status: trackingRun.status, reason: 'ALREADY_COMPLETED' };
  }

  // If run is already marked FAILED, only allow execution if this job is an explicit BullMQ retry or manual retry
  const isRetry = (job.attemptsMade && job.attemptsMade > 0) || false;
  if (trackingRun.status === 'FAILED' && !isRetry) {
    console.log(
      `[TrackingWorker] Tracking run ${trackingRunId} is marked FAILED and this delivery is not a retry attempt. Skipping.`
    );
    return { skipped: true, status: trackingRun.status, reason: 'ALREADY_FAILED' };
  }

  // 4. Update status to RUNNING if currently QUEUED or retrying
  if (trackingRun.status === 'RUNNING') {
    console.log(
      `[TrackingWorker] Tracking run ${trackingRunId} is already in RUNNING state. Resuming execution for stalled job or worker restart.`
    );
  } else {
    await prisma.trackingRun.update({
      where: { id: trackingRunId },
      data: {
        status: 'RUNNING',
        startedAt: trackingRun.startedAt || new Date(),
        errorMessage: null, // Clear error message on fresh or retried attempt
      },
    });
  }

  await job.updateProgress(10);

  // Active heartbeat timer: updates updatedAt in database every 30s while processing
  // Ensures long-running prompt batches are never marked FAILED by stale run recovery
  const heartbeatTimer = setInterval(async () => {
    try {
      await prisma.trackingRun.updateMany({
        where: { id: trackingRunId, status: 'RUNNING' },
        data: { updatedAt: new Date() },
      });
    } catch (heartbeatErr: any) {
      console.warn(`[TrackingWorker] Heartbeat ping failed for run ${trackingRunId}:`, heartbeatErr.message);
    }
  }, 30000);

  try {
    // 5. Fetch project, brands, competitors
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId, isArchived: false },
      include: {
        brands: { where: { isArchived: false } },
        competitors: { where: { isArchived: false } },
      },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found or has been archived`);
    }

    let targetBrand = null;
    if (brandId) {
      targetBrand = project.brands.find((b) => b.id === brandId);
      if (!targetBrand) {
        targetBrand = await prisma.brand.findFirst({
          where: { id: brandId, organizationId, isArchived: false },
        });
      }
    }
    if (!targetBrand) {
      targetBrand = project.brands.find((b) => b.isPrimary) || project.brands[0];
    }
    if (!targetBrand) {
      throw new Error('No target brand found for this project');
    }

    const targetBrandEntity: BrandEntity = {
      id: targetBrand.id,
      canonicalName: targetBrand.canonicalName,
      domain: targetBrand.domain,
      aliases: targetBrand.aliases || [],
    };

    const competitorEntities: BrandEntity[] = project.competitors.map((c) => ({
      id: c.id,
      canonicalName: c.canonicalName,
      domain: c.domain,
      aliases: c.aliases || [],
    }));

    // 6. Fetch active prompts
    const prompts = await prisma.trackedPrompt.findMany({
      where: {
        organizationId,
        projectId,
        isArchived: false,
        isActive: true,
        ...(promptIds && promptIds.length > 0 ? { id: { in: promptIds } } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    if (prompts.length === 0) {
      throw new Error('No active prompts found to evaluate for this run');
    }

    await job.updateProgress(25);

    // 7. Execute Prompts via Collection Engine with isolated prompt error catching
    const result = await executeTrackingRunPrompts({
      trackingRun,
      prompts,
      targetBrandEntity,
      competitorEntities,
      provider,
      model,
      enableGrounding,
      dryRun,
    });

    await job.updateProgress(100);

    console.log(
      `[TrackingWorker] Finished run ${trackingRunId}: Status=${result.status}, Success=${result.summary.successCount}, Failed=${result.summary.failedCount}`
    );

    return sanitizeLogData(result.summary);
  } catch (err: any) {
    console.error(`[TrackingWorker] Execution error on run ${trackingRunId}:`, err.message);

    const maxAttempts = job.opts?.attempts || 2;
    const willRetry = (job.attemptsMade || 0) < maxAttempts - 1;

    // Persist failure details to database
    // If BullMQ will retry this job, preserve RUNNING state with diagnostic note
    // If attempts are exhausted, set terminal FAILED state
    await prisma.trackingRun.update({
      where: { id: trackingRunId },
      data: {
        status: willRetry ? 'RUNNING' : 'FAILED',
        errorMessage: willRetry
          ? `Attempt ${(job.attemptsMade || 0) + 1}/${maxAttempts} failed: ${err.message}. Retrying...`
          : err.message,
        completedAt: willRetry ? null : new Date(),
      },
    });

    throw err;
  } finally {
    clearInterval(heartbeatTimer);
  }
}

/**
 * Recovers stale RUNNING tracking runs whose worker process crashed or timed out.
 * Runs whose updatedAt has not changed for longer than maxAgeMinutes are marked FAILED
 * so they do not hang indefinitely on dashboards and can be retried safely.
 */
export async function recoverStaleRunningRuns(maxAgeMinutes = 15): Promise<number> {
  const threshold = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  try {
    const staleRuns = await prisma.trackingRun.findMany({
      where: {
        status: 'RUNNING',
        updatedAt: { lte: threshold },
      },
      take: 20,
    });

    let recoveredCount = 0;
    for (const run of staleRuns) {
      console.warn(
        `[TrackingWorker] Recovering stale RUNNING tracking run ${run.id} (stalled since ${run.updatedAt.toISOString()})`
      );
      // Atomic conditional update eliminates race conditions with active workers or concurrent recovery runs
      const claimResult = await prisma.trackingRun.updateMany({
        where: {
          id: run.id,
          status: 'RUNNING',
          updatedAt: { lte: threshold },
        },
        data: {
          status: 'FAILED',
          errorMessage: `Execution lease expired: Worker process timed out or activity heartbeat lapsed after ${maxAgeMinutes}m. Eligible for retry.`,
          completedAt: new Date(),
        },
      });
      if (claimResult.count > 0) {
        recoveredCount++;
      }
    }

    return recoveredCount;
  } catch (err: any) {
    console.error('[TrackingWorker] Failed to recover stale running runs:', err.message);
    return 0;
  }
}

/**
 * Initializes and starts the persistent Tracking BullMQ Worker.
 */
export function startTrackingWorker(concurrency?: number): Worker<TrackingJobData> | null {
  if (trackingWorkerInstance) return trackingWorkerInstance;

  // Run immediate recovery for any runs that stalled prior to worker startup
  recoverStaleRunningRuns().catch((err) => {
    console.warn('[TrackingWorker] Initial stale run recovery warning:', err.message);
  });

  const redisConnection = createRedisConnection() || getRedisClient();
  if (!redisConnection) {
    console.warn('[TrackingWorker] Cannot start worker: Redis connection is unavailable.');
    return null;
  }

  const effectiveConcurrency =
    concurrency || Number(process.env.WORKER_CONCURRENCY) || 2;

  trackingWorkerInstance = new Worker<TrackingJobData>(
    TRACKING_QUEUE_NAME,
    async (job) => {
      return await processTrackingJob(job);
    },
    {
      connection: redisConnection,
      concurrency: effectiveConcurrency,
      lockDuration: 300000, // 5 minutes lock duration for long-running batches
      stalledInterval: 30000, // Check for stalled jobs every 30s
      maxStalledCount: 2,
    }
  );

  trackingWorkerInstance.on('ready', () => {
    console.log(
      `[TrackingWorker] Worker ready for queue "${TRACKING_QUEUE_NAME}" (concurrency=${effectiveConcurrency})`
    );
  });

  trackingWorkerInstance.on('completed', (job, returnvalue) => {
    console.log(`[TrackingWorker] Job ${job.id} completed successfully`);
  });

  trackingWorkerInstance.on('failed', (job, err) => {
    console.error(`[TrackingWorker] Job ${job?.id} failed:`, err.message);
  });

  trackingWorkerInstance.on('error', (err) => {
    console.error('[TrackingWorker] Worker connection error:', err.message);
  });

  return trackingWorkerInstance;
}

/**
 * Stops the Tracking Worker gracefully.
 */
export async function stopTrackingWorker(): Promise<void> {
  if (trackingWorkerInstance) {
    console.log('[TrackingWorker] Closing worker instance gracefully...');
    await trackingWorkerInstance.close();
    trackingWorkerInstance = null;
    console.log('[TrackingWorker] Worker closed.');
  }
}

/**
 * Returns worker health and readiness information.
 */
export async function getTrackingWorkerHealth(): Promise<TrackingWorkerHealth> {
  const redisConnected = await isRedisAvailable();
  const isReady = trackingWorkerInstance !== null && trackingWorkerInstance.isRunning() && redisConnected;

  let status: 'healthy' | 'degraded' | 'offline' = 'offline';
  if (isReady) {
    status = 'healthy';
  } else if (redisConnected) {
    status = 'degraded';
  }

  return {
    status,
    isReady,
    redisConnected,
    concurrency: Number(process.env.WORKER_CONCURRENCY) || 2,
    queueName: TRACKING_QUEUE_NAME,
    uptimeSeconds: Math.floor((Date.now() - workerStartTime) / 1000),
  };
}

// Graceful shutdown handling on process signals
const handleProcessShutdown = async (signal: string) => {
  console.log(`[TrackingWorker] Received ${signal}. Initiating graceful worker shutdown...`);
  try {
    await stopTrackingWorker();
    process.exit(0);
  } catch (err: any) {
    console.error('[TrackingWorker] Error during shutdown:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => handleProcessShutdown('SIGTERM'));
process.on('SIGINT', () => handleProcessShutdown('SIGINT'));

// Auto-run if executed directly as entrypoint
if (typeof require !== 'undefined' && require.main === module) {
  startTrackingWorker();
}

