import { prisma } from '../../database/src/client';
import { getPlanBySlug } from './plan-service';
import { SubStatus } from '@prisma/client';

export interface AdminBillingOverview {
  mrrPaise: number;
  mrrFormatted: string;
  arrPaise: number;
  arrFormatted: string;
  totalSubscribers: number;
  activeSubscribers: number;
  trialSubscribers: number;
  canceledSubscribers: number;
  planDistribution: Array<{
    planSlug: string;
    planName: string;
    count: number;
    percentage: number;
  }>;
  paymentMetrics: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    successRatePercent: number;
    totalCollectedPaise: number;
    totalCollectedFormatted: string;
  };
  usageMetrics: {
    totalPromptRunsUsed: number;
    totalPromptRunsLimit: number;
    overallUtilizationPercent: number;
  };
}

export interface AdminGrantPlanParams {
  organizationId: string;
  planSlug: string;
  billingCycle?: 'MONTHLY' | 'ANNUAL';
  reason: string;
  actorUserId?: string;
  durationMonths?: number;
  ipAddress?: string;
}

export interface AdminAdjustUsageParams {
  organizationId: string;
  additionalPromptRuns: number;
  reason: string;
  actorUserId?: string;
  ipAddress?: string;
}

/**
 * Computes administrative billing analytics across all organizations.
 */
export async function getAdminBillingOverview(): Promise<AdminBillingOverview> {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      plan: true,
    },
  });

  let mrrPaise = 0;
  let activeSubscribers = 0;
  let trialSubscribers = 0;
  let canceledSubscribers = 0;

  const planCountMap: Record<string, { name: string; count: number }> = {
    free: { name: 'Free', count: 0 },
    starter: { name: 'Starter', count: 0 },
    pro: { name: 'Pro', count: 0 },
    agency: { name: 'Agency', count: 0 },
  };

  for (const sub of subscriptions) {
    const slug = sub.plan?.slug?.toLowerCase() || sub.planTier?.toLowerCase() || 'free';
    if (!planCountMap[slug]) {
      planCountMap[slug] = { name: sub.plan?.name || slug.toUpperCase(), count: 0 };
    }
    planCountMap[slug].count++;

    if (sub.status === SubStatus.ACTIVE) {
      activeSubscribers++;
      if (sub.plan) {
        if (sub.billingCycle === 'ANNUAL') {
          mrrPaise += Math.round(sub.plan.annualPricePaise / 12);
        } else {
          mrrPaise += sub.plan.monthlyPricePaise;
        }
      }
    } else if (sub.status === SubStatus.TRIAL) {
      trialSubscribers++;
    } else if (sub.status === SubStatus.CANCELLED || sub.status === SubStatus.EXPIRED) {
      canceledSubscribers++;
    }
  }

  const totalSubscribers = subscriptions.length;
  const planDistribution = Object.entries(planCountMap).map(([slug, data]) => ({
    planSlug: slug,
    planName: data.name,
    count: data.count,
    percentage: totalSubscribers > 0 ? Math.round((data.count / totalSubscribers) * 100) : 0,
  }));

  const payments = await prisma.payment.findMany();
  const totalTransactions = payments.length;
  const successfulTransactions = payments.filter((p) => p.status === 'SUCCESS').length;
  const failedTransactions = payments.filter((p) => p.status === 'FAILED').length;
  const successRatePercent = totalTransactions > 0
    ? Math.round((successfulTransactions / totalTransactions) * 100)
    : 100;
  const totalCollectedPaise = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + Number(p.amountPaise), 0);

  const usageCounters = await prisma.usageCounter.findMany();
  const totalPromptRunsUsed = usageCounters.reduce((sum, u) => sum + u.promptRunsUsed, 0);
  const totalPromptRunsLimit = usageCounters.reduce((sum, u) => sum + u.promptRunsLimit, 0);
  const overallUtilizationPercent = totalPromptRunsLimit > 0
    ? Math.round((totalPromptRunsUsed / totalPromptRunsLimit) * 100)
    : 0;

  const arrPaise = mrrPaise * 12;

  return {
    mrrPaise,
    mrrFormatted: `₹${(mrrPaise / 100).toLocaleString('en-IN')}`,
    arrPaise,
    arrFormatted: `₹${(arrPaise / 100).toLocaleString('en-IN')}`,
    totalSubscribers,
    activeSubscribers,
    trialSubscribers,
    canceledSubscribers,
    planDistribution,
    paymentMetrics: {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      successRatePercent,
      totalCollectedPaise,
      totalCollectedFormatted: `₹${(totalCollectedPaise / 100).toLocaleString('en-IN')}`,
    },
    usageMetrics: {
      totalPromptRunsUsed,
      totalPromptRunsLimit,
      overallUtilizationPercent,
    },
  };
}

/**
 * Admin action to grant or override an organization's subscription plan.
 */
export async function adminGrantPlan(params: AdminGrantPlanParams) {
  const plan = await getPlanBySlug(params.planSlug);
  if (!plan) {
    throw new Error(`Plan with slug '${params.planSlug}' not found.`);
  }

  const duration = params.durationMonths || 1;
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + duration);

  let dbPlan = await prisma.subscriptionPlan.findUnique({
    where: { slug: plan.slug },
  });

  if (!dbPlan) {
    dbPlan = await prisma.subscriptionPlan.create({
      data: {
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        monthlyPricePaise: plan.monthlyPricePaise,
        annualPricePaise: plan.annualPricePaise,
        currency: plan.currency,
        promptRunsLimit: plan.quotas.monthlyPromptLimit,
        brandLimit: plan.quotas.brandLimit,
        workspaceLimit: plan.quotas.workspaceLimit,
        competitorLimit: plan.quotas.competitorLimit,
        features: plan.features,
        trialDays: plan.trialDays,
      },
    });
  }

  const subscription = await prisma.subscription.upsert({
    where: { organizationId: params.organizationId },
    create: {
      organizationId: params.organizationId,
      planId: dbPlan.id,
      planTier: plan.slug.toUpperCase(),
      billingCycle: params.billingCycle || 'MONTHLY',
      status: SubStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
    update: {
      planId: dbPlan.id,
      planTier: plan.slug.toUpperCase(),
      billingCycle: params.billingCycle || 'MONTHLY',
      status: SubStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      effectiveCancellationDate: null,
    },
  });

  // Update or create current usage counter to match plan quota
  const existingCounter = await prisma.usageCounter.findFirst({
    where: { organizationId: params.organizationId },
    orderBy: { periodEnd: 'desc' },
  });

  if (existingCounter) {
    await prisma.usageCounter.update({
      where: { id: existingCounter.id },
      data: {
        periodStart: now,
        periodEnd: periodEnd,
        promptRunsLimit: plan.quotas.monthlyPromptLimit,
      },
    });
  } else {
    await prisma.usageCounter.create({
      data: {
        organizationId: params.organizationId,
        periodStart: now,
        periodEnd: periodEnd,
        promptRunsUsed: 0,
        promptRunsLimit: plan.quotas.monthlyPromptLimit,
        promptRunsReserved: 0,
      },
    });
  }

  // Record audit log
  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId || null,
      action: 'ADMIN_GRANT_PLAN',
      targetEntity: 'subscription',
      targetId: subscription.id,
      metadata: {
        planSlug: plan.slug,
        billingCycle: params.billingCycle || 'MONTHLY',
        durationMonths: duration,
        reason: params.reason,
      },
      ipAddress: params.ipAddress || null,
    },
  });

  return subscription;
}

/**
 * Admin action to adjust an organization's usage counter limit.
 */
export async function adminAdjustUsageLimit(params: AdminAdjustUsageParams) {
  const counter = await prisma.usageCounter.findFirst({
    where: { organizationId: params.organizationId },
    orderBy: { periodEnd: 'desc' },
  });

  if (!counter) {
    throw new Error(`Usage counter not found for organization ${params.organizationId}`);
  }

  const updated = await prisma.usageCounter.update({
    where: { id: counter.id },
    data: {
      promptRunsLimit: { increment: params.additionalPromptRuns },
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId || null,
      action: 'ADMIN_ADJUST_USAGE_LIMIT',
      targetEntity: 'usage_counter',
      targetId: counter.id,
      metadata: {
        additionalPromptRuns: params.additionalPromptRuns,
        newLimit: updated.promptRunsLimit,
        reason: params.reason,
      },
      ipAddress: params.ipAddress || null,
    },
  });

  return updated;
}
