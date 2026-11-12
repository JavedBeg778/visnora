import { test, expect } from '@playwright/test';

test.describe('E2E — Billing & Checkout Flow', () => {
  test('unauthorized upgrade requests are rejected', async ({ request }) => {
    const res = await request.post('/api/v1/billing/subscription/upgrade', {
      data: {
        planSlug: 'pro',
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('checkout session requires valid authentication and fails closed', async ({ request }) => {
    const res = await request.post('/api/v1/billing/checkout', {
      data: {
        planSlug: 'pro',
        billingCycle: 'MONTHLY',
      },
    });
    expect([401, 403]).toContain(res.status());
  });
});

