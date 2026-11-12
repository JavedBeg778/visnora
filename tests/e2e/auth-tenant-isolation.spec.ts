import { test, expect } from '@playwright/test';

test.describe('E2E — Auth & Tenant Security Isolation', () => {
  test('unauthenticated access to protected dashboard redirects to login', async ({ page }) => {
    const response = await page.goto('/dashboard');
    // Either redirected to /login or blocked with auth requirement
    const url = page.url();
    expect(url.includes('/login') || url.includes('/auth') || response?.status() === 401 || response?.status() === 307 || response?.status() === 302).toBeTruthy();
  });

  test('protected API routes reject requests without valid session', async ({ request }) => {
    const res = await request.post('/api/v1/tracking/start', {
      data: {
        organizationId: '293e8995-0113-480e-a062-26008ee8af21',
        projectId: '293e8995-0113-480e-a062-26008ee8af21',
      },
    });
    // Must fail closed with 401 Unauthorized
    expect([401, 403]).toContain(res.status());
  });

  test('security headers are present on API responses', async ({ request }) => {
    const res = await request.get('/api/v1/health');
    const headers = res.headers();
    // Verify essential security headers (HSTS on Vercel production and nosniff when deployed)
    expect(headers['strict-transport-security']).toBeTruthy();
    if (headers['x-content-type-options']) {
      expect(headers['x-content-type-options']).toBe('nosniff');
    }
  });
});

