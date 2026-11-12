import { describe, it, expect } from 'vitest';
import { EntitlementError } from '../../packages/domain/billing/entitlements';
import { DEFAULT_PLANS } from '../../packages/domain/billing/plan-service';

describe('M4.4 Feature Entitlements & Plan Access Control', () => {
  it('correctly constructs EntitlementError with featureKey, plans, and helpful upgrade message', () => {
    const error = new EntitlementError('report_export', 'starter', 'pro');

    expect(error.featureKey).toBe('report_export');
    expect(error.currentPlan).toBe('starter');
    expect(error.requiredPlan).toBe('pro');
    expect(error.message).toContain('report_export');
    expect(error.message).toContain('starter');
    expect(error.message).toContain('pro');
    expect(error.name).toBe('EntitlementError');
  });

  it('verifies that Free tier contains only baseline features', () => {
    const free = DEFAULT_PLANS.find((p) => p.slug === 'free')!;
    expect(free.features).toContain('basic_analytics');
    expect(free.features).toContain('brand_tracking');
    expect(free.features).not.toContain('competitor_tracking');
    expect(free.features).not.toContain('report_export');
    expect(free.features).not.toContain('multiple_workspaces');
  });

  it('verifies that Starter tier unlocks competitor tracking', () => {
    const starter = DEFAULT_PLANS.find((p) => p.slug === 'starter')!;
    expect(starter.features).toContain('basic_analytics');
    expect(starter.features).toContain('brand_tracking');
    expect(starter.features).toContain('competitor_tracking');
    expect(starter.features).not.toContain('advanced_analytics');
    expect(starter.features).not.toContain('report_export');
    expect(starter.features).not.toContain('multiple_workspaces');
  });

  it('verifies that Pro tier unlocks advanced intelligence, citation gap, and report export', () => {
    const pro = DEFAULT_PLANS.find((p) => p.slug === 'pro')!;
    expect(pro.features).toContain('advanced_analytics');
    expect(pro.features).toContain('competitor_intelligence');
    expect(pro.features).toContain('citation_gap');
    expect(pro.features).toContain('advanced_recommendations');
    expect(pro.features).toContain('report_export');
    expect(pro.features).not.toContain('client_reporting');
    expect(pro.features).not.toContain('priority_support');
  });

  it('verifies that Agency tier contains client reporting and priority support', () => {
    const agency = DEFAULT_PLANS.find((p) => p.slug === 'agency')!;
    expect(agency.features).toContain('client_reporting');
    expect(agency.features).toContain('multiple_workspaces');
    expect(agency.features).toContain('priority_support');
    expect(agency.features).toContain('report_export');
  });
});
