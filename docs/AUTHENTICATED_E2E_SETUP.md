# Visnora — Authenticated End-to-End (E2E) Test Suite Setup & Guide

## Overview

The authenticated Playwright E2E suite (`tests/e2e/authenticated-tracking.spec.ts`) tests the full user journey:
1. **User Authentication:** Logging in through Supabase Auth via `/sign-in`.
2. **Dashboard & Tenant Verification:** Loading organization projects, brands, and prompts in light mode.
3. **Tracking Pipeline Execution:** Triggering a live tracking run via `/api/v1/tracking/start`, enqueuing to BullMQ/Redis, and polling run status through completion.
4. **Cross-Tenant Isolation:** Verifying that the authenticated session cannot view or trigger runs for foreign projects or organizations (strictly returning 401, 403, or 404).

---

## Current Status: BLOCKED

> **Classification:** `BLOCKED` (Waiting on Dedicated Staging Credentials)
> 
> In accordance with production security policies, tests running against live or staging environments do not hardcode credentials. When `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` are not detected in the environment, the suite automatically marks tests as skipped with an explicit explanatory message:
> `BLOCKED: Requires dedicated staging test credentials (E2E_USER_EMAIL and E2E_USER_PASSWORD)`.

---

## Required Environment Variables

To enable and run the authenticated E2E test suite in staging or CI:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `E2E_USER_EMAIL` | Dedicated test account email created in Supabase Auth | `e2e-tester@visnora.internal` |
| `E2E_USER_PASSWORD` | Strong password for the dedicated test account | `************************` |
| `NEXT_PUBLIC_APP_URL` | Target base URL (staging or production preview) | `https://staging.visnora.app` |
| `REDIS_URL` | Upstash or persistent Redis connection for worker | `rediss://default:...@upstash.io:6379` |
| `DATABASE_URL` | Staging PostgreSQL connection with Prisma migrations applied | `postgresql://...` |

---

## Step-by-Step Test User Provisioning

### 1. Create Staging Test User in Supabase Auth
```bash
# In the Supabase dashboard (or via Supabase CLI / Admin API):
# Create a user with confirmed email:
Email: e2e-tester@visnora.internal
Password: <SECURE_GENERATED_PASSWORD>
Email Confirm: true
```

### 2. Provision Tenant Organization & Seed Project
Run the following SQL in the staging database or through Prisma Studio:
```sql
-- 1. Create dedicated test organization
INSERT INTO organizations (id, name, slug, "createdAt", "updatedAt")
VALUES (
  'e2e00000-0000-0000-0000-000000000001',
  'E2E Test Organization',
  'e2e-test-org',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Link test user as OWNER
INSERT INTO organization_members (id, "organizationId", "userId", role, "createdAt", "updatedAt")
SELECT
  'e2e00000-0000-0000-0000-000000000002',
  'e2e00000-0000-0000-0000-000000000001',
  id,
  'OWNER',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'e2e-tester@visnora.internal'
ON CONFLICT DO NOTHING;

-- 3. Provision test project, primary brand, and tracked prompts
INSERT INTO projects (id, "organizationId", name, slug, "createdAt", "updatedAt")
VALUES (
  'e2e00000-0000-0000-0000-000000000003',
  'e2e00000-0000-0000-0000-000000000001',
  'E2E Test Project',
  'e2e-test-project',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO brands (id, "projectId", "organizationId", name, "canonicalName", domain, "isPrimary", "createdAt", "updatedAt")
VALUES (
  'e2e00000-0000-0000-0000-000000000004',
  'e2e00000-0000-0000-0000-000000000003',
  'e2e00000-0000-0000-0000-000000000001',
  'Visnora Test',
  'Visnora Test',
  'visnora.test',
  TRUE,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO tracked_prompts (id, "projectId", "organizationId", text, category, "isActive", "createdAt", "updatedAt")
VALUES (
  'e2e00000-0000-0000-0000-000000000005',
  'e2e00000-0000-0000-0000-000000000003',
  'e2e00000-0000-0000-0000-000000000001',
  'Best AI visibility tools for SaaS',
  'GENERAL',
  TRUE,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
```

---

## Execution Instructions

### Local Execution (with Staging Target)
```powershell
$env:E2E_USER_EMAIL="e2e-tester@visnora.internal"
$env:E2E_USER_PASSWORD="<SECURE_GENERATED_PASSWORD>"
$env:NEXT_PUBLIC_APP_URL="https://staging.visnora.app"
npx playwright test tests/e2e/authenticated-tracking.spec.ts
```

### GitHub Actions CI Workflow Setup
Add the following secrets to GitHub Repository Settings (`Settings -> Secrets and variables -> Actions`):
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`
- `NEXT_PUBLIC_APP_URL`

When these secrets are provided, CI will automatically execute the authenticated suite alongside existing smoke tests.

