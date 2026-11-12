// Visnora — Feature Entitlement & Plan Access Guard System
// Reference: docs/TECHNICAL_BLUEPRINT.md & M4.4 Feature Entitlement System

import { getOrganizationSubscription } from './subscription-service';
import { FeatureKey, EntitlementCheckResult } from './types';

export class EntitlementError extends Error {
  constructor(
    public readonly featureKey: FeatureKey,
    public readonly currentPlan: string,
    public readonly requiredPlan: string,
    message?: string
  ) {
    super(
      message ||
        `Feature "${featureKey}" is not available on your current "${currentPlan}" plan. Please upgrade to the "${requiredPlan}" plan to unlock this capability.`
    );
    this.name = 'EntitlementError';
  }
}

/**
 * Checks whether an organization is entitled to a specific feature capability.
 */
export async function checkEntitlement(
  organizationId: string,
  featureKey: FeatureKey
): Promise<EntitlementCheckResult> {
  const sub = await getOrganizationSubscription(organizationId);
  const plan = sub.planDefinition;

  // Active status check
  const isUsableStatus = ['TRIALING', 'ACTIVE'].includes(sub.normalizedStatus);

  if (!isUsableStatus) {
    return {
      allowed: false,
      featureKey,
      currentPlan: plan.name,
      message: `Your subscription is currently ${sub.normalizedStatus.toLowerCase()}. Please update your billing settings.`,
    };
  }

  const hasFeature = plan.features.includes(featureKey);

  let requiredPlan = 'Pro';
  if (['client_reporting', 'multiple_workspaces', 'priority_support', 'chatgpt_ads_multi_client'].includes(featureKey)) {
    requiredPlan = 'Agency';
  } else if (['report_export', 'citation_gap', 'competitor_intelligence', 'chatgpt_ads_optimization', 'chatgpt_ads_advanced_reporting'].includes(featureKey)) {
    requiredPlan = 'Pro';
  } else if (['competitor_tracking', 'ad_comparison', 'chatgpt_ads_management'].includes(featureKey)) {
    requiredPlan = 'Starter';
  }

  return {
    allowed: hasFeature,
    featureKey,
    currentPlan: plan.name,
    requiredPlan: hasFeature ? undefined : requiredPlan,
    message: hasFeature
      ? undefined
      : `Upgrade to ${requiredPlan} to access ${featureKey.replace(/_/g, ' ')}.`,
  };
}

/**
 * Throws an EntitlementError if the organization is not authorized to use the requested feature.
 */
export async function assertEntitlement(organizationId: string, featureKey: FeatureKey): Promise<void> {
  const check = await checkEntitlement(organizationId, featureKey);
  if (!check.allowed) {
    throw new EntitlementError(featureKey, check.currentPlan, check.requiredPlan || 'Pro', check.message);
  }
}

/**
 * Returns all active entitlements and numeric quotas for an organization.
 */
export async function getOrganizationEntitlements(organizationId: string) {
  const sub = await getOrganizationSubscription(organizationId);
  const plan = sub.planDefinition;

  return {
    planSlug: plan.slug,
    planName: plan.name,
    subscriptionStatus: sub.normalizedStatus,
    quotas: plan.quotas,
    features: plan.features,
    hasAdvancedAnalytics: plan.features.includes('advanced_analytics'),
    hasCompetitorIntelligence: plan.features.includes('competitor_intelligence'),
    hasCitationGapAnalysis: plan.features.includes('citation_gap'),
    hasReportExport: plan.features.includes('report_export'),
    hasClientReporting: plan.features.includes('client_reporting'),
    hasChatGPTAdsIntelligence: plan.features.includes('chatgpt_ads_intelligence'),
    hasChatGPTAdsManagement: plan.features.includes('chatgpt_ads_management'),
    hasChatGPTAdsOptimization: plan.features.includes('chatgpt_ads_optimization'),
    hasChatGPTAdsAdvancedReporting: plan.features.includes('chatgpt_ads_advanced_reporting'),
    hasChatGPTAdsMultiClient: plan.features.includes('chatgpt_ads_multi_client'),
    connectedAdsAccountsLimit: plan.quotas.connectedAdsAccountsLimit ?? 1,
    monthlyAiRecommendationsLimit: plan.quotas.monthlyAiRecommendationsLimit ?? 20,
    reportingHistoryDays: plan.quotas.reportingHistoryDays ?? 7,
  };
}

