// Visnora — Tracking Schedule Domain Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/PRD.md
// Hardened against Audit Findings 4 & 5 (Schedule Processor & Tenant Authorization)

import { prisma } from '../../database/src/client';
import { SaveTrackingScheduleInput } from '../../shared/validation/index';
import { recordAuditEvent } from '../security/audit-logger';
import { enqueueTrackingJob } from '../../jobs/queues/tracking-queue';

export function computeNextRunAt(frequency: string, fromDate = new Date()): Date {
  const next = new Date(fromDate);
  if (frequency === 'HOURLY') {
    next.setHours(next.getHours() + 1);
  } else if (frequency === 'WEEKLY') {
    next.setDate(next.getDate() + 7);
  } else if (frequency === 'MONTHLY') {
    next.setMonth(next.getMonth() + 1);
  } else {
    // Default DAILY
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export async function getTrackingSchedule(organizationId: string, projectId: string) {
  let schedule = await prisma.trackingSchedule.findFirst({
    where: { organizationId, projectId },
  });

  if (!schedule) {
    // Provide default initial schedule
    const nextRun = computeNextRunAt('DAILY');
    schedule = await prisma.trackingSchedule.create({
      data: {
        organizationId,
        projectId,
        frequency: 'DAILY',
        provider: 'google-gemini',
        model: 'gemini-3.8-flash',
        isEnabled: false,
        nextRunAt: nextRun,
      },
    });
  }

  return schedule;
}

export async function saveTrackingSchedule(
  organizationId: string,
  projectId: string,
  data: SaveTrackingScheduleInput,
  actorUserId?: string
) {
  const existing = await prisma.trackingSchedule.findFirst({
    where: { organizationId, projectId },
  });

  const nextRunAt = data.isEnabled ? computeNextRunAt(data.frequency) : null;

  let schedule;
  if (existing) {
    schedule = await prisma.trackingSchedule.update({
      where: { id: existing.id },
      data: {
        frequency: data.frequency,
        provider: data.provider,
        model: data.model,
        groupId: data.groupId || null,
        isEnabled: data.isEnabled,
        nextRunAt,
      },
    });
  } else {
    schedule = await prisma.trackingSchedule.create({
      data: {
        organizationId,
        projectId,
        frequency: data.frequency,
        provider: data.provider,
        model: data.model,
        groupId: data.groupId || null,
        isEnabled: data.isEnabled,
        nextRunAt,
      },
    });
  }

  // Audit Logging for schedule modification
  await recordAuditEvent(prisma, {
    organizationId,
    actorUserId: actorUserId || null,
    action: existing ? 'SCHEDULE_UPDATED' : 'SCHEDULE_CREATED',
    targetEntity: 'TRACKING_SCHEDULE',
    targetId: schedule.id,
    metadata: {
      projectId,
      frequency: data.frequency,
      isEnabled: data.isEnabled,
      nextRunAt: nextRunAt ? nextRunAt.toISOString() : null,
    },
  });

  return schedule;
}

/**
 * Scans and recovers orphaned QUEUED tracking runs created by schedules or cron triggers
 * that may have experienced a server crash before BullMQ enqueueing could complete.
 */
export async function recoverOrphanedScheduleRuns(maxAgeMinutes = 2): Promise<number> {
  const threshold = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  try {
    const orphanedRuns = await prisma.trackingRun.findMany({
      where: {
        status: 'QUEUED',
        createdAt: { lte: threshold },
      },
      take: 20,
    });

    let recoveredCount = 0;
    for (const run of orphanedRuns) {
      console.warn(
        `[ScheduleRecovery] Found orphaned QUEUED tracking run ${run.id} created at ${run.createdAt.toISOString()}. Attempting recovery enqueue.`
      );

      // Fetch primary brand and prompts to reconstruct queue payload
      const project = await prisma.project.findFirst({
        where: { id: run.projectId, organizationId: run.organizationId, isArchived: false },
        include: { brands: { where: { isArchived: false } } },
      });

      if (!project || project.brands.length === 0) {
        await prisma.trackingRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            errorMessage: 'Project or brand no longer available during recovery',
            completedAt: new Date(),
          },
        });
        continue;
      }

      const brand = project.brands.find((b) => b.isPrimary) || project.brands[0];
      const prompts = await prisma.trackedPrompt.findMany({
        where: { organizationId: run.organizationId, projectId: run.projectId, isArchived: false, isActive: true },
      });

      if (prompts.length === 0) {
        await prisma.trackingRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            errorMessage: 'No active prompts available during recovery',
            completedAt: new Date(),
          },
        });
        continue;
      }

      const queueResult = await enqueueTrackingJob({
        trackingRunId: run.id,
        organizationId: run.organizationId,
        projectId: run.projectId,
        brandId: brand.id,
        promptIds: prompts.map((p) => p.id),
        provider: run.provider as any,
        model: run.model,
        enableGrounding: false,
        dryRun: false,
      });

      if (queueResult.queued) {
        console.log(`[ScheduleRecovery] Successfully recovered and enqueued orphaned run ${run.id}`);
        recoveredCount++;
      } else {
        console.warn(`[ScheduleRecovery] Re-enqueue failed for run ${run.id}: ${queueResult.reason}`);
      }
    }

    return recoveredCount;
  } catch (err: any) {
    console.error('[ScheduleRecovery] Error during orphaned run recovery:', err.message);
    return 0;
  }
}

/**
 * Audit Finding 4, 5 & 17: Durable Automated Schedule Claimer & Enqueuer
 * Queries due schedules, atomically claims each schedule within a transaction to eliminate
 * duplicate concurrent execution, enqueues the tracking job into BullMQ, records audit events,
 * and advances nextRunAt.
 *
 * CRON-TO-QUEUE DURABILITY GUARANTEES:
 * 1. Both schedule claim and TrackingRun creation occur in the same atomic transaction.
 * 2. If enqueue fails or Redis is unavailable, nextRunAt is safely reverted for a 5-minute retry.
 * 3. Orphaned queued runs are automatically recovered across cron cycles.
 */
export async function claimAndTriggerDueSchedules(options?: {
  now?: Date;
  limit?: number;
}): Promise<{
  processedCount: number;
  enqueuedJobs: Array<{ scheduleId: string; trackingRunId: string; jobId?: string }>;
  skippedCount: number;
  errors: Array<{ scheduleId: string; error: string }>;
}> {
  const now = options?.now || new Date();
  const limit = options?.limit || 50;

  // Run transactional outbox recovery for any runs that stalled prior to this invocation
  await recoverOrphanedScheduleRuns().catch((err) => {
    console.warn('[ScheduleProcessor] Orphaned run recovery warning:', err.message);
  });

  // 1. Find enabled schedules where nextRunAt is due
  const dueSchedules = await prisma.trackingSchedule.findMany({
    where: {
      isEnabled: true,
      nextRunAt: { lte: now },
    },
    take: limit,
  });

  const enqueuedJobs: Array<{ scheduleId: string; trackingRunId: string; jobId?: string }> = [];
  const errors: Array<{ scheduleId: string; error: string }> = [];
  let skippedCount = 0;

  for (const schedule of dueSchedules) {
    let createdRunId: string | null = null;
    try {
      // 2. Tenant & Project Pre-validation (skip invalid schedules before claiming)
      const project = await prisma.project.findFirst({
        where: {
          id: schedule.projectId,
          organizationId: schedule.organizationId,
          isArchived: false,
        },
        include: {
          brands: { where: { isArchived: false } },
        },
      });

      if (!project || project.brands.length === 0) {
        console.warn(
          `[ScheduleProcessor] Disabling schedule ${schedule.id}: Project ${schedule.projectId} not found, archived, or has no brands.`
        );
        await prisma.trackingSchedule.update({
          where: { id: schedule.id },
          data: { isEnabled: false },
        });
        skippedCount++;
        continue;
      }

      // 3. Load Active Prompts
      const prompts = await prisma.trackedPrompt.findMany({
        where: {
          organizationId: schedule.organizationId,
          projectId: schedule.projectId,
          isArchived: false,
          isActive: true,
          ...(schedule.groupId ? { groupId: schedule.groupId } : {}),
        },
        orderBy: { createdAt: 'asc' },
      });

      if (prompts.length === 0) {
        console.warn(
          `[ScheduleProcessor] Skipping schedule ${schedule.id}: No active prompts found for project ${schedule.projectId}.`
        );
        skippedCount++;
        continue;
      }

      const targetBrand = project.brands.find((b) => b.isPrimary) || project.brands[0];

      // 4. Atomic Schedule Claim & Outbox TrackingRun Creation
      // Both the schedule claim and the initial QUEUED tracking run are created inside the transaction.
      // If another concurrent cron execution already claimed the schedule, claimResult returns null.
      const claimResult = await prisma.$transaction(async (tx) => {
        const fresh = await tx.trackingSchedule.findFirst({
          where: {
            id: schedule.id,
            isEnabled: true,
            nextRunAt: { lte: now },
          },
        });

        if (!fresh) {
          return null; // Already claimed by concurrent invocation
        }

        const nextRunAt = computeNextRunAt(fresh.frequency, now);

        await tx.trackingSchedule.update({
          where: { id: fresh.id },
          data: {
            lastRunAt: now,
            nextRunAt,
          },
        });

        const run = await tx.trackingRun.create({
          data: {
            organizationId: schedule.organizationId,
            projectId: schedule.projectId,
            status: 'QUEUED',
            provider: schedule.provider,
            model: schedule.model,
            promptCount: prompts.length,
            startedAt: now,
          },
        });

        return { schedule: fresh, nextRunAt, trackingRun: run };
      });

      if (!claimResult) {
        skippedCount++;
        continue;
      }

      const trackingRun = claimResult.trackingRun;
      createdRunId = trackingRun.id;

      // 5. Enqueue to BullMQ Queue (Idempotent Job ID)
      const queueResult = await enqueueTrackingJob(
        {
          trackingRunId: trackingRun.id,
          organizationId: schedule.organizationId,
          projectId: schedule.projectId,
          brandId: targetBrand.id,
          promptIds: prompts.map((p) => p.id),
          provider: schedule.provider as any,
          model: schedule.model,
          enableGrounding: false,
          dryRun: false,
        },
        {
          jobId: `schedule-${schedule.id}-${now.getTime()}`,
        }
      );

      // CRITICAL DURABILITY GUARANTEE:
      // If enqueueing to Redis fails (e.g. Redis unavailable or network timeout),
      // DO NOT advance nextRunAt to the far future! Revert nextRunAt with a short retry backoff (5m).
      if (!queueResult.queued) {
        console.warn(
          `[ScheduleProcessor] Enqueue failed for schedule ${schedule.id} (run ${trackingRun.id}): ${queueResult.reason}. Reverting nextRunAt for retry.`
        );

        const retryAt = new Date(Date.now() + 5 * 60 * 1000);
        await prisma.trackingSchedule.update({
          where: { id: schedule.id },
          data: { nextRunAt: retryAt },
        });

        await prisma.trackingRun.update({
          where: { id: trackingRun.id },
          data: {
            status: 'FAILED',
            errorMessage: `QUEUE_UNAVAILABLE: ${queueResult.reason || 'Failed to enqueue into background queue'}`,
            completedAt: new Date(),
          },
        });

        errors.push({
          scheduleId: schedule.id,
          error: `QUEUE_UNAVAILABLE: ${queueResult.reason || 'Enqueue failed'}`,
        });
        continue;
      }

      // 6. Audit Logging upon successful enqueue
      await recordAuditEvent(prisma, {
        organizationId: schedule.organizationId,
        actorUserId: null,
        action: 'SCHEDULE_TRIGGERED',
        targetEntity: 'TRACKING_SCHEDULE',
        targetId: schedule.id,
        metadata: {
          trackingRunId: trackingRun.id,
          frequency: schedule.frequency,
          jobId: queueResult.jobId || null,
          queued: true,
          nextRunAt: claimResult.nextRunAt.toISOString(),
        },
      });

      enqueuedJobs.push({
        scheduleId: schedule.id,
        trackingRunId: trackingRun.id,
        jobId: queueResult.jobId,
      });
    } catch (err: any) {
      console.error(`[ScheduleProcessor] Error processing schedule ${schedule.id}:`, err.message);

      // Safe failure handling: reset schedule nextRunAt for 5-minute retry so it is never permanently lost
      try {
        const retryAt = new Date(Date.now() + 5 * 60 * 1000);
        await prisma.trackingSchedule.update({
          where: { id: schedule.id },
          data: { nextRunAt: retryAt },
        });

        if (createdRunId) {
          await prisma.trackingRun.update({
            where: { id: createdRunId },
            data: {
              status: 'FAILED',
              errorMessage: err.message,
              completedAt: new Date(),
            },
          });
        }
      } catch (recoveryErr: any) {
        console.error(`[ScheduleProcessor] Recovery update error on schedule ${schedule.id}:`, recoveryErr.message);
      }

      errors.push({ scheduleId: schedule.id, error: err.message });
    }
  }

  return {
    processedCount: enqueuedJobs.length,
    enqueuedJobs,
    skippedCount,
    errors,
  };
}

/**
 * Backward compatibility wrapper for processDueSchedules.
 */
export async function processDueSchedules(): Promise<{
  processedCount: number;
  triggeredScheduleIds: string[];
}> {
  const result = await claimAndTriggerDueSchedules();
  return {
    processedCount: result.processedCount,
    triggeredScheduleIds: result.enqueuedJobs.map((j) => j.scheduleId),
  };
}
