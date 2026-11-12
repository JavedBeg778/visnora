import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRedisConfig,
  getFailedTrackingJobs,
  retryTrackingJob,
  getTrackingQueueMetrics,
} from '../../packages/jobs/queues/tracking-queue';
import {
  processTrackingJob,
  getTrackingWorkerHealth,
  recoverStaleRunningRuns,
} from '../../packages/jobs/workers/tracking-worker';
import { prisma } from '../../packages/database/src/client';
import { POST as trackingStartPost } from '../../apps/web/app/api/v1/tracking/start/route';
import * as trackingQueue from '../../packages/jobs/queues/tracking-queue';
import * as apiHandler from '../../apps/web/lib/api-handler';
import { NextRequest } from 'next/server';

vi.mock('../../packages/database/src/client', () => {
  return {
    prisma: {
      trackingRun: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn(),
      },
      promptRun: {
        create: vi.fn().mockResolvedValue({ id: 'pr-1' }),
        update: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      aiResponse: {
        create: vi.fn(),
      },
      aiUsageRecord: {
        create: vi.fn(),
      },
      project: {
        findFirst: vi.fn(),
      },
      trackedPrompt: {
        findMany: vi.fn(),
      },
      organizationMember: {
        findFirst: vi.fn(),
      },
      subscription: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      usageCounter: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

describe('M3 Durable Background Worker & Queue Infrastructure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Redis & Upstash TLS Configuration', () => {
    it('configures TLS options when REDIS_URL uses rediss:// protocol', () => {
      const original = process.env.REDIS_URL;
      try {
        process.env.REDIS_URL = 'rediss://default:token@cluster-alias.upstash.io:6379';
        const config = getRedisConfig();

        expect(config).toBeDefined();
        expect(config?.tls).toBeDefined();
        expect(config?.maxRetriesPerRequest).toBeNull();
        expect(config?.connectTimeout).toBe(10000);
      } finally {
        process.env.REDIS_URL = original;
      }
    });

    it('sets maxRetriesPerRequest to null for BullMQ compatibility', () => {
      const originalHost = process.env.REDIS_HOST;
      try {
        delete process.env.REDIS_URL;
        process.env.REDIS_HOST = '127.0.0.1';
        process.env.REDIS_PORT = '6379';
        const config = getRedisConfig();

        expect(config).toBeDefined();
        expect(config?.maxRetriesPerRequest).toBeNull();
      } finally {
        process.env.REDIS_HOST = originalHost;
      }
    });

    it('enforces rejectUnauthorized: true in production Redis TLS configuration', () => {
      const prevEnv = process.env.NODE_ENV;
      const prevUrl = process.env.REDIS_URL;
      const prevReject = process.env.REDIS_REJECT_UNAUTHORIZED;
      try {
        (process.env as any).NODE_ENV = 'production';
        process.env.REDIS_URL = 'rediss://default:token@cluster-alias.upstash.io:6379';
        process.env.REDIS_REJECT_UNAUTHORIZED = 'false'; // Attempt to bypass TLS in production

        const config = getRedisConfig();
        expect(config?.tls).toBeDefined();
        // In production, rejectUnauthorized MUST strictly remain true
        expect((config?.tls as any).rejectUnauthorized).toBe(true);
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
        process.env.REDIS_URL = prevUrl;
        process.env.REDIS_REJECT_UNAUTHORIZED = prevReject;
      }
    });
  });

  describe('Cross-Tenant Worker Isolation', () => {
    it('strictly rejects jobs where run organization does not match job data', async () => {
      vi.mocked(prisma.trackingRun.findUnique).mockResolvedValue({
        id: 'run-legit-123',
        organizationId: 'real-tenant-org',
        projectId: 'real-tenant-proj',
        status: 'QUEUED',
      } as any);

      const fakeJob: any = {
        id: 'job-attacker',
        data: {
          trackingRunId: 'run-legit-123',
          organizationId: 'attacker-org-999', // Mismatched tenant
          projectId: 'real-tenant-proj',
          provider: 'google-gemini',
          model: 'gemini-3.8-flash',
          enableGrounding: false,
          dryRun: true,
        },
        updateProgress: vi.fn(),
      };

      await expect(processTrackingJob(fakeJob)).rejects.toThrow(
        /Unauthorized: Queue payload tenant does not match tracking run owner/
      );

      // CRITICAL: Legitimate victim tracking run MUST NOT be mutated or marked FAILED
      expect(prisma.trackingRun.update).not.toHaveBeenCalled();
    });
  });

  describe('Idempotency & Re-execution Skipping', () => {
    it('skips execution if tracking run is already in terminal COMPLETED state', async () => {
      vi.mocked(prisma.trackingRun.findUnique).mockResolvedValue({
        id: 'run-already-done',
        organizationId: 'org-1',
        projectId: 'proj-1',
        status: 'COMPLETED',
      } as any);

      const job: any = {
        id: 'job-repeat',
        data: {
          trackingRunId: 'run-already-done',
          organizationId: 'org-1',
          projectId: 'proj-1',
        },
        updateProgress: vi.fn(),
      };

      const result = await processTrackingJob(job);
      expect(result.skipped).toBe(true);
      expect(result.status).toBe('COMPLETED');
    });

    it('resumes execution if tracking run is in RUNNING state (worker restart / stalled job)', async () => {
      vi.mocked(prisma.trackingRun.findUnique).mockResolvedValue({
        id: 'run-stalled-restart',
        organizationId: 'org-1',
        projectId: 'proj-1',
        status: 'RUNNING', // Stalled from previous worker crash
        promptCount: 1,
      } as any);

      vi.mocked(prisma.trackingRun.update).mockResolvedValue({
        id: 'run-stalled-restart',
        organizationId: 'org-1',
        projectId: 'proj-1',
        status: 'COMPLETED',
        promptCount: 1,
        successCount: 1,
        failedCount: 0,
      } as any);

      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'proj-1',
        organizationId: 'org-1',
        isArchived: false,
        brands: [{ id: 'b-1', canonicalName: 'Acme', domain: 'acme.com', isPrimary: true, isArchived: false }],
        competitors: [],
      } as any);

      vi.mocked(prisma.trackedPrompt.findMany).mockResolvedValue([
        { id: 'p-1', queryText: 'prompt test', isActive: true, isArchived: false },
      ] as any);

      const job: any = {
        id: 'job-stalled-1',
        data: {
          trackingRunId: 'run-stalled-restart',
          organizationId: 'org-1',
          projectId: 'proj-1',
          dryRun: true,
        },
        opts: { attempts: 2 },
        attemptsMade: 1, // Redelivered as stalled
        updateProgress: vi.fn(),
      };

      // Execution must resume and complete without throwing or skipping
      const result = await processTrackingJob(job);
      expect(result).toBeDefined();
      expect(result.skipped).toBeUndefined();
    });

    it('recovers stale RUNNING runs whose heartbeat timed out via recoverStaleRunningRuns', async () => {
      vi.mocked(prisma.trackingRun.findMany).mockResolvedValue([
        {
          id: 'run-crashed-long-ago',
          status: 'RUNNING',
          updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
        },
      ] as any);

      const recoveredCount = await recoverStaleRunningRuns(15);
      expect(recoveredCount).toBe(1);
      expect(prisma.trackingRun.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'run-crashed-long-ago',
            status: 'RUNNING',
          }),
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: expect.stringContaining('Worker process timed out or activity heartbeat lapsed'),
          }),
        })
      );
    });

    it('does not recover actively running jobs whose heartbeat is fresh', async () => {
      // Stale query returns 0 items because active jobs have updatedAt <= threshold false
      vi.mocked(prisma.trackingRun.findMany).mockResolvedValue([]);

      const recoveredCount = await recoverStaleRunningRuns(15);
      expect(recoveredCount).toBe(0);
      expect(prisma.trackingRun.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('Worker Health & Status Reporting', () => {
    it('returns structured worker health status', async () => {
      const health = await getTrackingWorkerHealth();
      expect(health).toBeDefined();
      expect(['healthy', 'degraded', 'offline']).toContain(health.status);
      expect(typeof health.redisConnected).toBe('boolean');
      expect(health.queueName).toBe('tracking-execution');
      expect(health.concurrency).toBeGreaterThan(0);
      expect(typeof health.uptimeSeconds).toBe('number');
    });
  });

  describe('Production Fail-Closed on Queue Failure (Phase 3 Hardening)', () => {
    it('returns HTTP 503 and marks run as FAILED in production when Redis is unreachable', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevFallback = process.env.ENABLE_IN_MEMORY_TRACKING;
      try {
        (process.env as any).NODE_ENV = 'production';
        delete process.env.ENABLE_IN_MEMORY_TRACKING;

        vi.spyOn(apiHandler, 'getAuthenticatedUser').mockResolvedValue({
          id: 'user-1',
          email: 'user@example.com',
        } as any);

        vi.spyOn(apiHandler, 'assertProjectAccess').mockResolvedValue({} as any);

        vi.mocked(prisma.project.findFirst).mockResolvedValue({
          id: '293e8995-0113-480e-a062-26008ee8af21',
          organizationId: '293e8995-0113-480e-a062-26008ee8af21',
          isArchived: false,
          brands: [{ id: 'brand-1', canonicalName: 'Acme', domain: 'acme.com', isPrimary: true, isArchived: false }],
          competitors: [],
        } as any);

        vi.mocked(prisma.trackedPrompt.findMany).mockResolvedValue([
          { id: 'prompt-1', queryText: 'best crm software', isActive: true, isArchived: false },
        ] as any);

        // Queue fails because Redis is unavailable in production
        vi.spyOn(trackingQueue, 'enqueueTrackingJob').mockResolvedValue({
          queued: false,
          reason: 'REDIS_UNAVAILABLE',
        });

        vi.mocked(prisma.trackingRun.create).mockResolvedValue({
          id: 'run-prod-fail',
          organizationId: '293e8995-0113-480e-a062-26008ee8af21',
          projectId: '293e8995-0113-480e-a062-26008ee8af21',
          promptCount: 2,
          status: 'QUEUED',
        } as any);

        const request = new NextRequest('http://localhost:3000/api/v1/tracking/start', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-organization-id': '293e8995-0113-480e-a062-26008ee8af21',
          },
          body: JSON.stringify({
            organizationId: '293e8995-0113-480e-a062-26008ee8af21',
            projectId: '293e8995-0113-480e-a062-26008ee8af21',
            dryRun: true,
          }),
        });

        const response = await trackingStartPost(request);

        // Must FAIL CLOSED with HTTP 503 Service Unavailable
        expect(response.status).toBe(503);
        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('QUEUE_UNAVAILABLE');
        expect(response.headers.get('Retry-After')).toBe('30');

        // Tracking run MUST be recorded as FAILED in database
        expect(prisma.trackingRun.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'run-prod-fail' },
            data: expect.objectContaining({
              status: 'FAILED',
              errorMessage: expect.stringContaining('Durable queue unavailable'),
            }),
          })
        );
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
        process.env.ENABLE_IN_MEMORY_TRACKING = prevFallback;
      }
    });
  });
});
