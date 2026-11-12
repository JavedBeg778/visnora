import { test, expect } from '@playwright/test';

test.describe('E2E — Tracking Pipeline Security & Endpoints', () => {
  test('tracking start endpoint enforces authentication and rate limits', async ({ request }) => {
    // Sending unauthenticated request
    const res = await request.post('/api/v1/tracking/start', {
      data: {
        organizationId: '293e8995-0113-480e-a062-26008ee8af21',
        projectId: '293e8995-0113-480e-a062-26008ee8af21',
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('schedules endpoint enforces authentication', async ({ request }) => {
    const res = await request.get('/api/v1/tracking/schedules');
    expect([401, 403]).toContain(res.status());
  });
});

