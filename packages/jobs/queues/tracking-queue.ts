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
 */
export function getRedisConfig(): RedisOptions | null {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 5000,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 200, 1000);
      },
    };
  }

  const redisHost = process.env.REDIS_HOST;
  if (redisHost) {
    return {
      host: redisHost,
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 5000,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    };
  }

  return null;
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

