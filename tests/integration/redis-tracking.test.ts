import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import {
  getRedisConfig,
  sanitizeLogData,
  TrackingJobData,
} from '../../packages/jobs/queues/tracking-queue';

describe('Real Redis Integration: Tracking Queue & Worker Lifecycle', () => {
  const redisUrl = process.env.REDIS_TEST_URL || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  let redisClient: Redis | null = null;
  let isRedisReachable = false;
  const testQueueName = `test-tracking-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  let testQueue: Queue<TrackingJobData> | null = null;
  let testWorker: Worker<TrackingJobData> | null = null;
  let workerRedisClient: Redis | null = null;

  beforeAll(async () => {
    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        connectTimeout: 3000,
        retryStrategy: () => null, // Do not hang if unreachable
        lazyConnect: true,
      });

      await redisClient.connect();
      const pingRes = await redisClient.ping();
      if (pingRes === 'PONG') {
        isRedisReachable = true;
      }
    } catch (err: any) {
      console.warn(`[Redis Integration Test] Redis at ${redisUrl} not reachable: ${err.message}. Skipping live Redis tests.`);
      isRedisReachable = false;
      if (redisClient) {
        redisClient.disconnect();
        redisClient = null;
      }
    }
  });

  afterAll(async () => {
    if (testWorker) {
      await testWorker.close();
      testWorker = null;
    }
    if (workerRedisClient) {
      await workerRedisClient.quit();
      workerRedisClient = null;
    }
    if (testQueue) {
      try {
        await testQueue.obliterate({ force: true });
      } catch (err: any) {
        // Ignore if obliterate fails during cleanup
      }
      await testQueue.close();
      testQueue = null;
    }
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }
  });

  it('verifies Redis connection and basic command execution', async () => {
    if (!isRedisReachable || !redisClient) {
      console.log('Skipping: Live Redis not reachable');
      return;
    }

    const res = await redisClient.ping();
    expect(res).toBe('PONG');
  });

  it('enforces TLS rejectUnauthorized: true in production mode and validates secure options', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalUrl = process.env.REDIS_URL;

    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      process.env.REDIS_URL = 'rediss://default:secret-token@live.upstash.io:6379';

      const config = getRedisConfig();
      expect(config).toBeDefined();
      expect(config?.tls).toBeDefined();
      expect(config?.tls?.rejectUnauthorized).toBe(true);
      expect(config?.maxRetriesPerRequest).toBeNull();
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
      process.env.REDIS_URL = originalUrl;
    }
  });

  it('redacts sensitive credentials, tokens, and passwords from log data', () => {
    const rawData = {
      trackingRunId: 'tr-123',
      apiKey: 'ai-secret-key-1234567890',
      password: 'super-secret-password',
      authToken: 'bearer-xyz-12345',
      nested: {
        clientSecret: 'secret-nested-value',
        normalField: 'safe-value',
      },
      list: [{ userToken: 'token-item-1' }],
    };

    const sanitized = sanitizeLogData(rawData);

    expect(sanitized.trackingRunId).toBe('tr-123');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.apiKey).toContain('[REDACTED]');
    expect(sanitized.apiKey).not.toBe('ai-secret-key-1234567890');
    expect(sanitized.authToken).toContain('[REDACTED]');
    expect(sanitized.nested.clientSecret).toContain('[REDACTED]');
    expect(sanitized.nested.normalField).toBe('safe-value');
    expect(sanitized.list[0].userToken).toContain('[REDACTED]');
  });

  it('enqueues a tracking job into BullMQ and verifies consumer processes it to completion', async () => {
    if (!isRedisReachable || !redisClient) {
      console.log('Skipping: Live Redis not reachable');
      return;
    }

    testQueue = new Queue<TrackingJobData>(testQueueName, {
      connection: redisClient,
    });

    const jobPayload: TrackingJobData = {
      trackingRunId: 'test-run-real-redis-001',
      organizationId: 'org-test-001',
      projectId: 'proj-test-001',
      provider: 'google-gemini',
      model: 'gemini-2.5-flash',
      enableGrounding: false,
      dryRun: true,
    };

    let processedJobId = '';
    let processedRunId = '';
    let progressRecorded = 0;

    workerRedisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      connectTimeout: 3000,
    });

    let resolveCompletion: (res: any) => void;
    let rejectCompletion: (err: any) => void;
    const completionPromise = new Promise((resolve, reject) => {
      resolveCompletion = resolve;
      rejectCompletion = reject;
    });

    testWorker = new Worker<TrackingJobData>(
      testQueueName,
      async (job: Job<TrackingJobData>) => {
        processedJobId = job.id || '';
        processedRunId = job.data.trackingRunId;
        await job.updateProgress(50);
        progressRecorded = 50;
        const result = { status: 'SUCCESS', count: 1 };
        resolveCompletion(result);
        return result;
      },
      {
        connection: workerRedisClient,
        concurrency: 1,
      }
    );

    testWorker.on('error', (err) => {
      rejectCompletion(err);
    });

    // Enqueue job
    const enqueuedJob = await testQueue.add('test-tracking-job', jobPayload, {
      jobId: `tracking-${jobPayload.trackingRunId}`,
    });

    expect(enqueuedJob.id).toBe(`tracking-${jobPayload.trackingRunId}`);

    // Wait for job completion promise with 10s timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Job execution timed out')), 10000)
    );

    const completedResult: any = await Promise.race([completionPromise, timeoutPromise]);

    expect(completedResult).toBeDefined();
    expect(completedResult.status).toBe('SUCCESS');
    expect(processedJobId).toBe(`tracking-${jobPayload.trackingRunId}`);
    expect(processedRunId).toBe(jobPayload.trackingRunId);
    expect(progressRecorded).toBe(50);
  });

  it('prevents duplicate job enqueueing with the same jobId', async () => {
    if (!isRedisReachable || !redisClient || !testQueue) {
      console.log('Skipping: Live Redis not reachable or test queue not created');
      return;
    }

    const duplicateJobPayload: TrackingJobData = {
      trackingRunId: 'test-run-dedup-002',
      organizationId: 'org-test-001',
      projectId: 'proj-test-001',
      provider: 'openai',
      model: 'gpt-4o',
      enableGrounding: false,
      dryRun: true,
    };

    const firstJob = await testQueue.add('test-tracking-job', duplicateJobPayload, {
      jobId: 'tracking-test-run-dedup-002',
    });

    // Attempt to add job with the same jobId
    const duplicateJob = await testQueue.add('test-tracking-job', duplicateJobPayload, {
      jobId: 'tracking-test-run-dedup-002',
    });

    // BullMQ returns the existing job instance when same jobId is passed
    expect(firstJob.id).toBe('tracking-test-run-dedup-002');
    expect(duplicateJob.id).toBe('tracking-test-run-dedup-002');

    // Ensure only 1 job exists for this id
    const job = await testQueue.getJob('tracking-test-run-dedup-002');
    expect(job).toBeDefined();
    expect(job?.id).toBe('tracking-test-run-dedup-002');
  });
});
