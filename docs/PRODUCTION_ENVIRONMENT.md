# Visnora — Production Environment Configuration

This document specifies all environment variables required to run the Visnora SaaS application across Vercel (web frontend + serverless APIs) and Render / Docker (persistent background workers).

> [!IMPORTANT]
> Never commit actual values or `.env.production` files to source control. Configure these variables directly in the Vercel Dashboard, Render Dashboard, or your secrets management vault.

---

## 1. Environment Variable Reference

### 1.1 Database (Supabase PostgreSQL)
| Variable | Required In | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | Web & Worker | Pooled connection string for Prisma (port 6543 / PgBouncer mode). |
| `DIRECT_URL` | Web & Worker | Direct connection string for Prisma migrations (port 5432). |

### 1.2 Queue & Message Broker (Upstash Redis)
| Variable | Required In | Description |
| :--- | :---: | :--- |
| `REDIS_URL` | Web & Worker | Persistent Redis connection URL (`rediss://...` for TLS). |
| `REDIS_TLS` | Web & Worker | Set to `true` to enforce TLS handshake. |
| `REDIS_REJECT_UNAUTHORIZED` | Web & Worker | In production, TLS verification is strictly enforced (`rejectUnauthorized: true`) using standard root CAs (Upstash uses DigiCert/Let's Encrypt). |

### 1.3 Authentication (Supabase Auth)
| Variable | Required In | Description |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Web & Worker | Public URL of the Supabase project (`https://<project>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web | Public anonymous key for client-side authentication and SSR. |
| `SUPABASE_SERVICE_ROLE_KEY` | Web & Worker | Elevated service key used for admin tenant creation and server operations. |

### 1.4 Scheduled Automation & Crons
| Variable | Required In | Description |
| :--- | :---: | :--- |
| `CRON_SECRET` | Web | Shared secret between Vercel Cron and the Next.js API. Vercel automatically passes `Authorization: Bearer <CRON_SECRET>` on cron calls. |

### 1.5 AI Visibility Providers
| Variable | Required In | Description |
| :--- | :---: | :--- |
| `GEMINI_API_KEY` | Worker & Web | Google Gemini API key used by the visibility tracking collection engine. |
| `OPENAI_API_KEY` | Worker & Web | OpenAI API key used for GPT-4o comparisons and ChatGPT Ads integration. |

### 1.6 Security & Encryption
| Variable | Required In | Description |
| :--- | :---: | :--- |
| `ENCRYPTION_KEY` | Web & Worker | 32-byte hex-encoded string used for AES-256-GCM encryption of sensitive third-party advertiser credentials. |

### 1.7 Billing & Invoicing (Mock Sandbox / Enterprise Invoicing)
| Variable | Required In | Description |
| :--- | :---: | :--- |
| `ENABLE_MOCK_BILLING` | Web | Must be set to `true` to allow mock payment verification in production sandbox environments. |
| `INVOICE_ISSUER_NAME` | Web | Legal entity name appearing on PDF/HTML tax invoices. |
| `INVOICE_ISSUER_EMAIL` | Web | Support/billing contact email appearing on invoices. |
| `INVOICE_ISSUER_ADDRESS` | Web | Registered company address formatted on invoices. |
| `INVOICE_ISSUER_GSTIN` | Web | Official GSTIN identification number (or tax ID). If empty, domestic tax lines are omitted. |

### 1.8 Background Worker Tuning
| Variable | Required In | Description |
| :--- | :---: | :--- |
| `WORKER_CONCURRENCY` | Worker | Number of concurrent prompt batches processed simultaneously (Default: `2`). |
| `WORKER_PORT` | Worker | Port for the worker's internal HTTP health check server (Default: `8080`). |
| `ENABLE_IN_MEMORY_TRACKING` | Web (Dev only) | Set to `true` ONLY in local development to allow Next.js `after()` fallback when Redis is absent. Never enable in production. |

---

## 2. Platform Assignment Matrix

| Variable | Vercel (Web / APIs) | Render (Background Worker) | Local Development |
| :--- | :---: | :---: | :---: |
| `DATABASE_URL` | Yes | Yes | Yes |
| `DIRECT_URL` | Yes | Yes | Yes |
| `REDIS_URL` | Yes | Yes | Optional |
| `REDIS_TLS` | Yes | Yes | Optional |
| `CRON_SECRET` | Yes | No | Optional |
| `GEMINI_API_KEY` | Optional | Yes | Yes |
| `OPENAI_API_KEY` | Optional | Yes | Yes |
| `ENCRYPTION_KEY` | Yes | Yes | Yes |
| `WORKER_CONCURRENCY` | No | Yes | Optional |
| `WORKER_PORT` | No | Yes | Optional |

