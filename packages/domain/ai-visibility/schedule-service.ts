// Visnora — Tracking Schedule Domain Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/PRD.md

import { prisma } from '../../database/src/client';
import { SaveTrackingScheduleInput } from '../../shared/validation/index';

export function computeNextRunAt(frequency: string, fromDate = new Date()): Date {
  const next = new Date(fromDate);
  if (frequency === 'HOURLY') {
    next.setHours(next.getHours() + 1);
  } else if (frequency === 'WEEKLY') {
    next.setDate(next.getDate() + 7);
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
  data: SaveTrackingScheduleInput
) {
  const existing = await prisma.trackingSchedule.findFirst({
    where: { organizationId, projectId },
  });

  const nextRunAt = data.isEnabled ? computeNextRunAt(data.frequency) : null;

  if (existing) {
    return await prisma.trackingSchedule.update({
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
  }

  return await prisma.trackingSchedule.create({
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

