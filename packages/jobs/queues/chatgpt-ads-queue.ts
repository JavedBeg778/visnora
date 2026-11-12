// Visnora — M6 ChatGPT Ads Background Queue (BullMQ + Redis)
// Reference: M6 ChatGPT Ads Intelligence & Campaign Management

import { Queue, QueueEvents, JobsOptions } from 'bullmq';
import { getRedisClient, isRedisAvailable } from './tracking-queue';

export const CHATGPT_ADS_QUEUE_NAME = 'chatgpt-ads-sync';

export interface ChatGPTAdsSyncJobData {
  jobType: 'ACCOUNT_SYNC';
  organizationId: string;
  accountId: string;
  syncRunId?: string;
  syncType?: 'FULL' | 'INCREMENTAL' | 'INSIGHTS';
}

export interface ChatGPTAdsRecommendationsJobData {
  jobType: 'GENERATE_RECOMMENDATIONS';
  organizationId: string;
  accountId?: string;
  campaignId?: string;
}

export type ChatGPTAdsJobData = ChatGPTAdsSyncJobData | ChatGPTAdsRecommendationsJobData;

let chatGPTAdsQueue: Queue<ChatGPTAdsJobData> | null = null;
let chatGPTAdsQueueEvents: QueueEvents | null = null;

export function getChatGPTAdsQueue(): Queue<ChatGPTAdsJobData> | null {
  if (chatGPTAdsQueue) return chatGPTAdsQueue;

  const client = getRedisClient();
  if (!client) return null;

  try {
    chatGPTAdsQueue = new Queue<ChatGPTAdsJobData>(CHATGPT_ADS_QUEUE_NAME, {
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

    return chatGPTAdsQueue;
  } catch (err: any) {
    console.warn('[ChatGPTAdsQueue] Could not initialize BullMQ Queue:', err.message);
    return null;
  }
}

export async function enqueueAccountSyncJob(
  data: Omit<ChatGPTAdsSyncJobData, 'jobType'>,
  options?: JobsOptions
): Promise<{ queued: boolean; jobId?: string; reason?: string }> {
  const isAvailable = await isRedisAvailable();
  if (!isAvailable) {
    return { queued: false, reason: 'REDIS_UNAVAILABLE' };
  }

  const queue = getChatGPTAdsQueue();
  if (!queue) {
    return { queued: false, reason: 'QUEUE_INITIALIZATION_FAILED' };
  }

  try {
    const job = await queue.add(
      'sync-account',
      { ...data, jobType: 'ACCOUNT_SYNC' },
      {
        jobId: `ads-sync-${data.accountId}-${Date.now()}`,
        ...options,
      }
    );

    console.log(`[ChatGPTAdsQueue] Account sync job enqueued: ${job.id}`);
    return { queued: true, jobId: job.id };
  } catch (err: any) {
    console.warn(`[ChatGPTAdsQueue] Failed to add sync job: ${err.message}`);
    return { queued: false, reason: err.message };
  }
}

export async function enqueueRecommendationsJob(
  data: Omit<ChatGPTAdsRecommendationsJobData, 'jobType'>,
  options?: JobsOptions
): Promise<{ queued: boolean; jobId?: string; reason?: string }> {
  const isAvailable = await isRedisAvailable();
  if (!isAvailable) {
    return { queued: false, reason: 'REDIS_UNAVAILABLE' };
  }

  const queue = getChatGPTAdsQueue();
  if (!queue) {
    return { queued: false, reason: 'QUEUE_INITIALIZATION_FAILED' };
  }

  try {
    const job = await queue.add(
      'generate-recommendations',
      { ...data, jobType: 'GENERATE_RECOMMENDATIONS' },
      {
        jobId: `ads-rec-${data.organizationId}-${Date.now()}`,
        ...options,
      }
    );

    console.log(`[ChatGPTAdsQueue] Recommendations job enqueued: ${job.id}`);
    return { queued: true, jobId: job.id };
  } catch (err: any) {
    console.warn(`[ChatGPTAdsQueue] Failed to add recommendations job: ${err.message}`);
    return { queued: false, reason: err.message };
  }
}

export async function closeChatGPTAdsQueue(): Promise<void> {
  if (chatGPTAdsQueueEvents) {
    await chatGPTAdsQueueEvents.close();
    chatGPTAdsQueueEvents = null;
  }
  if (chatGPTAdsQueue) {
    await chatGPTAdsQueue.close();
    chatGPTAdsQueue = null;
  }
}

