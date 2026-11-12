// Visnora — M5 Billing, Quotas & Entitlements Unit Tests
// Reference: M5.5 Billing, Subscriptions & Entitlements Integration

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_PLANS } from '../../packages/domain/billing/plan-service';
import { reserveAdQuota } from '../../packages/domain/billing/usage-meter';
import * as subService from '../../packages/domain/billing/subscription-service';
import { prisma } from '../../packages/database/src/client';

describe('M5.5 Subscription Plans & Entitlements for Ad Intelligence', () => {
  it('includes M5 feature keys and ad limits across subscription tiers', () => {
    const free = DEFAULT_PLANS.find(p => p.slug === 'free')!;
    expect(free.features).toContain('ad_intelligence');
    expect(free.quotas.monthlyAdsLimit).toBe(20);
    expect(free.quotas.monitoredCompetitorsLimit).toBe(1);

    const starter = DEFAULT_PLANS.find(p => p.slug === 'starter')!;
    expect(starter.features).toContain('ad_intelligence');
    expect(starter.features).toContain('ad_comparison');
    expect(starter.quotas.monthlyAdsLimit).toBe(100);
    expect(starter.quotas.monitoredCompetitorsLimit).toBe(3);

    const pro = DEFAULT_PLANS.find(p => p.slug === 'pro')!;
    expect(pro.features).toContain('ad_intelligence');
    expect(pro.features).toContain('ad_comparison');
    expect(pro.features).toContain('ad_monitoring');
    expect(pro.features).toContain('ad_exports');
    expect(pro.quotas.monthlyAdsLimit).toBe(500);

    const agency = DEFAULT_PLANS.find(p => p.slug === 'agency')!;
    expect(agency.features).toContain('ad_intelligence');
    expect(agency.quotas.monthlyAdsLimit).toBe(2500);
  });

  it('reserves ad discovery quota atomically when remaining allowance is sufficient', async () => {
    // Mock subscription and usage counter
    vi.spyOn(subService, 'getOrganizationSubscription').mockResolvedValue({
      organizationId: 'test_org',
      planTier: 'STARTER',
      status: 'ACTIVE',
      planDefinition: DEFAULT_PLANS.find(p => p.slug === 'starter')!,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      billingCycle: 'MONTHLY',
    } as any);

    vi.spyOn(prisma.usageCounter, 'findFirst').mockResolvedValue({
      id: 'counter_1',
      organizationId: 'test_org',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      promptRunsUsed: 10,
      promptRunsLimit: 100,
      promptRunsReserved: 0,
      adSyncsUsed: 5,
      adSyncsLimit: 100,
      activeProjectsCount: 1,
      activeProjectsLimit: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await reserveAdQuota('test_org', 10);
    expect(res.allowed).toBe(true);
    expect(res.status).toBe('RESERVED');
    expect(res.reservationId).toBeDefined();
    expect(res.consumed).toBe(5);
    expect(res.limit).toBe(100);
  });

  it('rejects ad quota reservation when requested count exceeds limit', async () => {
    vi.spyOn(subService, 'getOrganizationSubscription').mockResolvedValue({
      organizationId: 'test_org',
      planTier: 'FREE',
      status: 'ACTIVE',
      planDefinition: DEFAULT_PLANS.find(p => p.slug === 'free')!,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      billingCycle: 'MONTHLY',
    } as any);

    vi.spyOn(prisma.usageCounter, 'findFirst').mockResolvedValue({
      id: 'counter_2',
      organizationId: 'test_org',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      promptRunsUsed: 0,
      promptRunsLimit: 20,
      promptRunsReserved: 0,
      adSyncsUsed: 18,
      adSyncsLimit: 20,
      activeProjectsCount: 1,
      activeProjectsLimit: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Request 5 when remaining is only 2 (20 - 18)
    const res = await reserveAdQuota('test_org', 5);
    expect(res.allowed).toBe(false);
    expect(res.status).toBe('QUOTA_EXCEEDED');
    expect(res.errorDetails?.message).toContain('Monthly ad discovery quota exceeded');
  });
});

