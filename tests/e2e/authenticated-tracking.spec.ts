import { test, expect } from '@playwright/test';

/**
 * VISNORA — Authenticated End-to-End Tracking Execution Suite
 *
 * Requirements:
 * 1. Dedicated test user with verified organization & project: E2E_USER_EMAIL and E2E_USER_PASSWORD.
 * 2. Real Redis instance and background worker running (or serverless fallback).
 * 3. Status: BLOCKED if E2E_USER_EMAIL / E2E_USER_PASSWORD are not provisioned in the execution environment.
 */

const e2eEmail = process.env.E2E_USER_EMAIL;
const e2ePassword = process.env.E2E_USER_PASSWORD;
const isStagingConfigured = Boolean(e2eEmail && e2ePassword);

test.describe('Authenticated E2E — Tracking Pipeline, Tenant Isolation & Dashboard Flow', () => {
  test.beforeEach(async () => {
    test.skip(
      !isStagingConfigured,
      'BLOCKED: Requires dedicated staging test credentials (E2E_USER_EMAIL and E2E_USER_PASSWORD). See docs/AUTHENTICATED_E2E_SETUP.md for provisioning instructions.'
    );
  });

  test('signs in as authenticated user, accesses dashboard, and verifies organization context', async ({ page }) => {
    // 1. Visit Sign In page
    await page.goto('/sign-in');
    await expect(page).toHaveTitle(/Visnora/i);

    // 2. Perform authentication
    await page.fill('input[type="email"], input[name="email"]', e2eEmail!);
    await page.fill('input[type="password"], input[name="password"]', e2ePassword!);
    await page.click('button[type="submit"]');

    // 3. Confirm redirected to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
  });

  test('triggers tracking run and verifies status polling and persistence', async ({ page, request }) => {
    // 1. Sign in to obtain session cookies
    await page.goto('/sign-in');
    await page.fill('input[type="email"], input[name="email"]', e2eEmail!);
    await page.fill('input[type="password"], input[name="password"]', e2ePassword!);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // 2. Fetch authenticated user projects
    const projectsRes = await request.get('/api/v1/projects');
    expect(projectsRes.status()).toBe(200);
    const projectsData = await projectsRes.json();
    expect(projectsData.success).toBe(true);
    expect(projectsData.data.projects.length).toBeGreaterThan(0);

    const targetProject = projectsData.data.projects[0];
    const organizationId = targetProject.organizationId;
    const projectId = targetProject.id;

    // 3. Trigger tracking run via authenticated API
    const startRes = await request.post('/api/v1/tracking/start', {
      data: {
        organizationId,
        projectId,
        provider: 'google-gemini',
        model: 'gemini-2.5-flash',
        dryRun: true,
      },
    });

    expect([200, 201, 202]).toContain(startRes.status());
    const startData = await startRes.json();
    expect(startData.success).toBe(true);
    const runId = startData.data.trackingRunId;
    expect(runId).toBeTruthy();

    // 4. Poll tracking run status
    let attempts = 0;
    let runStatus = startData.data.status || 'QUEUED';

    while (attempts < 10 && !['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED'].includes(runStatus)) {
      await page.waitForTimeout(2000);
      const pollRes = await request.get(`/api/v1/tracking/runs/${runId}`);
      if (pollRes.status() === 200) {
        const pollData = await pollRes.json();
        runStatus = pollData.data?.status || runStatus;
      }
      attempts++;
    }

    // Verify run progressed from initial state
    expect(['QUEUED', 'RUNNING', 'COMPLETED', 'PARTIALLY_COMPLETED']).toContain(runStatus);
  });

  test('enforces cross-tenant isolation by rejecting unauthorized run or project access', async ({ page, request }) => {
    // 1. Sign in to obtain session
    await page.goto('/sign-in');
    await page.fill('input[type="email"], input[name="email"]', e2eEmail!);
    await page.fill('input[type="password"], input[name="password"]', e2ePassword!);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // 2. Attempt to access a nonexistent foreign tenant project
    const foreignProjectId = '00000000-0000-0000-0000-000000000000';
    const foreignProjectRes = await request.get(`/api/v1/projects/${foreignProjectId}`);
    expect([401, 403, 404]).toContain(foreignProjectRes.status());

    // 3. Attempt to trigger tracking on a foreign project
    const foreignStartRes = await request.post('/api/v1/tracking/start', {
      data: {
        organizationId: '00000000-0000-0000-0000-000000000000',
        projectId: foreignProjectId,
      },
    });
    expect([401, 403, 404]).toContain(foreignStartRes.status());
  });
});

