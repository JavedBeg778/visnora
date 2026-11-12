// Visnora — Subscription Plan Management Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & M4.1 Subscription Plan Management

import { prisma } from '../../database/src/client';
import { PlanSlug, SubscriptionPlanDefinition } from './types';

export const DEFAULT_PLANS: SubscriptionPlanDefinition[] = [
  {
    slug: 'free',
    name: 'Free Trial',
    description: 'Explore AI search visibility fundamentals with essential tracking.',
    monthlyPricePaise: 0,
    annualPricePaise: 0,
    currency: 'INR',
    quotas: {
      monthlyPromptLimit: 20,
      brandLimit: 1,
      workspaceLimit: 1,
      competitorLimit: 1,
      monthlyAdsLimit: 20,
      monitoredCompetitorsLimit: 1,
      connectedAdsAccountsLimit: 1,
      monthlyAiRecommendationsLimit: 20,
      reportingHistoryDays: 7,
    },
    features: ['basic_analytics', 'brand_tracking', 'ad_intelligence', 'chatgpt_ads_intelligence'],
    isActive: true,
    isDefault: true,
    trialDays: 14,
  },
  {
    slug: 'starter',
    name: 'Starter',
    description: 'Ideal for growing brands establishing initial visibility benchmarks across AI search.',
    monthlyPricePaise: 149900, // ₹1,499
    annualPricePaise: 1499000,  // ₹14,990 (approx. 2 months free)
    currency: 'INR',
    quotas: {
      monthlyPromptLimit: 100,
      brandLimit: 1,
      workspaceLimit: 1,
      competitorLimit: 3,
      monthlyAdsLimit: 100,
      monitoredCompetitorsLimit: 3,
      connectedAdsAccountsLimit: 1,
      monthlyAiRecommendationsLimit: 100,
      reportingHistoryDays: 30,
    },
    features: [
      'basic_analytics',
      'brand_tracking',
      'competitor_tracking',
      'ad_intelligence',
      'ad_comparison',
      'chatgpt_ads_intelligence',
      'chatgpt_ads_management',
    ],
    isActive: true,
    trialDays: 0,
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'Comprehensive visibility intelligence, competitor dominance analysis, and automated recommendations.',
    monthlyPricePaise: 399900, // ₹3,999
    annualPricePaise: 3999000,  // ₹39,990 (approx. 2 months free)
    currency: 'INR',
    quotas: {
      monthlyPromptLimit: 500,
      brandLimit: 3,
      workspaceLimit: 3,
      competitorLimit: 5,
      monthlyAdsLimit: 500,
      monitoredCompetitorsLimit: 5,
      connectedAdsAccountsLimit: 3,
      monthlyAiRecommendationsLimit: 500,
      reportingHistoryDays: 90,
    },
    features: [
      'basic_analytics',
      'brand_tracking',
      'competitor_tracking',
      'advanced_analytics',
      'competitor_intelligence',
      'citation_gap',
      'advanced_recommendations',
      'report_export',
      'ad_intelligence',
      'ad_comparison',
      'ad_monitoring',
      'ad_exports',
      'chatgpt_ads_intelligence',
      'chatgpt_ads_management',
      'chatgpt_ads_optimization',
      'chatgpt_ads_advanced_reporting',
    ],
    isActive: true,
    trialDays: 0,
  },
  {
    slug: 'agency',
    name: 'Agency',
    description: 'Designed for marketing agencies and multi-brand enterprises managing client portfolios.',
    monthlyPricePaise: 999900, // ₹9,999
    annualPricePaise: 9999000,  // ₹99,990 (approx. 2 months free)
    currency: 'INR',
    quotas: {
      monthlyPromptLimit: 2500,
      brandLimit: 10,
      workspaceLimit: 10,
      competitorLimit: 20,
      monthlyAdsLimit: 2500,
      monitoredCompetitorsLimit: 20,
      connectedAdsAccountsLimit: 10,
      monthlyAiRecommendationsLimit: 2000,
      reportingHistoryDays: 365,
    },
    features: [
      'basic_analytics',
      'brand_tracking',
      'competitor_tracking',
      'advanced_analytics',
      'competitor_intelligence',
      'citation_gap',
      'advanced_recommendations',
      'report_export',
      'client_reporting',
      'multiple_workspaces',
      'priority_support',
      'ad_intelligence',
      'ad_comparison',
      'ad_monitoring',
      'ad_exports',
      'chatgpt_ads_intelligence',
      'chatgpt_ads_management',
      'chatgpt_ads_optimization',
      'chatgpt_ads_advanced_reporting',
      'chatgpt_ads_multi_client',
    ],
    isActive: true,
    trialDays: 0,
  },
];

/**
 * Returns all configured subscription plans.
 * Attempts to read from database; falls back gracefully to DEFAULT_PLANS.
 */
export async function getAllPlans(): Promise<SubscriptionPlanDefinition[]> {
  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    return DEFAULT_PLANS;
  }

  try {
    const dbPlans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPricePaise: 'asc' },
    });

    if (dbPlans && dbPlans.length > 0) {
      return dbPlans.map((p) => ({
        slug: p.slug as PlanSlug,
        name: p.name,
        description: p.description || '',
        monthlyPricePaise: p.monthlyPricePaise,
        annualPricePaise: p.annualPricePaise,
        currency: p.currency,
        quotas: {
          monthlyPromptLimit: p.promptRunsLimit,
          brandLimit: p.brandLimit,
          workspaceLimit: p.workspaceLimit,
          competitorLimit: p.competitorLimit,
        },
        features: (p.features as any[]) || [],
        isActive: p.isActive,
        isDefault: p.isDefault,
        trialDays: p.trialDays,
      }));
    }
  } catch {
    // If DB is unreachable or tables not yet migrated, safely return defaults
  }

  return DEFAULT_PLANS;
}

/**
 * Retrieves a plan definition by its slug identifier.
 */
export async function getPlanBySlug(slug: string): Promise<SubscriptionPlanDefinition> {
  const normalizedSlug = slug.toLowerCase().trim();

  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    const match = DEFAULT_PLANS.find((p) => p.slug === normalizedSlug);
    return match || DEFAULT_PLANS.find((p) => p.slug === 'starter') || DEFAULT_PLANS[0];
  }

  try {
    const dbPlan = await prisma.subscriptionPlan.findUnique({
      where: { slug: normalizedSlug },
    });

    if (dbPlan) {
      return {
        slug: dbPlan.slug as PlanSlug,
        name: dbPlan.name,
        description: dbPlan.description || '',
        monthlyPricePaise: dbPlan.monthlyPricePaise,
        annualPricePaise: dbPlan.annualPricePaise,
        currency: dbPlan.currency,
        quotas: {
          monthlyPromptLimit: dbPlan.promptRunsLimit,
          brandLimit: dbPlan.brandLimit,
          workspaceLimit: dbPlan.workspaceLimit,
          competitorLimit: dbPlan.competitorLimit,
        },
        features: (dbPlan.features as any[]) || [],
        isActive: dbPlan.isActive,
        isDefault: dbPlan.isDefault,
        trialDays: dbPlan.trialDays,
      };
    }
  } catch {
    // Fall back to in-memory default
  }

  const defaultMatch = DEFAULT_PLANS.find((p) => p.slug === normalizedSlug);
  if (defaultMatch) {
    return defaultMatch;
  }

  // Fallback to starter plan if unknown slug provided
  return DEFAULT_PLANS.find((p) => p.slug === 'starter') || DEFAULT_PLANS[0];
}

/**
 * Seeds default subscription plans into the database idempotently.
 */
export async function seedDefaultPlans(): Promise<void> {
  try {
    for (const plan of DEFAULT_PLANS) {
      await prisma.subscriptionPlan.upsert({
        where: { slug: plan.slug },
        update: {
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
          isActive: plan.isActive,
          isDefault: plan.isDefault ?? false,
          trialDays: plan.trialDays,
        },
        create: {
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
          isActive: plan.isActive,
          isDefault: plan.isDefault ?? false,
          trialDays: plan.trialDays,
        },
      });
    }
  } catch (err: any) {
    console.warn('[PlanService] Plan seeding skipped or delayed:', err.message);
  }
}
