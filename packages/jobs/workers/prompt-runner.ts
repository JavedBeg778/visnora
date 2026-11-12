// Visnora — M3 Background Job Worker (BullMQ Prompt Runner)
// Reference: docs/TECHNICAL_BLUEPRINT.md & M3.2 Tracking Reliability

import { Worker, Job } from 'bullmq';
import { prisma } from '../../database/src/client';
import {
  TRACKING_QUEUE_NAME,
  TrackingJobData,
  getRedisClient,
  sanitizeLogData,
} from '../queues/tracking-queue';
import { executeTrackingRunPrompts } from '../../domain/ai-visibility/collection-engine';
import { BrandEntity } from '../../domain/ai-visibility/types';

export async function processTrackingJob(job: Job<TrackingJobData>): Promise<any> {
  const { trackingRunId, organizationId, projectId, brandId, promptIds, provider, model, enableGrounding, dryRun } =
    job.data;

  console.log(`[PromptWorker] Starting job ${job.id} for tracking run ${trackingRunId}`);

  // 1. Fetch tracking run
  const trackingRun = await prisma.trackingRun.findUnique({
    where: { id: trackingRunId },
  });

  if (!trackingRun) {
    throw new Error(`Tracking run ${trackingRunId} not found in database`);
  }

  // Idempotency check: if run is already completed or failed, do not rerun
  if (['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED'].includes(trackingRun.status)) {
    console.log(`[PromptWorker] Tracking run ${trackingRunId} is already in terminal state: ${trackingRun.status}`);
    return { skipped: true, status: trackingRun.status };
  }

  // 2. Fetch project, brands, competitors
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, isArchived: false },
    include: {
      brands: { where: { isArchived: false } },
      competitors: { where: { isArchived: false } },
    },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found or archived`);
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

  // 3. Fetch active prompts
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
    throw new Error('No active prompts found to track');
  }

  await job.updateProgress(10);

  // 4. Execute prompts
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
    `[PromptWorker] Finished tracking run ${trackingRunId}: Status=${result.status}, Success=${result.summary.successCount}, Failed=${result.summary.failedCount}`
  );

  return sanitizeLogData(result.summary);
}

let workerInstance: Worker<TrackingJobData> | null = null;

export function startPromptWorker(concurrency = 2): Worker<TrackingJobData> | null {
  if (workerInstance) return workerInstance;

  const redis = getRedisClient();
  if (!redis) {
    console.warn('[PromptWorker] Cannot start worker: Redis connection unavailable');
    return null;
  }

  workerInstance = new Worker<TrackingJobData>(
    TRACKING_QUEUE_NAME,
    async (job) => {
      return await processTrackingJob(job);
    },
    {
      connection: redis,
      concurrency,
      lockDuration: 300000, // 5 minutes lock duration for long-running batches
    }
  );

  workerInstance.on('completed', (job, returnvalue) => {
    console.log(`[PromptWorker] Job ${job.id} completed successfully:`, returnvalue);
  });

  workerInstance.on('failed', (job, err) => {
    console.error(`[PromptWorker] Job ${job?.id} failed with error:`, err.message);
  });

  workerInstance.on('error', (err) => {
    console.error('[PromptWorker] Worker encountered error:', err.message);
  });

  console.log(`[PromptWorker] Background worker started for queue "${TRACKING_QUEUE_NAME}" (concurrency=${concurrency})`);

  return workerInstance;
}

// Graceful shutdown handlers
async function handleShutdown(signal: string) {
  console.log(`[PromptWorker] Received ${signal}. Shutting down worker gracefully...`);
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
  process.exit(0);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Auto-run if executed directly as entrypoint
if (typeof require !== 'undefined' && require.main === module) {
  startPromptWorker();
}

