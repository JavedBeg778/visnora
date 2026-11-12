// Visnora — M3 Background Job Queue (BullMQ + Redis)
// Reference: docs/TECHNICAL_BLUEPRINT.md & M3.2 Tracking Reliability

import { Queue, QueueEvents, JobsOptions } from 'bullmq';
import Redis, { RedisOptions } from 'ioredis';

export const TRACKING_QUEUE_NAME = 'tracking-execution';

export interface TrackingJobData {
  trackingRunId: string;
  organizationId: string;
  projectId: string;
  brandId?: string;
  promptIds?: string[];
  provider: 'google-gemini' | 'openai';
  model: string;
  enableGrounding: boolean;
  dryRun: boolean;
}

let redisClient: Redis | null = null;
let trackingQueue: Queue<TrackingJobData> | null = null;
let queueEvents: QueueEvents | null = null;
let redisCheckCache: { available: boolean; lastChecked: number } | null = null;

/**
 * Scrubs potential secrets, API keys, and auth tokens from objects before logging.
 */
export function sanitizeLogData<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item)) as unknown as T;
  }

  const sanitized: Record<string, any> = {};
  const sensitivePattern = /key|secret|token|auth|password|credential|bearer/i;

  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (/password/i.test(key) && typeof value === 'string') {
      sanitized[key] = '[REDACTED]';
    } else if (sensitivePattern.test(key) && typeof value === 'string') {
      sanitized[key] = value.length > 8 ? `${value.slice(0, 4)}...[REDACTED]` : '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Returns Redis configuration options based on environment variables.
 * Fully supports Upstash Redis TLS (rediss://) and standard cloud Redis.
 */
export function getRedisConfig(): RedisOptions | null {
  const isProduction = process.env.NODE_ENV === 'production';
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const isTls = redisUrl.startsWith('rediss://') || process.env.REDIS_TLS === 'true';
    return {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 10000,
      tls: isTls
        ? {
            // In production, certificate verification is strictly enforced (rejectUnauthorized: true)
            // and cannot be disabled. Upstash TLS uses standard public CAs verified by Node.js.
            rejectUnauthorized: isProduction ? true : process.env.REDIS_REJECT_UNAUTHORIZED !== 'false',
          }
        : undefined,
      retryStrategy: (times) => {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 200, 2000);
      },
    };
  }

  const redisHost = process.env.REDIS_HOST;
  if (redisHost) {
    const isTls = process.env.REDIS_TLS === 'true';
    return {
      host: redisHost,
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      username: process.env.REDIS_USER || process.env.REDIS_USERNAME || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 10000,
      tls: isTls
        ? {
            rejectUnauthorized: isProduction ? true : process.env.REDIS_REJECT_UNAUTHORIZED !== 'false',
          }
        : undefined,
      retryStrategy: (times) => {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    };
  }

  return null;
}

/**
 * Creates a fresh, dedicated Redis connection (required for BullMQ Worker instances).
 */
export function createRedisConnection(): Redis | null {
  const config = getRedisConfig();
  if (!config) return null;

  try {
    const client = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL, config)
      : new Redis(config);

    client.on('error', (err) => {
      console.warn('[Redis] Connection issue:', err.message);
    });

    return client;
  } catch (err: any) {
    console.warn('[Redis] Failed to create connection:', err.message);
    return null;
  }
}

/**
 * Creates or retrieves a singleton Redis connection for queues.
 */
export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const config = getRedisConfig();
  if (!config) return null;

  try {
    if (process.env.REDIS_URL) {
      redisClient = new Redis(process.env.REDIS_URL, config);
    } else {
      redisClient = new Redis(config);
    }

    redisClient.on('error', (err) => {
      // Suppress noisy logs if Redis is unreachable in local dev / serverless
      console.warn('[TrackingQueue] Redis connection issue:', err.message);
    });

    return redisClient;
  } catch (err: any) {
    console.warn('[TrackingQueue] Failed to initialize Redis client:', err.message);
    return null;
  }
}

/**
 * Checks whether Redis is actively reachable.
 * Caches the response for 10 seconds to avoid ping storms.
 */
export async function isRedisAvailable(): Promise<boolean> {
  const now = Date.now();
  if (redisCheckCache && now - redisCheckCache.lastChecked < 10000) {
    return redisCheckCache.available;
  }

  const client = getRedisClient();
  if (!client) {
    redisCheckCache = { available: false, lastChecked: now };
    return false;
  }

  try {
    const pingPromise = client.ping();
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Redis ping timeout')), 2000)
    );

    const res = await Promise.race([pingPromise, timeoutPromise]);
    const isOk = res === 'PONG';
    redisCheckCache = { available: isOk, lastChecked: now };
    return isOk;
  } catch {
    redisCheckCache = { available: false, lastChecked: now };
    return false;
  }
}

/**
 * Returns the BullMQ Tracking Queue instance if Redis is configured.
 */
export function getTrackingQueue(): Queue<TrackingJobData> | null {
  if (trackingQueue) return trackingQueue;

  const client = getRedisClient();
  if (!client) return null;

  try {
    trackingQueue = new Queue<TrackingJobData>(TRACKING_QUEUE_NAME, {
      connection: client,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 3000,
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

    return trackingQueue;
  } catch (err: any) {
    console.warn('[TrackingQueue] Could not initialize BullMQ Queue:', err.message);
    return null;
  }
}

/**
 * Enqueues a tracking job into BullMQ if Redis is available.
 * Returns { queued: true, jobId } on success, or { queued: false, reason } on graceful degradation.
 */
export async function enqueueTrackingJob(
  data: TrackingJobData,
  options?: JobsOptions
): Promise<{ queued: boolean; jobId?: string; reason?: string }> {
  const isAvailable = await isRedisAvailable();
  if (!isAvailable) {
    return {
      queued: false,
      reason: 'REDIS_UNAVAILABLE',
    };
  }

  const queue = getTrackingQueue();
  if (!queue) {
    return {
      queued: false,
      reason: 'QUEUE_INITIALIZATION_FAILED',
    };
  }

  try {
    const job = await queue.add(
      'run-tracking',
      data,
      {
        jobId: `tracking-${data.trackingRunId}`,
        ...options,
      }
    );

    console.log(
      `[TrackingQueue] Job enqueued: ${job.id} for run: ${data.trackingRunId}`
    );

    return {
      queued: true,
      jobId: job.id,
    };
  } catch (err: any) {
    console.warn(`[TrackingQueue] Failed to add job: ${err.message}. Falling back.`);
    return {
      queued: false,
      reason: err.message,
    };
  }
}

/**
 * Inspect failed jobs in the tracking queue for troubleshooting and observability.
 */
export async function getFailedTrackingJobs(start = 0, end = 20) {
  const queue = getTrackingQueue();
  if (!queue) return [];
  try {
    const failed = await queue.getFailed(start, end);
    return failed.map((job) => ({
      id: job.id,
      name: job.name,
      data: sanitizeLogData(job.data),
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    }));
  } catch (err: any) {
    console.error('[TrackingQueue] Failed to query failed jobs:', err.message);
    return [];
  }
}

/**
 * Manually retry a failed job by its job ID.
 */
export async function retryTrackingJob(jobId: string): Promise<boolean> {
  const queue = getTrackingQueue();
  if (!queue) return false;
  try {
    const job = await queue.getJob(jobId);
    if (!job) return false;
    await job.retry();
    return true;
  } catch (err: any) {
    console.error(`[TrackingQueue] Failed to retry job ${jobId}:`, err.message);
    return false;
  }
}

/**
 * Returns tracking queue metrics (waiting, active, completed, failed counts).
 */
export async function getTrackingQueueMetrics() {
  const queue = getTrackingQueue();
  if (!queue) return null;
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  } catch (err: any) {
    console.error('[TrackingQueue] Failed to query queue metrics:', err.message);
    return null;
  }
}

/**
 * Gracefully closes queue connections.
 */
export async function closeTrackingQueue(): Promise<void> {
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }
  if (trackingQueue) {
    await trackingQueue.close();
    trackingQueue = null;
  }
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  redisCheckCache = null;
}

