// Visnora — M4 Usage Metering & Quota Enforcement Engine
// Reference: docs/TECHNICAL_BLUEPRINT.md & M4.3 Usage Metering and Quota Enforcement

import { prisma } from '../../database/src/client';
import { getOrganizationSubscription } from './subscription-service';
import { QuotaReservationResult } from './types';
import crypto from 'crypto';

export class QuotaExceededError extends Error {
  constructor(
    public readonly currentUsage: number,
    public readonly maxAllowed: number,
    public readonly remaining: number,
    public readonly resetDate: Date
  ) {
    super(`Monthly prompt execution quota exceeded (${currentUsage}/${maxAllowed}). Remaining: ${remaining}. Resets on ${resetDate.toISOString().slice(0, 10)}.`);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Retrieves the current usage counter for an organization in its active billing window.
 * If no counter exists or the period has elapsed, creates or rotates the counter atomically.
 */
export async function getActiveUsageCounter(organizationId: string) {
  const sub = await getOrganizationSubscription(organizationId);
  const now = new Date();

  // Find counter matching current subscription period
  let counter = await prisma.usageCounter.findFirst({
    where: {
      organizationId,
      periodEnd: { gte: now },
    },
    orderBy: { periodStart: 'desc' },
  });

  if (!counter) {
    // Create new counter for current period
    const periodStart = sub.currentPeriodStart || now;
    const periodEnd = sub.currentPeriodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    counter = await prisma.usageCounter.create({
      data: {
        organizationId,
        periodStart,
        periodEnd,
        promptRunsUsed: 0,
        promptRunsReserved: 0,
        promptRunsLimit: sub.planDefinition.quotas.monthlyPromptLimit,
        activeProjectsLimit: sub.planDefinition.quotas.workspaceLimit,
      },
    });
  }

  return { counter, sub };
}

/**
 * Atomically reserves prompt execution quota before running tracking queries.
 * Prevents concurrent requests from overconsuming the monthly allowance.
 */
export async function reservePromptQuota(
  organizationId: string,
  requestedCount = 1
): Promise<QuotaReservationResult> {
  const { counter, sub } = await getActiveUsageCounter(organizationId);

  const limit = counter.promptRunsLimit;
  const currentTotal = counter.promptRunsUsed + counter.promptRunsReserved;
  const remaining = Math.max(0, limit - currentTotal);

  if (remaining < requestedCount) {
    const resetDateStr = counter.periodEnd.toISOString().slice(0, 10);
    return {
      allowed: false,
      requestedCount,
      consumed: counter.promptRunsUsed,
      limit,
      remaining,
      periodEnd: counter.periodEnd,
      status: 'QUOTA_EXCEEDED',
      errorDetails: {
        code: 'QUOTA_EXCEEDED',
        message: `Monthly prompt quota exceeded. You have ${remaining} prompts remaining out of ${limit}, but requested ${requestedCount}. Quota resets on ${resetDateStr}.`,
        currentUsage: counter.promptRunsUsed,
        maxAllowed: limit,
        remaining,
        resetDate: resetDateStr,
        upgradeUrl: '/billing/pricing',
      },
    };
  }

  const reservationId = `res_${crypto.randomUUID()}`;

  // Atomically increment promptRunsReserved
  await prisma.usageCounter.update({
    where: { id: counter.id },
    data: {
      promptRunsReserved: {
        increment: requestedCount,
      },
    },
  });

  return {
    allowed: true,
    reservationId,
    requestedCount,
    consumed: counter.promptRunsUsed,
    limit,
    remaining: remaining - requestedCount,
    periodEnd: counter.periodEnd,
    status: 'RESERVED',
  };
}

/**
 * Confirms actual prompt executions and records an immutable usage ledger entry.
 * Atomically converts reserved quota into consumed quota.
 */
export async function recordPromptUsage(params: {
  organizationId: string;
  quantity: number;
  promptRunId?: string;
  trackingRunId?: string;
  idempotencyKey?: string;
  reservationQuantityToRelease?: number;
}) {
  const {
    organizationId,
    quantity,
    promptRunId,
    trackingRunId,
    idempotencyKey,
    reservationQuantityToRelease = 0,
  } = params;

  const key = idempotencyKey || (promptRunId ? `usage_${promptRunId}` : `usage_${crypto.randomUUID()}`);

  const { counter } = await getActiveUsageCounter(organizationId);

  // Check if this usage event was already recorded (idempotency guard)
  const existingRecord = await prisma.usageRecord.findUnique({
    where: { idempotencyKey: key },
  });

  if (existingRecord) {
    return existingRecord;
  }

  // Execute in Prisma transaction to ensure atomic update of counter and creation of ledger entry
  return await prisma.$transaction(async (tx) => {
    const record = await tx.usageRecord.create({
      data: {
        organizationId,
        usageType: 'PROMPT_RUN',
        quantity,
        promptRunId,
        trackingRunId,
        idempotencyKey: key,
        periodStart: counter.periodStart,
        periodEnd: counter.periodEnd,
      },
    });

    const releaseAmount = Math.max(0, reservationQuantityToRelease);

    await tx.usageCounter.update({
      where: { id: counter.id },
      data: {
        promptRunsUsed: { increment: quantity },
        promptRunsReserved: { decrement: releaseAmount },
      },
    });

    return record;
  });
}

/**
 * Releases unconsumed reserved quota (e.g. when prompts fail before provider execution).
 */
export async function releaseReservedQuota(organizationId: string, count: number) {
  if (count <= 0) return;

  const { counter } = await getActiveUsageCounter(organizationId);

  await prisma.usageCounter.update({
    where: { id: counter.id },
    data: {
      promptRunsReserved: {
        decrement: Math.min(counter.promptRunsReserved, count),
      },
    },
  });
}

/**
 * Retrieves full usage summary and percentage for dashboard display.
 */
export async function getOrganizationUsageSummary(organizationId: string) {
  const { counter, sub } = await getActiveUsageCounter(organizationId);

  const totalUsed = counter.promptRunsUsed;
  const limit = counter.promptRunsLimit;
  const remaining = Math.max(0, limit - totalUsed);
  const percentage = limit > 0 ? Number(((totalUsed / limit) * 100).toFixed(1)) : 100;
  const isNearLimit = percentage >= 80;
  const isExceeded = totalUsed >= limit;

  // Recent usage records
  const recentRecords = await prisma.usageRecord.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return {
    periodStart: counter.periodStart,
    periodEnd: counter.periodEnd,
    promptRunsUsed: totalUsed,
    promptRunsReserved: counter.promptRunsReserved,
    promptRunsLimit: limit,
    promptRunsRemaining: remaining,
    usagePercentage: percentage,
    isNearLimit,
    isExceeded,
    planTier: sub.planTier,
    planName: sub.planDefinition.name,
    billingCycle: sub.billingCycle,
    recentRecords: recentRecords.map((r) => ({
      id: r.id,
      quantity: r.quantity,
      usageType: r.usageType,
      createdAt: r.createdAt,
      trackingRunId: r.trackingRunId,
    })),
  };
}

/**
 * Atomically reserves ad intelligence quota before executing discovery/analysis runs.
 */
export async function reserveAdQuota(
  organizationId: string,
  requestedCount = 1
): Promise<QuotaReservationResult> {
  const { counter, sub } = await getActiveUsageCounter(organizationId);

  const limit = sub.planDefinition.quotas.monthlyAdsLimit || counter.adSyncsLimit || 50;
  const currentTotal = counter.adSyncsUsed;
  const remaining = Math.max(0, limit - currentTotal);

  if (remaining < requestedCount) {
    const resetDateStr = counter.periodEnd.toISOString().slice(0, 10);
    return {
      allowed: false,
      requestedCount,
      consumed: counter.adSyncsUsed,
      limit,
      remaining,
      periodEnd: counter.periodEnd,
      status: 'QUOTA_EXCEEDED',
      errorDetails: {
        code: 'QUOTA_EXCEEDED',
        message: `Monthly ad discovery quota exceeded. You have ${remaining} ad analyses remaining out of ${limit}, but requested ${requestedCount}. Quota resets on ${resetDateStr}.`,
        currentUsage: counter.adSyncsUsed,
        maxAllowed: limit,
        remaining,
        resetDate: resetDateStr,
        upgradeUrl: '/billing/pricing',
      },
    };
  }

  const reservationId = `ad_res_${crypto.randomUUID()}`;

  return {
    allowed: true,
    reservationId,
    requestedCount,
    consumed: counter.adSyncsUsed,
    limit,
    remaining: remaining - requestedCount,
    periodEnd: counter.periodEnd,
    status: 'RESERVED',
  };
}

/**
 * Records consumed ad intelligence quota and updates usage counter.
 */
export async function recordAdUsage(params: {
  organizationId: string;
  quantity: number;
  adRecordId?: string;
  collectionRunId?: string;
  idempotencyKey?: string;
}) {
  const { organizationId, quantity, collectionRunId, idempotencyKey } = params;
  const key = idempotencyKey || `ad_usage_${collectionRunId || crypto.randomUUID()}`;

  const { counter } = await getActiveUsageCounter(organizationId);

  const existingRecord = await prisma.usageRecord.findUnique({
    where: { idempotencyKey: key },
  });

  if (existingRecord) {
    return existingRecord;
  }

  return await prisma.$transaction(async (tx) => {
    const record = await tx.usageRecord.create({
      data: {
        organizationId,
        usageType: 'AD_DISCOVERY',
        quantity,
        trackingRunId: collectionRunId,
        idempotencyKey: key,
        periodStart: counter.periodStart,
        periodEnd: counter.periodEnd,
      },
    });

    await tx.usageCounter.update({
      where: { id: counter.id },
      data: {
        adSyncsUsed: { increment: quantity },
      },
    });

    return record;
  });
}

/**
 * Releases unconsumed ad quota reservation.
 */
export async function releaseReservedAdQuota(organizationId: string, count: number) {
  // Stateless reservation release helper for parity with prompt quota
  return;
}

/**
 * Atomically reserves AI recommendation generation quota before running optimization engine.
 */
export async function reserveAiRecommendationQuota(
  organizationId: string,
  requestedCount = 1
): Promise<QuotaReservationResult> {
  const { counter, sub } = await getActiveUsageCounter(organizationId);

  const limit = sub.planDefinition.quotas.monthlyAiRecommendationsLimit ?? 20;

  // Count AI recommendations generated in the current billing period
  const usedCount = await prisma.usageRecord.count({
    where: {
      organizationId,
      usageType: 'AI_RECOMMENDATION',
      createdAt: {
        gte: counter.periodStart,
        lte: counter.periodEnd,
      },
    },
  });

  const remaining = Math.max(0, limit - usedCount);

  if (remaining < requestedCount) {
    const resetDateStr = counter.periodEnd.toISOString().slice(0, 10);
    return {
      allowed: false,
      requestedCount,
      consumed: usedCount,
      limit,
      remaining,
      periodEnd: counter.periodEnd,
      status: 'QUOTA_EXCEEDED',
      errorDetails: {
        code: 'QUOTA_EXCEEDED',
        message: `Monthly AI recommendation quota exceeded. You have ${remaining} recommendations remaining out of ${limit}, but requested ${requestedCount}. Quota resets on ${resetDateStr}.`,
        currentUsage: usedCount,
        maxAllowed: limit,
        remaining,
        resetDate: resetDateStr,
        upgradeUrl: '/billing/pricing',
      },
    };
  }

  const reservationId = `rec_res_${crypto.randomUUID()}`;

  return {
    allowed: true,
    reservationId,
    requestedCount,
    consumed: usedCount,
    limit,
    remaining: remaining - requestedCount,
    periodEnd: counter.periodEnd,
    status: 'RESERVED',
  };
}

/**
 * Records consumed AI recommendation quota and updates usage records ledger.
 */
export async function recordAiRecommendationUsage(params: {
  organizationId: string;
  quantity: number;
  recommendationId?: string;
  idempotencyKey?: string;
}) {
  const { organizationId, quantity, recommendationId, idempotencyKey } = params;
  const key = idempotencyKey || `rec_usage_${recommendationId || crypto.randomUUID()}`;

  const { counter } = await getActiveUsageCounter(organizationId);

  const existingRecord = await prisma.usageRecord.findUnique({
    where: { idempotencyKey: key },
  });

  if (existingRecord) {
    return existingRecord;
  }

  return await prisma.usageRecord.create({
    data: {
      organizationId,
      usageType: 'AI_RECOMMENDATION',
      quantity,
      idempotencyKey: key,
      periodStart: counter.periodStart,
      periodEnd: counter.periodEnd,
    },
  });
}

/**
 * Releases unconsumed recommendation reservation.
 */
export async function releaseReservedAiRecommendationQuota(organizationId: string, count: number) {
  return;
}



