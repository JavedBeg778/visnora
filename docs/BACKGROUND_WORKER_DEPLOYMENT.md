# Visnora — Persistent Background Worker Deployment Guide

**Service:** `visnora-background-worker`  
**Runtime:** Node.js 20+ LTS  
**Orchestrator:** BullMQ v5  
**Message Broker:** Upstash Redis (or self-hosted/cloud Redis)  
**Host Recommended:** Render Background Worker (Blueprint: `render.yaml`) / Railway / Fly.io / AWS ECS  
**Status:** Implemented & Locally Verified (Production Deployment Ready)

---

## 1. Architectural Overview

Visnora decouples client-facing Next.js HTTP serverless requests from resource-intensive background execution:

```
[Web Client / UI]
       │
       ▼  (POST /api/v1/tracking/start or Vercel Cron /api/v1/tracking/cron)
[Vercel Serverless Function]
       │
       │  (1. Validate Tenant & Reserve Quota)
       │  (2. Create TrackingRun record in PostgreSQL)
       │  (3. Enqueue Job to BullMQ with deduplication key)
       ▼
 [Upstash Redis Queue] ◄──── rediss:// (TLS Encrypted)
       │
       ▼  (Pulls job via persistent connection)
[Render Background Worker] (packages/jobs/workers/index.ts)
       │
       ├── TrackingWorker (packages/jobs/workers/tracking-worker.ts)
       ├── AdWorker (packages/jobs/workers/ad-worker.ts)
       └── ChatGPTAdsWorker (packages/jobs/workers/chatgpt-ads-worker.ts)
       │
       ▼  (Atomic updates: RUNNING ──> COMPLETED / FAILED)
[Supabase PostgreSQL]
```

### Why Persistent Workers Are Required
1. **Serverless Execution Limits**: Vercel Serverless functions enforce execution timeouts (max 60s–300s). Multi-prompt AI visibility evaluations can exceed these limits.
2. **Termination Safety**: Background work executed inside Next.js `after()` is terminated immediately when the serverless container spins down. In contrast, BullMQ jobs persist in Redis until acknowledged.
3. **Bounded Concurrency & Rate Limiting**: The persistent worker processes jobs with bounded concurrency (`WORKER_CONCURRENCY=2`), preventing provider rate-limit spikes on Google Gemini or OpenAI.

---

## 2. Redis Configuration & TLS Setup

Visnora supports **Upstash Redis** (serverless persistent Redis with TLS) or standard cloud Redis.

### Required Redis Environment Variables
| Variable | Description | Example Pattern |
| :--- | :--- | :--- |
| `REDIS_URL` | Full Redis connection string (`rediss://` for TLS) | `rediss://default:xxxx@xxxx.upstash.io:6379` |
| `REDIS_TLS` | Force TLS encryption | `true` |
| `REDIS_REJECT_UNAUTHORIZED` | TLS CA certificate validation | Strictly `true` in production (enforced in code) |

### Strict Production TLS Certificate Verification
In production (`NODE_ENV=production`), TLS certificate verification (`rejectUnauthorized: true`) is strictly enforced in code. Upstash Redis uses certificates issued by public Certificate Authorities (DigiCert / Let's Encrypt), which are verified against standard Node.js root CAs without requiring custom root certificates. In production, attempts to disable verification via `REDIS_REJECT_UNAUTHORIZED=false` are intentionally ignored.

### BullMQ Redis Specifications
- **Connection Flags**: `maxRetriesPerRequest: null`, `enableReadyCheck: false`.
- **Lock Duration**: 300,000 ms (5 minutes) for long prompt batches.
- **Stalled Job Detection**: Every 30 seconds (`stalledInterval: 30000`).
- **Crash Recovery & Heartbeat Expiry**:
  - If a worker process terminates abruptly (e.g. OOM, host crash), BullMQ detects the stalled lock and redelivers the job.
  - The worker recognizes jobs for runs already marked `RUNNING` and resumes execution rather than skipping.
  - Intermediate retry attempts keep the run in `RUNNING` status with diagnostic retry counters in `errorMessage`.
  - Runs in `RUNNING` status without heartbeat updates for >15 minutes are automatically transitioned to `FAILED` by `recoverStaleRunningRuns()` so they do not stay stuck on user dashboards.
- **Job Retention**:
  - Completed jobs: kept for 24 hours (max 500).
  - Failed jobs: kept for 7 days (max 500) for forensic inspection.

---

## 3. Render Background Worker Deployment (`render.yaml`)

Visnora includes Infrastructure-as-Code via [`render.yaml`](file:///D:/react-native/VISNORA/render.yaml).

### Step-by-Step Deployment on Render

1. **Connect Repository**:
   - In Render Dashboard, click **New +** → **Blueprint**.
   - Connect the repository `https://github.com/JavedBeg778/visnora`.
   - Render automatically detects `render.yaml` and provisions `visnora-background-worker`.

2. **Build and Start Commands**:
   - **Build Command**: `npm install && npx prisma generate --schema=packages/database/prisma/schema.prisma`
   - **Start Command**: `npm run worker`
   - **Instance Type**: `Starter` (0.5 CPU, 512 MB RAM) or `Standard` (1 CPU, 2 GB RAM).

3. **Configure Environment Variables**:
   In the Render Dashboard under **Environment**, set the following secrets:
   ```bash
   NODE_ENV=production
   WORKER_CONCURRENCY=2
   WORKER_PORT=8080
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   REDIS_URL=rediss://default:[TOKEN]@[HOST].upstash.io:6379
   REDIS_TLS=true
   GEMINI_API_KEY=[GOOGLE_API_KEY]
   OPENAI_API_KEY=[OPENAI_API_KEY]
   ENCRYPTION_KEY=[32_BYTE_HEX_KEY]
   ```

4. **Verify Health Probes**:
   The worker starts a lightweight HTTP health check on port `8080` (or `PORT`).
   - Endpoint: `GET /health`
   - Response:
     ```json
     {
       "status": "healthy",
       "service": "visnora-background-worker",
       "uptimeSeconds": 1420,
       "redis": "connected",
       "workers": {
         "tracking": "running",
         "adIntelligence": "running",
         "chatgptAds": "running"
       }
     }
     ```

---

## 4. Local Execution & Testing

To run the background worker locally:

```bash
# Set environment variables in .env.local
REDIS_URL=redis://127.0.0.1:6379

# Run the complete worker suite
npm run worker

# Or run exclusively the tracking worker
npm run worker:tracking
```

---

## 5. Operations, Troubleshooting & Recovery

### Failed Job Inspection
Visnora provides programmatic inspection utilities in [`packages/jobs/queues/tracking-queue.ts`](file:///D:/react-native/VISNORA/packages/jobs/queues/tracking-queue.ts):

```typescript
import { getFailedTrackingJobs, retryTrackingJob, getTrackingQueueMetrics } from '@/jobs/queues/tracking-queue';

// Get current queue state
const metrics = await getTrackingQueueMetrics();
console.log(metrics); // { waiting: 0, active: 1, completed: 42, failed: 2, delayed: 0 }

// Inspect failed jobs
const failed = await getFailedTrackingJobs(0, 10);
console.log(failed);

// Retry a specific job
await retryTrackingJob('tracking-run-uuid-here');
```

### Graceful Shutdown
The worker registers handlers for `SIGTERM` and `SIGINT`:
1. Pauses consumers to prevent accepting new jobs.
2. Waits up to 30 seconds for in-flight prompt batches to finish.
3. Closes Redis connections and exits cleanly (`exit code 0`).

