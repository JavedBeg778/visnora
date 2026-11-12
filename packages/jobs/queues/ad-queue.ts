// Visnora — M5 Background Ad Queue (BullMQ + Redis)
// Reference: M5 Competitor Ad Intelligence & Monitoring

import { Queue, QueueEvents, JobsOptions } from 'bullmq';
import { getRedisClient, isRedisAvailable } from './tracking-queue';
import { AdSourceType } from '../../domain/ad-intelligence/types';

export const AD_QUEUE_NAME = 'ad-intelligence';

export interface AdCollectionJobData {
  jobType: 'COLLECTION';
  organizationId: string;
  projectId: string;
  competitorId?: string;
  brandId?: string;
  sourceType: AdSourceType;
  query: string;
  limit: number;
  country: string;
  autoAnalyze: boolean;
}

export interface AdMonitoringJobData {
  jobType: 'MONITORING';
  organizationId: string;
  projectId: string;
  competitorId?: string;
  country?: string;
}

export type AdJobData = AdCollectionJobData | AdMonitoringJobData;

let adQueue: Queue<AdJobData> | null = null;
let adQueueEvents: QueueEvents | null = null;

export function getAdQueue(): Queue<AdJobData> | null {
  if (adQueue) return adQueue;

  const client = getRedisClient();
  if (!client) return null;

  try {
    adQueue = new Queue<AdJobData>(AD_QUEUE_NAME, {
      connection: client,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 500,
          age: 60 * 60 * 24, // 24 hours
        },
        removeOnFail: {
          count: 500,
          age: 60 * 60 * 24 * 7, // 7 days
        },
      },
    });

    return adQueue;
  } catch (err: any) {
    console.warn('[AdQueue] Could not initialize BullMQ Queue:', err.message);
    return null;
  }
}

export async function enqueueAdCollectionJob(
  data: Omit<AdCollectionJobData, 'jobType'>,
  options?: JobsOptions
): Promise<{ queued: boolean; jobId?: string; reason?: string }> {
  const isAvailable = await isRedisAvailable();
  if (!isAvailable) {
    return { queued: false, reason: 'REDIS_UNAVAILABLE' };
  }

  const queue = getAdQueue();
  if (!queue) {
    return { queued: false, reason: 'QUEUE_INITIALIZATION_FAILED' };
  }

  try {
    const job = await queue.add(
      'collect-ads',
      { ...data, jobType: 'COLLECTION' },
      {
        jobId: `ad-collect-${data.organizationId}-${Date.now()}`,
        ...options,
      }
    );

    console.log(`[AdQueue] Ad collection job enqueued: ${job.id}`);
    return { queued: true, jobId: job.id };
  } catch (err: any) {
    console.warn(`[AdQueue] Failed to add collection job: ${err.message}`);
    return { queued: false, reason: err.message };
  }
}

export async function enqueueAdMonitoringJob(
  data: Omit<AdMonitoringJobData, 'jobType'>,
  options?: JobsOptions
): Promise<{ queued: boolean; jobId?: string; reason?: string }> {
  const isAvailable = await isRedisAvailable();
  if (!isAvailable) {
    return { queued: false, reason: 'REDIS_UNAVAILABLE' };
  }

  const queue = getAdQueue();
  if (!queue) {
    return { queued: false, reason: 'QUEUE_INITIALIZATION_FAILED' };
  }

  try {
    const job = await queue.add(
      'monitor-ads',
      { ...data, jobType: 'MONITORING' },
      {
        jobId: `ad-monitor-${data.organizationId}-${Date.now()}`,
        ...options,
      }
    );

    console.log(`[AdQueue] Ad monitoring job enqueued: ${job.id}`);
    return { queued: true, jobId: job.id };
  } catch (err: any) {
    console.warn(`[AdQueue] Failed to add monitoring job: ${err.message}`);
    return { queued: false, reason: err.message };
  }
}

export async function closeAdQueue(): Promise<void> {
  if (adQueueEvents) {
    await adQueueEvents.close();
    adQueueEvents = null;
  }
  if (adQueue) {
    await adQueue.close();
    adQueue = null;
  }
}

