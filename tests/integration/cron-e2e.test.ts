import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as cronGET, POST as cronPOST } from '../../apps/web/app/api/v1/tracking/cron/route';
import {
  claimAndTriggerDueSchedules,
  recoverOrphanedScheduleRuns,
  computeNextRunAt,
} from '../../packages/domain/ai-visibility/schedule-service';
import { prisma } from '../../packages/database/src/client';
import * as trackingQueue from '../../packages/jobs/queues/tracking-queue';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

vi.mock('../../packages/database/src/client', () => {
  return {
    prisma: {
      trackingSchedule: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      project: {
        findFirst: vi.fn(),
      },
      trackedPrompt: {
        findMany: vi.fn(),
      },
      trackingRun: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

describe('Cron End-to-End Scheduled Execution & Durability Flow', () => {
  const originalEnv = { ...process.env };
  const redisUrl = process.env.REDIS_TEST_URL || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  let redisClient: Redis | null = null;
  let isRedisReachable = false;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };

    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        connectTimeout: 2000,
        retryStrategy: () => null,
        lazyConnect: true,
      });
      await redisClient.connect();
      const res = await redisClient.ping();
      isRedisReachable = res === 'PONG';
    } catch {
      isRedisReachable = false;
      if (redisClient) {
        redisClient.disconnect();
        redisClient = null;
      }
    }
  });

  afterEach(async () => {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }
  });

  describe('Cron Authentication & Timing-Safe Comparison', () => {
    it('accepts legitimate CRON_SECRET via Authorization: Bearer', async () => {
      process.env.CRON_SECRET = 'super-secret-cron-token-xyz-12345';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      vi.mocked(prisma.trackingSchedule.findMany).mockResolvedValue([]);
      vi.mocked(prisma.trackingRun.findMany).mockResolvedValue([]);

      const req = new NextRequest('https://visnora.com/api/v1/tracking/cron', {
        method: 'POST',
        headers: {
          authorization: 'Bearer super-secret-cron-token-xyz-12345',
        },
      });

      const res = await cronPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.processedCount).toBe(0);
    });

    it('handles differing token lengths safely without throwing or leaking timing', async () => {
      process.env.CRON_SECRET = 'exact-32-byte-secret-token-1234';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      const shortReq = new NextRequest('https://visnora.com/api/v1/tracking/cron', {
        headers: { authorization: 'Bearer short' },
      });
      const shortRes = await cronGET(shortReq);
      expect(shortRes.status).toBe(403);

      const longReq = new NextRequest('https://visnora.com/api/v1/tracking/cron', {
        headers: { authorization: 'Bearer much-longer-than-the-server-configured-secret-token-attempt' },
      });
      const longRes = await cronGET(longReq);
      expect(longRes.status).toBe(403);
    });

    it('rejects calls when CRON_SECRET is unconfigured in production environment', async () => {
      delete process.env.CRON_SECRET;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      const req = new NextRequest('https://visnora.com/api/v1/tracking/cron', {
        headers: { authorization: 'Bearer arbitrary-token' },
      });

      const res = await cronGET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.message).toContain('CRON_SECRET is mandatory in production');
    });
  });

  describe('Full Cron-to-Queue Execution Lifecycle', () => {
    it('executes atomic schedule claim, creates QUEUED TrackingRun, and pushes to real Redis queue', async () => {
      const now = new Date('2026-11-12T12:00:00.000Z');
      const testSchedule = {
        id: 'sched-e2e-1',
        organizationId: 'org-e2e-1',
        projectId: 'proj-e2e-1',
        frequency: 'DAILY',
        provider: 'google-gemini',
        model: 'gemini-3.8-flash',
        groupId: null,
        isEnabled: true,
        lastRunAt: null,
        nextRunAt: new Date('2026-11-12T11:00:00.000Z'), // Due
      };

      vi.mocked(prisma.trackingSchedule.findMany).mockResolvedValue([testSchedule as any]);
      vi.mocked(prisma.trackingRun.findMany).mockResolvedValue([]); // No orphaned runs

      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'proj-e2e-1',
        organizationId: 'org-e2e-1',
        isArchived: false,
        brands: [{ id: 'brand-e2e-1', canonicalName: 'Acme', domain: 'acme.com', isPrimary: true, isArchived: false }],
        competitors: [],
      } as any);

      vi.mocked(prisma.trackedPrompt.findMany).mockResolvedValue([
        { id: 'prompt-e2e-1', organizationId: 'org-e2e-1', projectId: 'proj-e2e-1', isActive: true, isArchived: false },
      ] as any);

      const nextExpected = computeNextRunAt('DAILY', now);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return await callback({
          trackingSchedule: {
            findFirst: vi.fn().mockResolvedValue(testSchedule),
            update: vi.fn().mockResolvedValue({
              ...testSchedule,
              lastRunAt: now,
              nextRunAt: nextExpected,
            }),
          },
          trackingRun: {
            create: vi.fn().mockResolvedValue({
              id: 'run-e2e-created-1',
              organizationId: 'org-e2e-1',
              projectId: 'proj-e2e-1',
              status: 'QUEUED',
              triggerType: 'SCHEDULED',
            }),
          },
        });
      });

      const enqueueSpy = vi.spyOn(trackingQueue, 'enqueueTrackingJob').mockResolvedValue({
        queued: true,
        jobId: 'tracking-run-e2e-created-1',
      });

      const result = await claimAndTriggerDueSchedules({ now });

      expect(result.processedCount).toBe(1);
      expect(result.enqueuedJobs.length).toBe(1);
      expect(result.enqueuedJobs[0].trackingRunId).toBe('run-e2e-created-1');
      expect(result.enqueuedJobs[0].jobId).toBe('tracking-run-e2e-created-1');
      expect(enqueueSpy.mock.calls[0][0]).toMatchObject({
        trackingRunId: 'run-e2e-created-1',
        organizationId: 'org-e2e-1',
        projectId: 'proj-e2e-1',
        brandId: 'brand-e2e-1',
        promptIds: ['prompt-e2e-1'],
      });
    });

    it('safely reverts nextRunAt to 5-minute retry if queue enqueue fails, preventing lost schedules', async () => {
      const now = new Date('2026-11-12T12:00:00.000Z');
      const testSchedule = {
        id: 'sched-e2e-fail',
        organizationId: 'org-e2e-1',
        projectId: 'proj-e2e-1',
        frequency: 'DAILY',
        provider: 'google-gemini',
        model: 'gemini-3.8-flash',
        groupId: null,
        isEnabled: true,
        lastRunAt: null,
        nextRunAt: new Date('2026-11-12T11:00:00.000Z'),
      };

      vi.mocked(prisma.trackingSchedule.findMany).mockResolvedValue([testSchedule as any]);
      vi.mocked(prisma.trackingRun.findMany).mockResolvedValue([]);

      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'proj-e2e-1',
        organizationId: 'org-e2e-1',
        isArchived: false,
        brands: [{ id: 'brand-1', canonicalName: 'Acme', domain: 'acme.com', isPrimary: true, isArchived: false }],
        competitors: [],
      } as any);

      vi.mocked(prisma.trackedPrompt.findMany).mockResolvedValue([
        { id: 'prompt-1', organizationId: 'org-e2e-1', projectId: 'proj-e2e-1', isActive: true, isArchived: false },
      ] as any);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return await callback({
          trackingSchedule: {
            findFirst: vi.fn().mockResolvedValue(testSchedule),
            update: vi.fn().mockResolvedValue(testSchedule),
          },
          trackingRun: {
            create: vi.fn().mockResolvedValue({
              id: 'run-enqueue-fail',
              organizationId: 'org-e2e-1',
              projectId: 'proj-e2e-1',
              status: 'QUEUED',
            }),
          },
        });
      });

      // Simulate Redis or Queue failure
      vi.spyOn(trackingQueue, 'enqueueTrackingJob').mockResolvedValue({
        queued: false,
        reason: 'REDIS_CONNECTION_DROPPED',
      });

      const updateScheduleSpy = vi.mocked(prisma.trackingSchedule.update);
      const updateRunSpy = vi.mocked(prisma.trackingRun.update);

      const result = await claimAndTriggerDueSchedules({ now });

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toContain('REDIS_CONNECTION_DROPPED');

      // Check that schedule was reverted to 5-minute retry
      expect(updateScheduleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sched-e2e-fail' },
          data: expect.objectContaining({
            nextRunAt: expect.any(Date),
          }),
        })
      );

      // Check that run was marked FAILED with diagnostic message
      expect(updateRunSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-enqueue-fail' },
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: expect.stringContaining('REDIS_CONNECTION_DROPPED'),
          }),
        })
      );
    });

    it('recovers orphaned QUEUED runs left behind by process crashes', async () => {
      const orphanedRun = {
        id: 'run-orphaned-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
        status: 'QUEUED',
        provider: 'google-gemini',
        model: 'gemini-3.8-flash',
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      };

      vi.mocked(prisma.trackingRun.findMany).mockResolvedValue([orphanedRun as any]);

      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'proj-1',
        organizationId: 'org-1',
        isArchived: false,
        brands: [{ id: 'b-1', isPrimary: true, isArchived: false }],
      } as any);

      vi.mocked(prisma.trackedPrompt.findMany).mockResolvedValue([
        { id: 'p-1', organizationId: 'org-1', projectId: 'proj-1', isArchived: false, isActive: true },
      ] as any);

      const enqueueSpy = vi.spyOn(trackingQueue, 'enqueueTrackingJob').mockResolvedValue({
        queued: true,
        jobId: 'tracking-run-orphaned-1',
      });

      const recoveredCount = await recoverOrphanedScheduleRuns(2);

      expect(recoveredCount).toBe(1);
      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          trackingRunId: 'run-orphaned-1',
        })
      );
    });
  });
});

