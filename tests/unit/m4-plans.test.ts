import { describe, it, expect } from 'vitest';
import { DEFAULT_PLANS, getPlanBySlug } from '../../packages/domain/billing/plan-service';

describe('M4.1 Subscription Plans & Pricing Catalog', () => {
  it('defines the four required tiers with correct slugs', () => {
    const slugs = DEFAULT_PLANS.map((p) => p.slug);
    expect(slugs).toEqual(['free', 'starter', 'pro', 'agency']);
  });

  it('stores all prices strictly as integer paise in INR currency', () => {
    for (const plan of DEFAULT_PLANS) {
      expect(Number.isInteger(plan.monthlyPricePaise)).toBe(true);
      expect(Number.isInteger(plan.annualPricePaise)).toBe(true);
      expect(plan.monthlyPricePaise).toBeGreaterThanOrEqual(0);
      expect(plan.annualPricePaise).toBeGreaterThanOrEqual(0);
      expect(plan.currency).toBe('INR');
    }

    const starter = DEFAULT_PLANS.find((p) => p.slug === 'starter')!;
    const pro = DEFAULT_PLANS.find((p) => p.slug === 'pro')!;
    const agency = DEFAULT_PLANS.find((p) => p.slug === 'agency')!;

    expect(starter.monthlyPricePaise).toBe(149900); // ₹1,499
    expect(pro.monthlyPricePaise).toBe(399900);    // ₹3,999
    expect(agency.monthlyPricePaise).toBe(999900); // ₹9,999
  });

  it('enforces 2 months free (10 months charge) on annual billing', () => {
    for (const plan of DEFAULT_PLANS) {
      if (plan.monthlyPricePaise > 0) {
        expect(plan.annualPricePaise).toBe(plan.monthlyPricePaise * 10);
      } else {
        expect(plan.annualPricePaise).toBe(0);
      }
    }
  });

  it('enforces progressive, monotonic prompt run quotas across tiers', () => {
    const free = DEFAULT_PLANS.find((p) => p.slug === 'free')!;
    const starter = DEFAULT_PLANS.find((p) => p.slug === 'starter')!;
    const pro = DEFAULT_PLANS.find((p) => p.slug === 'pro')!;
    const agency = DEFAULT_PLANS.find((p) => p.slug === 'agency')!;

    expect(free.quotas.monthlyPromptLimit).toBe(20);
    expect(starter.quotas.monthlyPromptLimit).toBe(100);
    expect(pro.quotas.monthlyPromptLimit).toBe(500);
    expect(agency.quotas.monthlyPromptLimit).toBe(2500);

    expect(free.quotas.monthlyPromptLimit).toBeLessThan(starter.quotas.monthlyPromptLimit);
    expect(starter.quotas.monthlyPromptLimit).toBeLessThan(pro.quotas.monthlyPromptLimit);
    expect(pro.quotas.monthlyPromptLimit).toBeLessThan(agency.quotas.monthlyPromptLimit);
  });

  it('enforces progressive brand and competitor limits', () => {
    const starter = DEFAULT_PLANS.find((p) => p.slug === 'starter')!;
    const pro = DEFAULT_PLANS.find((p) => p.slug === 'pro')!;
    const agency = DEFAULT_PLANS.find((p) => p.slug === 'agency')!;

    expect(starter.quotas.brandLimit).toBe(1);
    expect(pro.quotas.brandLimit).toBe(3);
    expect(agency.quotas.brandLimit).toBe(10);

    expect(starter.quotas.competitorLimit).toBe(3);
    expect(pro.quotas.competitorLimit).toBe(5);
    expect(agency.quotas.competitorLimit).toBe(20);
  });

  it('retrieves plan by slug case-insensitively with safe fallback', async () => {
    const proPlan = await getPlanBySlug('PRO');
    expect(proPlan.slug).toBe('pro');
    expect(proPlan.name).toBe('Pro');

    const starterPlan = await getPlanBySlug('  starter  ');
    expect(starterPlan.slug).toBe('starter');

    const fallbackPlan = await getPlanBySlug('non_existent_slug');
    expect(fallbackPlan.slug).toBe('starter');
  });
});
