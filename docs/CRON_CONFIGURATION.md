# Visnora — Automated Tracking Cron Configuration Guide

**Endpoint:** `/api/v1/tracking/cron`  
**Orchestrator:** Vercel Cron  
**Schedule:** `0 * * * *` (Hourly)  
**Security:** Bearer Token Authentication (`CRON_SECRET`)  
**Status:** Implemented & Locally Verified (Production Deployment Ready)

---

## 1. Overview

Visnora uses automated scheduled crons to trigger recurring AI visibility tracking runs for brands with configured schedules (`HOURLY`, `DAILY`, `WEEKLY`, `MONTHLY`).

To respect serverless limits, the cron endpoint does **not** evaluate LLM prompts directly. Instead, it:
1. Selects due schedules from PostgreSQL.
2. Atomically claims each schedule to prevent concurrent execution.
3. Enqueues a tracking job into the durable BullMQ queue.
4. Advances the schedule's `nextRunAt` timestamp.
5. Records immutable audit log entries.

---

## 2. Vercel Cron Configuration (`vercel.json`)

Vercel automatically triggers the endpoint using the schedule defined in [`vercel.json`](file:///D:/react-native/VISNORA/vercel.json):

```json
{
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next",
  "crons": [
    {
      "path": "/api/v1/tracking/cron",
      "schedule": "0 * * * *"
    }
  ]
}
```

- **Cadence**: Runs at the start of every hour (`0 * * * *`).
- **HTTP Method**: Vercel invokes cron endpoints using `GET`. (Visnora supports both `GET` and `POST`).

### Vercel Plan-Specific Scheduling Restrictions
- **Vercel Pro / Enterprise (Recommended for Visnora Production)**:
  - Supports execution as frequent as **every minute** (`* * * * *`).
  - Supports up to 40 cron jobs per project.
  - The configured hourly cadence (`0 * * * *`) operates natively.
- **Vercel Hobby (Personal / Free Accounts)**:
  - Restricted to at most **once per day** (e.g. `0 0 * * *`) and at most 1 cron job per project.
  - Deploying a schedule more frequent than daily on a Hobby account will trigger deployment errors or fail to register. If deploying on Hobby, adjust `vercel.json` to `"schedule": "0 0 * * *"`.

---

## 3. Security & Authentication (`CRON_SECRET`)

To prevent unauthorized third parties from triggering cron endpoints, Visnora enforces strict token validation:

1. **Vercel Behavior**:
   When `CRON_SECRET` is configured in Vercel project environment variables, Vercel automatically appends the header:
   ```http
   Authorization: Bearer <CRON_SECRET>
   ```

2. **Validation Logic & Timing-Safe Comparison** ([`apps/web/app/api/v1/tracking/cron/route.ts`](file:///D:/react-native/VISNORA/apps/web/app/api/v1/tracking/cron/route.ts)):
   - **Production Fail-Closed**: If `CRON_SECRET` is unset in production, the endpoint returns HTTP 401 (`CRON_SECRET is mandatory in production`).
   - **Timing-Safe Comparison**: Compares the incoming token and configured secret using `crypto.timingSafeEqual` to eliminate side-channel timing attack vectors.
   - **Unauthorized Calls**: Missing tokens return HTTP 401 (`UNAUTHORIZED`). Invalid tokens return HTTP 403 (`Forbidden: Invalid or unrecognized cron authentication secret`).
   - **Alternative Header**: Also supports `x-cron-secret` for webhook dispatchers.

---

## 4. Atomic Schedule Claiming & Cron-to-Queue Durability

If multiple cron requests fire simultaneously (e.g., during retries or multiple edge regions), Visnora guarantees that a schedule cannot be processed twice and cannot lose executions if Redis blips:

```typescript
// packages/domain/ai-visibility/schedule-service.ts
const claimResult = await prisma.$transaction(async (tx) => {
  const fresh = await tx.trackingSchedule.findFirst({
    where: {
      id: schedule.id,
      isEnabled: true,
      nextRunAt: { lte: now },
    },
  });

  if (!fresh) {
    return null; // Already claimed by a concurrent worker
  }

  const nextRunAt = computeNextRunAt(fresh.frequency, now);

  await tx.trackingSchedule.update({
    where: { id: fresh.id },
    data: {
      lastRunAt: now,
      nextRunAt,
    },
  });

  const run = await tx.trackingRun.create({
    data: {
      organizationId: schedule.organizationId,
      projectId: schedule.projectId,
      status: 'QUEUED',
      provider: schedule.provider,
      model: schedule.model,
      promptCount: prompts.length,
      startedAt: now,
    },
  });

  return { schedule: fresh, nextRunAt, trackingRun: run };
});
```

### Durability Guarantees:
1. **Zero Duplicate Invocations**: Row-level locking inside the transaction ensures concurrent cron requests cannot claim the same schedule.
2. **Safe Reversion on Enqueue Failure**: If Redis is unreachable or enqueueing fails, `nextRunAt` is automatically reverted to `now + 5 minutes` retry backoff rather than advancing to next day/week. The run is marked `FAILED` with diagnostics so the execution is never silently lost.
3. **Outbox Crash Recovery (`recoverOrphanedScheduleRuns`)**: Before each cron run, Visnora scans for any `QUEUED` runs stranded by a process termination and re-enqueues them into BullMQ.

---

## 5. Recurrence & Next Run Calculations

The next execution time is computed dynamically based on the frequency setting:

| Frequency | Interval Added | Code Logic |
| :--- | :--- | :--- |
| `HOURLY` | +1 Hour | `next.setHours(next.getHours() + 1)` |
| `DAILY` | +1 Day (24 hours) | `next.setDate(next.getDate() + 1)` |
| `WEEKLY` | +7 Days | `next.setDate(next.getDate() + 7)` |
| `MONTHLY` | +1 Month | `next.setMonth(next.getMonth() + 1)` |

---

## 6. Manual Testing & Verification

### Testing with cURL
```bash
# In production / staging with CRON_SECRET configured
curl -X GET "https://visnora.vercel.app/api/v1/tracking/cron" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Response (HTTP 200)
{
  "success": true,
  "data": {
    "timestamp": "2026-11-12T15:00:00.000Z",
    "durationMs": 42,
    "processedCount": 1,
    "enqueuedJobs": [
      {
        "scheduleId": "sched-uuid-1",
        "trackingRunId": "run-uuid-1",
        "jobId": "schedule-sched-uuid-1-1794494152866"
      }
    ],
    "skippedCount": 0,
    "errors": [],
    "message": "Successfully processed 1 due tracking schedules"
  }
}
```

### Automated Unit Test Suite
Run the dedicated test suite:
```bash
npx vitest run tests/unit/m3-cron-schedules.test.ts
```
Covers:
- Hourly, Daily, Weekly, and Monthly next-run calculations.
- Due schedule selection and BullMQ enqueueing.
- Concurrent claim race condition prevention.
- Project archival detection and schedule disabling.
- Token authentication and error code responses.

