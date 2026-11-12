import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeNextRunAt,
  claimAndTriggerDueSchedules,
  recoverOrphanedScheduleRuns,
} from '../../packages/domain/ai-visibility/schedule-service';
import { prisma } from '../../packages/database/src/client';
import * as trackingQueue from '../../packages/jobs/queues/tracking-queue';
import { GET as cronGET, POST as cronPOST } from '../../apps/web/app/api/v1/tracking/cron/route';
import { NextRequest } from 'next/server';

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
        findMany: vi.fn().mockResolvedValue([]),
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

describe('M3 Automated Tracking Schedules & Cron Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  describe('Next Run Calculation Accuracy', () => {
    it('computes next hourly run accurately (+1 hour)', () => {
      const base = new Date('2026-11-12T10:00:00.000Z');
      const next = computeNextRunAt('HOURLY', base);
      expect(next.toISOString()).toBe('2026-11-12T11:00:00.000Z');
    });

    it('computes next daily run accurately (+1 day)', () => {
      const base = new Date('2026-11-12T10:00:00.000Z');
      const next = computeNextRunAt('DAILY', base);
      expect(next.toISOString()).toBe('2026-11-13T10:00:00.000Z');
      expect(next.getTime() - base.getTime()).toBe(24 * 60 * 60 * 1000);
    });

    it('computes next weekly run accurately (+7 days)', () => {
      const base = new Date('2026-11-12T10:00:00.000Z');
      const next = computeNextRunAt('WEEKLY', base);
      expect(next.getTime() - base.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('computes next monthly run accurately (+1 month)', () => {
      const base = new Date('2026-11-12T10:00:00.000Z');
      const next = computeNextRunAt('MONTHLY', base);
      expect(next.getMonth()).toBe(11); // December (0-indexed 11)
    });
  });

  describe('Due Schedule Selection & Atomic Claiming', () => {
    it('identifies and enqueues due schedules', async () => {
      const now = new Date('2026-11-12T12:00:00.000Z');
      const mockSchedule = {
        id: 'sched-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
        frequency: 'DAILY',
        provider: 'google-gemini',
        model: 'gemini-3.8-flash',
        groupId: null,
        isEnabled: true,
        lastRunAt: null,
        nextRunAt: new Date('2026-11-12T11:00:00.000Z'), // Past/due
      };

      vi.mocked(prisma.trackingSchedule.findMany).mockResolvedValue([mockSchedule as any]);

      // $transaction mock executing atomic claim
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return await callback({
          trackingSchedule: {
            findFirst: vi.fn().mockResolvedValue(mockSchedule),
            update: vi.fn().mockResolvedValue({
              ...mockSchedule,
              lastRunAt: now,
              nextRunAt: new Date('2026-11-13T12:00:00.000Z'),
            }),
          },
          trackingRun: {
            create: vi.fn().mockResolvedValue({
              id: 'run-123',
              organizationId: 'org-1',
              projectId: 'proj-1',
              status: 'QUEUED',
            }),
          },
        });
      });

      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'proj-1',
        organizationId: 'org-1',
        isArchived: false,
        brands: [{ id: 'brand-1', canonicalName: 'Acme', domain: 'acme.com', isPrimary: true, isArchived: false }],
      } as any);

      vi.mocked(prisma.trackedPrompt.findMany).mockResolvedValue([
        { id: 'prompt-1', queryText: 'best crm software', isActive: true, isArchived: false },
      ] as any);

      vi.mocked(prisma.trackingRun.create).mockResolvedValue({
        id: 'run-123',
        organizationId: 'org-1',
        projectId: 'proj-1',
        status: 'QUEUED',
      } as any);

      const enqueueSpy = vi.spyOn(trackingQueue, 'enqueueTrackingJob').mockResolvedValue({
        queued: true,
        jobId: 'job-xyz',
      });

      const result = await claimAndTriggerDueSchedules({ now });

      expect(result.processedCount).toBe(1);
      expect(result.enqueuedJobs[0].scheduleId).toBe('sched-1');
      expect(result.enqueuedJobs[0].trackingRunId).toBe('run-123');
      expect(enqueueSpy).toHaveBeenCalled();
    });

    it('prevents duplicate execution on concurrent claims (atomic claim race condition test)', async () => {
      const now = new Date('2026-11-12T12:00:00.000Z');
      const mockSchedule = {
        id: 'sched-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
        frequency: 'DAILY',
        isEnabled: true,
        nextRunAt: new Date('2026-11-12T11:00:00.000Z'),
      };

      vi.mocked(prisma.trackingSchedule.findMany).mockResolvedValue([mockSchedule as any]);

      // Simulate concurrent invocation: another worker already claimed the schedule
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return await callback({
          trackingSchedule: {
            findFirst: vi.fn().mockResolvedValue(null), // Null means already claimed!
            update: vi.fn(),
          },
        });
      });

      const enqueueSpy = vi.spyOn(trackingQueue, 'enqueueTrackingJob');

      const result = await claimAndTriggerDueSchedules({ now });

      // Must be skipped gracefully without duplicate execution
      expect(result.processedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it('disables schedules if the associated project is archived or deleted', async () => {
      const now = new Date('2026-11-12T12:00:00.000Z');
      const mockSchedule = {
        id: 'sched-orphan',
        organizationId: 'org-1',
        projectId: 'proj-deleted',
        frequency: 'DAILY',
        isEnabled: true,
        nextRunAt: new Date('2026-11-12T11:00:00.000Z'),
      };

      vi.mocked(prisma.trackingSchedule.findMany).mockResolvedValue([mockSchedule as any]);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return await callback({
          trackingSchedule: {
            findFirst: vi.fn().mockResolvedValue(mockSchedule),
            update: vi.fn().mockResolvedValue(mockSchedule),
          },
        });
      });

      // Project not found
      vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

      const result = await claimAndTriggerDueSchedules({ now });

      expect(result.processedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(prisma.trackingSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sched-orphan' },
          data: { isEnabled: false },
        })
      );
    });

    it('reverts nextRunAt for retry and marks tracking run FAILED when BullMQ enqueue fails (Cron-to-Queue Durability)', async () => {
      const now = new Date('2026-11-12T12:00:00.000Z');
      const mockSchedule = {
        id: 'sched-fail-enqueue',
        organizationId: 'org-1',
        projectId: 'proj-1',
        frequency: 'DAILY',
        isEnabled: true,
        nextRunAt: new Date('2026-11-12T11:00:00.000Z'),
      };

      vi.mocked(prisma.trackingSchedule.findMany).mockResolvedValue([mockSchedule as any]);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return await callback({
          trackingSchedule: {
            findFirst: vi.fn().mockResolvedValue(mockSchedule),
            update: vi.fn().mockResolvedValue(mockSchedule),
          },
          trackingRun: {
            create: vi.fn().mockResolvedValue({ id: 'run-enqueue-fail', status: 'QUEUED' }),
          },
        });
      });

      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'proj-1',
        organizationId: 'org-1',
        isArchived: false,
        brands: [{ id: 'brand-1', isPrimary: true, isArchived: false }],
      } as any);

      vi.mocked(prisma.trackedPrompt.findMany).mockResolvedValue([
        { id: 'p-1', queryText: 'test prompt', isActive: true, isArchived: false },
      ] as any);

      // Simulate Redis enqueue failure
      vi.spyOn(trackingQueue, 'enqueueTrackingJob').mockResolvedValue({
        queued: false,
        reason: 'REDIS_CONNECTION_REFUSED',
      });

      const result = await claimAndTriggerDueSchedules({ now });

      expect(result.processedCount).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toContain('QUEUE_UNAVAILABLE');

      // Schedule nextRunAt MUST be updated with a short retry time (not tomorrow)
      expect(prisma.trackingSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sched-fail-enqueue' },
          data: expect.objectContaining({
            nextRunAt: expect.any(Date),
          }),
        })
      );

      // Tracking run MUST be recorded as FAILED
      expect(prisma.trackingRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-enqueue-fail' },
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: expect.stringContaining('QUEUE_UNAVAILABLE'),
          }),
        })
      );
    });

    it('recovers orphaned QUEUED runs via recoverOrphanedScheduleRuns', async () => {
      vi.mocked(prisma.trackingRun.findMany).mockResolvedValue([
        {
          id: 'orphaned-run-1',
          organizationId: 'org-1',
          projectId: 'proj-1',
          provider: 'google-gemini',
          model: 'gemini-3.8-flash',
          createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
        },
      ] as any);

      vi.mocked(prisma.project.findFirst).mockResolvedValue({
        id: 'proj-1',
        organizationId: 'org-1',
        isArchived: false,
        brands: [{ id: 'b-1', isPrimary: true, isArchived: false }],
      } as any);

      vi.mocked(prisma.trackedPrompt.findMany).mockResolvedValue([
        { id: 'p-1', queryText: 'test prompt', isActive: true, isArchived: false },
      ] as any);

      const enqueueSpy = vi.spyOn(trackingQueue, 'enqueueTrackingJob').mockResolvedValue({
        queued: true,
        jobId: 'recovered-job-1',
      });

      const recoveredCount = await recoverOrphanedScheduleRuns(2);

      expect(recoveredCount).toBe(1);
      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          trackingRunId: 'orphaned-run-1',
        })
      );
    });
  });

  describe('Cron API Endpoint Security (/api/v1/tracking/cron)', () => {
    it('rejects unauthorized invocation when CRON_SECRET is configured', async () => {
      process.env.CRON_SECRET = 'secret-cron-key-12345';

      const request = new NextRequest('http://localhost:3000/api/v1/tracking/cron', {
        headers: {
          authorization: 'Bearer wrong-secret-token',
        },
      });

      const response = await cronGET(request);
      expect([401, 403]).toContain(response.status);
      const json = await response.json();
      expect(json.success).toBe(false);
    });

    it('rejects invocation without authorization header when secret is configured', async () => {
      process.env.CRON_SECRET = 'secret-cron-key-12345';

      const request = new NextRequest('http://localhost:3000/api/v1/tracking/cron');

      const response = await cronPOST(request);
      expect([401, 403]).toContain(response.status);
    });

    it('enforces mandatory CRON_SECRET in production environment', async () => {
      const prevEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';
        delete process.env.CRON_SECRET;

        const request = new NextRequest('http://localhost:3000/api/v1/tracking/cron', {
          headers: { authorization: 'Bearer any-token' },
        });

        const response = await cronGET(request);
        expect(response.status).toBe(401);
        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.message).toContain('CRON_SECRET is mandatory in production');
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
      }
    });

    it('succeeds and executes claimAndTriggerDueSchedules when valid Bearer token is provided', async () => {
      process.env.CRON_SECRET = 'secret-cron-key-12345';
      vi.mocked(prisma.trackingSchedule.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/v1/tracking/cron', {
        headers: {
          authorization: 'Bearer secret-cron-key-12345',
        },
      });

      const response = await cronGET(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.processedCount).toBe(0);
    });

    it('succeeds when valid x-cron-secret header is provided', async () => {
      process.env.CRON_SECRET = 'custom-cron-token-999';
      vi.mocked(prisma.trackingSchedule.findMany).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/v1/tracking/cron', {
        headers: {
          'x-cron-secret': 'custom-cron-token-999',
        },
      });

      const response = await cronPOST(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });
  });
});
