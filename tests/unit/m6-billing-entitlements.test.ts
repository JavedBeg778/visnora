// Visnora — M6 ChatGPT Ads Billing & Entitlements Unit Tests
// Reference: M6.12 Subscription Plans & Entitlements

import { describe, it, expect } from 'vitest';
import { DEFAULT_PLANS } from '../../packages/domain/billing/plan-service';
import { checkEntitlement, EntitlementError } from '../../packages/domain/billing/entitlements';

describe('M6 Billing & Entitlements for ChatGPT Ads', () => {
  it('verifies Free tier ChatGPT Ads quotas and feature entitlements', () => {
    const free = DEFAULT_PLANS.find((p) => p.slug === 'free')!;
    expect(free.features).toContain('chatgpt_ads_intelligence');
    expect(free.features).not.toContain('chatgpt_ads_management');
    expect(free.features).not.toContain('chatgpt_ads_optimization');
    expect(free.quotas.connectedAdsAccountsLimit).toBe(1);
    expect(free.quotas.monthlyAiRecommendationsLimit).toBe(20);
    expect(free.quotas.reportingHistoryDays).toBe(7);
  });

  it('verifies Starter tier unlocks ChatGPT Ads Campaign Management', () => {
    const starter = DEFAULT_PLANS.find((p) => p.slug === 'starter')!;
    expect(starter.features).toContain('chatgpt_ads_intelligence');
    expect(starter.features).toContain('chatgpt_ads_management');
    expect(starter.features).not.toContain('chatgpt_ads_optimization');
    expect(starter.features).not.toContain('chatgpt_ads_advanced_reporting');
    expect(starter.quotas.connectedAdsAccountsLimit).toBe(1);
    expect(starter.quotas.monthlyAiRecommendationsLimit).toBe(100);
    expect(starter.quotas.reportingHistoryDays).toBe(30);
  });

  it('verifies Pro tier unlocks AI Optimization and Advanced Reporting', () => {
    const pro = DEFAULT_PLANS.find((p) => p.slug === 'pro')!;
    expect(pro.features).toContain('chatgpt_ads_intelligence');
    expect(pro.features).toContain('chatgpt_ads_management');
    expect(pro.features).toContain('chatgpt_ads_optimization');
    expect(pro.features).toContain('chatgpt_ads_advanced_reporting');
    expect(pro.features).not.toContain('chatgpt_ads_multi_client');
    expect(pro.quotas.connectedAdsAccountsLimit).toBe(3);
    expect(pro.quotas.monthlyAiRecommendationsLimit).toBe(500);
    expect(pro.quotas.reportingHistoryDays).toBe(90);
  });

  it('verifies Agency tier unlocks Multi-Client ChatGPT Ads with extended quotas', () => {
    const agency = DEFAULT_PLANS.find((p) => p.slug === 'agency')!;
    expect(agency.features).toContain('chatgpt_ads_intelligence');
    expect(agency.features).toContain('chatgpt_ads_management');
    expect(agency.features).toContain('chatgpt_ads_optimization');
    expect(agency.features).toContain('chatgpt_ads_advanced_reporting');
    expect(agency.features).toContain('chatgpt_ads_multi_client');
    expect(agency.quotas.connectedAdsAccountsLimit).toBe(10);
    expect(agency.quotas.monthlyAiRecommendationsLimit).toBe(2000);
    expect(agency.quotas.reportingHistoryDays).toBe(365);
  });

  it('correctly constructs EntitlementError for M6 feature keys with upgrade guidance', () => {
    const error1 = new EntitlementError('chatgpt_ads_management', 'Free Trial', 'Starter');
    expect(error1.featureKey).toBe('chatgpt_ads_management');
    expect(error1.currentPlan).toBe('Free Trial');
    expect(error1.requiredPlan).toBe('Starter');
    expect(error1.message).toContain('chatgpt_ads_management');
    expect(error1.message).toContain('Starter');

    const error2 = new EntitlementError('chatgpt_ads_optimization', 'Starter', 'Pro');
    expect(error2.featureKey).toBe('chatgpt_ads_optimization');
    expect(error2.requiredPlan).toBe('Pro');
    expect(error2.message).toContain('Pro');

    const error3 = new EntitlementError('chatgpt_ads_multi_client', 'Pro', 'Agency');
    expect(error3.featureKey).toBe('chatgpt_ads_multi_client');
    expect(error3.requiredPlan).toBe('Agency');
    expect(error3.message).toContain('Agency');
  });
});
