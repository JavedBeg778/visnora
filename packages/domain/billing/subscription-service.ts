// Visnora — M4 Subscription Engine & Lifecycle Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & M4.2 Subscription Engine

import { prisma } from '../../database/src/client';
import { getPlanBySlug } from './plan-service';
import { BillingCycle, PlanSlug, SubscriptionStatus } from './types';
import { SubStatus } from '@prisma/client';

export class SubscriptionError extends Error {
  constructor(message: string, public readonly code: string, public readonly statusCode = 400) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

/**
 * Normalizes between Prisma SubStatus enum and domain SubscriptionStatus
 */
export function mapToSubStatus(status: SubscriptionStatus): SubStatus {
  switch (status) {
    case 'TRIALING':
      return SubStatus.TRIAL;
    case 'ACTIVE':
      return SubStatus.ACTIVE;
    case 'PAST_DUE':
      return SubStatus.PAST_DUE;
    case 'CANCELLED':
      return SubStatus.CANCELLED;
    case 'EXPIRED':
      return SubStatus.EXPIRED;
    case 'SUSPENDED':
      return SubStatus.SUSPENDED;
    default:
      return SubStatus.TRIAL;
  }
}

export function mapFromSubStatus(status: SubStatus): SubscriptionStatus {
  switch (status) {
    case SubStatus.TRIAL:
      return 'TRIALING';
    case SubStatus.ACTIVE:
      return 'ACTIVE';
    case SubStatus.PAST_DUE:
      return 'PAST_DUE';
    case SubStatus.CANCELLED:
      return 'CANCELLED';
    case SubStatus.EXPIRED:
      return 'EXPIRED';
    case SubStatus.SUSPENDED:
      return 'SUSPENDED';
    case SubStatus.PAUSED:
      return 'SUSPENDED';
    default:
      return 'TRIALING';
  }
}

/**
 * Retrieves the active subscription for an organization.
 * If none exists, creates a default Free Trial subscription.
 */
export async function getOrganizationSubscription(organizationId: string) {
  let sub = await prisma.subscription.findUnique({
    where: { organizationId },
    include: {
      plan: true,
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!sub) {
    // Auto-provision initial Free Trial subscription for the tenant
    const freePlan = await getPlanBySlug('free');
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + (freePlan.trialDays || 14));

    sub = await prisma.subscription.create({
      data: {
        organizationId,
        planTier: freePlan.slug.toUpperCase(),
        billingCycle: 'MONTHLY',
        status: SubStatus.TRIAL,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: periodEnd,
      },
      include: {
        plan: true,
        payments: true,
      },
    });

    // Initialize usage counter for this period
    await prisma.usageCounter.upsert({
      where: {
        uq_org_period: {
          organizationId,
          periodStart: now,
        },
      },
      update: {},
      create: {
        organizationId,
        periodStart: now,
        periodEnd,
        promptRunsLimit: freePlan.quotas.monthlyPromptLimit,
        activeProjectsLimit: freePlan.quotas.workspaceLimit,
      },
    });
  }

  // Check if subscription has expired past its period end
  const now = new Date();
  if (sub.status === SubStatus.ACTIVE && sub.cancelAtPeriodEnd && now > sub.currentPeriodEnd) {
    sub = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubStatus.EXPIRED,
      },
      include: {
        plan: true,
        payments: true,
      },
    });
  } else if (sub.status === SubStatus.TRIAL && sub.trialEndsAt && now > sub.trialEndsAt) {
    sub = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubStatus.EXPIRED,
      },
      include: {
        plan: true,
        payments: true,
      },
    });
  }

  const planDefinition = await getPlanBySlug(sub.planTier.toLowerCase());

  return {
    ...sub,
    normalizedStatus: mapFromSubStatus(sub.status),
    planDefinition,
  };
}

/**
 * Activates or upgrades a subscription upon verified payment.
 */
export async function activateSubscription(params: {
  organizationId: string;
  planSlug: PlanSlug;
  billingCycle: BillingCycle;
  providerTransactionRef?: string;
  amountPaise?: number;
}) {
  const { organizationId, planSlug, billingCycle, providerTransactionRef, amountPaise } = params;
  const targetPlan = await getPlanBySlug(planSlug);

  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'ANNUAL') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Find existing subscription or create new
  const existingSub = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  let subscription;
  if (existingSub) {
    subscription = await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        planTier: targetPlan.slug.toUpperCase(),
        billingCycle,
        status: SubStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        effectiveCancellationDate: null,
      },
    });
  } else {
    subscription = await prisma.subscription.create({
      data: {
        organizationId,
        planTier: targetPlan.slug.toUpperCase(),
        billingCycle,
        status: SubStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  // Update UsageCounter with new plan limits
  await prisma.usageCounter.upsert({
    where: {
      uq_org_period: {
        organizationId,
        periodStart: now,
      },
    },
    update: {
      periodEnd,
      promptRunsLimit: targetPlan.quotas.monthlyPromptLimit,
      activeProjectsLimit: targetPlan.quotas.workspaceLimit,
    },
    create: {
      organizationId,
      periodStart: now,
      periodEnd,
      promptRunsLimit: targetPlan.quotas.monthlyPromptLimit,
      activeProjectsLimit: targetPlan.quotas.workspaceLimit,
    },
  });

  return {
    subscription,
    plan: targetPlan,
  };
}

/**
 * Upgrades or downgrades an active subscription to a target plan.
 */
export async function changeSubscriptionPlan(params: {
  organizationId: string;
  targetPlanSlug: PlanSlug;
  billingCycle?: BillingCycle;
}) {
  const { organizationId, targetPlanSlug, billingCycle } = params;
  const sub = await getOrganizationSubscription(organizationId);

  if (sub.status === SubStatus.SUSPENDED) {
    throw new SubscriptionError('Suspended subscription cannot change plans without administrative review', 'SUBSCRIPTION_SUSPENDED', 400);
  }

  const targetPlan = await getPlanBySlug(targetPlanSlug);
  const cycle = billingCycle || (sub.billingCycle as BillingCycle) || 'MONTHLY';

  const updatedSub = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      planTier: targetPlan.slug.toUpperCase(),
      billingCycle: cycle,
      status: SubStatus.ACTIVE,
      cancelAtPeriodEnd: false,
    },
    include: { plan: true },
  });

  // Update current counter limits
  const latestCounter = await prisma.usageCounter.findFirst({
    where: { organizationId },
    orderBy: { periodStart: 'desc' },
  });

  if (latestCounter) {
    await prisma.usageCounter.update({
      where: { id: latestCounter.id },
      data: {
        promptRunsLimit: targetPlan.quotas.monthlyPromptLimit,
        activeProjectsLimit: targetPlan.quotas.workspaceLimit,
      },
    });
  }

  return {
    subscription: updatedSub,
    plan: targetPlan,
  };
}

/**
 * Cancels a subscription immediately or at the end of the billing period.
 */
export async function cancelSubscription(organizationId: string, immediate = false) {
  const sub = await getOrganizationSubscription(organizationId);

  if (sub.status === SubStatus.CANCELLED || sub.status === SubStatus.EXPIRED) {
    throw new SubscriptionError('Subscription is already cancelled or expired', 'ALREADY_CANCELLED', 400);
  }

  const now = new Date();

  if (immediate) {
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubStatus.CANCELLED,
        cancelAtPeriodEnd: false,
        canceledAt: now,
        effectiveCancellationDate: now,
      },
    });
    return updated;
  }

  // End-of-period scheduled cancellation
  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      cancelAtPeriodEnd: true,
      canceledAt: now,
      effectiveCancellationDate: sub.currentPeriodEnd,
    },
  });

  return updated;
}

/**
 * Reactivates a subscription that was scheduled for cancellation.
 */
export async function reactivateSubscription(organizationId: string) {
  const sub = await getOrganizationSubscription(organizationId);

  if (!sub.cancelAtPeriodEnd && sub.status === SubStatus.ACTIVE) {
    throw new SubscriptionError('Subscription is already active', 'ALREADY_ACTIVE', 400);
  }

  if (sub.status === SubStatus.EXPIRED) {
    throw new SubscriptionError('Expired subscription must be renewed via checkout', 'SUBSCRIPTION_EXPIRED', 400);
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: SubStatus.ACTIVE,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      effectiveCancellationDate: null,
    },
  });

  return updated;
}

