# Visnora — Architecture Specification

**Document Version:** 1.0  
**Baseline Date:** 4 November 2026  
**Document Stage:** System Architecture & Technical Design Specification  
**Architecture Pattern:** Modular Monolith with Asynchronous Worker Processes  
**Document Owner:** Senior SaaS Product Architect & Full-Stack Lead  
**Repository Context:** `D:\react-native\VISNORA`  

---

## 1. Architectural Philosophy & Principles

Visnora is structured as a **Modular Monolith**. This architectural choice reflects the realities of early-stage SaaS development: a single, highly coherent codebase minimizes deployment overhead, eliminates cross-service network latency, and enables rapid refactoring while enforcing strict domain boundary encapsulation.

### Guiding Principles:
1. **Strict Domain Boundaries**: Domain services never execute direct cross-domain SQL joins or state mutations. All interactions flow through typed service interfaces.
2. **PostgreSQL as Source of Truth**: All state, multi-tenant configurations, and event logs reside in PostgreSQL. No distributed eventual consistency headaches during early milestones.
3. **Defense in Depth**: Authorization is enforced at multiple tiers: Next.js edge middleware, application route handlers, domain service assertions, and PostgreSQL Row Level Security (RLS).
4. **Asynchronous Heavy Lifting**: All third-party network I/O (LLM API calls, ad network syncs, report exports) is decoupled from HTTP request-response cycles via BullMQ background jobs.
5. **No Speculative Microservices**: Keep all components inside a monorepo structure. Refactor to dedicated services only when CPU/memory constraints or specialized scaling requirements demand it.

---

## 2. System Decomposition & Logical Layering

```
┌────────────────────────────────────────────────────────────────────────┐
│                      VISNORA LOGICAL ARCHITECTURE                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. PRESENTATION LAYER (Next.js 15+ App Router)                         │
│    • Public Marketing Web (SSR / Static Generation)                    │
│    • Authenticated App Shell (React Server Components + Client Islands)│
│    • shadcn/ui Design Primitives + Tailwind CSS + Recharts             │
├────────────────────────────────────────────────────────────────────────┤
│ 2. APPLICATION & ROUTE LAYER                                           │
│    • Next.js Route Handlers (`/api/v1/*`)                              │
│    • Server Actions (Type-safe form mutations)                         │
│    • Request Validation Pipeline (Zod Schemas)                         │
│    • Auth & Tenant Session Resolution (Supabase SSR Helper)            │
├────────────────────────────────────────────────────────────────────────┤
│ 3. DOMAIN SERVICE LAYER                                                │
│    • Organizations & Workspaces Service                                │
│    • Projects & Brand Entities Service                                 │
│    • AI Visibility Engine (Prompts, Runs, Mentions, SOV Aggregation)   │
│    • Ad Intelligence Engine (Own-Account Sync, Public Ad Scrapers)     │
│    • ChatGPT Ads Engine (Campaigns, Ad Groups, Conversions)            │
│    • Billing & Entitlements Engine (Plans, Razorpay Subscriptions)     │
│    • Usage Metering Engine (Quota Reservation, Event Counters)         │
├────────────────────────────────────────────────────────────────────────┤
│ 4. INTEGRATION ADAPTER LAYER                                           │
│    • OpenAI Adapter (GPT-4o, o-series, Structured Outputs)             │
│    • Google Gemini Adapter (Gemini 3.8 Flash & 3.5 Flash-Lite, Grounding)│
│    • Google Ads API Adapter (OAuth2, Customer Reporting)               │
│    • Meta Marketing & Ad Library Adapter (Graph API)                   │
│    • OpenAI Ads Advertiser Adapter (Partner OAuth & Insights)          │
│    • Razorpay Payment Gateway Adapter (Checkout & Webhooks)            │
├────────────────────────────────────────────────────────────────────────┤
│ 5. BACKGROUND WORKER & JOB LAYER (BullMQ + Redis)                      │
│    • Prompt Scheduler & Executor Worker                                │
│    • Ad Network Sync Worker                                            │
│    • Report Export Worker (CSV / PDF Generation)                       │
│    • Webhook Idempotent Dispatcher                                     │
├────────────────────────────────────────────────────────────────────────┤
│ 6. PERSISTENCE LAYER                                                   │
│    • PostgreSQL 16 (Multi-tenant tables, UUIDs, JSONB raw storage)     │
│    • Supabase Row Level Security (RLS Policies)                        │
│    • Redis 7+ (Queue state, distributed locks, ephemeral rate limits)  │
│    • Supabase Storage (S3-compatible bucket for generated reports)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Multi-Tenancy Architecture & Hierarchy

Visnora implements a multi-tenant hierarchy designed for digital marketing agencies managing multiple brands and client accounts:

```
┌─────────────────────────────────────────────────────────┐
│                   ORGANIZATION                          │
│  (Billing Tenant Root, Subscription Plan, Invoices)    │
└───────────────────────────┬─────────────────────────────┘
                            │ 1 : N
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    WORKSPACE                            │
│  (Client Container / Brand Grouping / Agency Client)    │
└───────────────────────────┬─────────────────────────────┘
                            │ 1 : N
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     PROJECT                             │
│  (Brand Profile, Competitor Set, Tracked Prompts, Ads)  │
└─────────────────────────────────────────────────────────┘
```

### Tenancy Isolation Rules:
- **Tenant Root (`Organization`)**: Owns the billing relationship, subscription tier, and primary administrator (`Owner`). All usage counters roll up to the organization.
- **Client Container (`Workspace`)**: Represents an agency's client or a brand division. Members can be granted workspace-level or project-level access.
- **Project Isolation**: Every core entity (`tracked_prompts`, `prompt_runs`, `ad_connections`, `reports`) carries an indexed `organization_id` foreign key.
- **Enforcement Mechanism**: Every database query in route handlers and services explicitly includes `WHERE organization_id = :currentOrgId`. PostgreSQL RLS acts as a hardware-level safety net to prevent cross-tenant data leaks.

---

## 4. Request-Response Lifecycle & Authentication Flow

```
User Browser
    │
    │ 1. HTTP Request (with Supabase Auth Cookie)
    ▼
Next.js Middleware (`middleware.ts`)
    │
    │ 2. Extracts JWT, validates token with Supabase Auth
    │ 3. Attaches verified user context or redirects unauthenticated users
    ▼
Next.js Route Handler / Server Action
    │
    │ 4. Zod Schema Validation (Sanitizes inputs, rejects malformed payloads)
    │ 5. Tenant Context Resolution (`resolveTenantContext(req)`)
    │ 6. RBAC Permission Check (`assertPermission(userRole, requiredScope)`)
    ▼
Domain Service Execution
    │
    │ 7. Evaluates business rules & checks usage quotas
    │ 8. Executes typed database query via Prisma Client / Supabase RLS
    │ 9. Dispatches async job to BullMQ if operation is long-running
    ▼
JSON Response / React RSC Stream
    │
    │ 10. Formats response, applies security headers, returns HTTP 200/201
    ▼
User Browser
```

---

## 5. Asynchronous Job & Worker Architecture

To guarantee predictable HTTP response times and isolate external API failures, all external network interactions run in a dedicated Node.js worker process.

### 5.1 BullMQ Queue Definitions

| Queue Identifier | Job Types | Concurrency | Backoff & Retry Policy |
| :--- | :--- | :--- | :--- |
| `visnora:prompt-runs` | Single prompt execution, batch scheduled run | 5 concurrent workers | Exponential backoff (initial: 3s, attempts: 4). Dead letter on 4th fail. |
| `visnora:ad-sync` | Google Ads daily sync, Meta campaign sync | 2 concurrent workers | Fixed backoff (60s, attempts: 3). Alert on final failure. |
| `visnora:report-export` | CSV export compile, PDF render & upload | 3 concurrent workers | Linear backoff (5s, attempts: 2). |
| `visnora:webhooks` | Razorpay payment events, partner notifications | 10 concurrent workers | Exponential backoff (initial: 2s, attempts: 5). Strict idempotency. |

### 5.2 Worker Execution Lifecycle (Prompt Runner Example)
1. **Job Arrival**: Worker consumes job payload `{ promptRunId, organizationId, provider, model, promptText, locale }`.
2. **Status Update**: Updates `prompt_runs` table in PostgreSQL to `status = 'running'` and records `started_at`.
3. **Provider Invocation**: Adapter executes the API call with timeout (max 45 seconds).
4. **Raw Ingestion**: Captures complete response JSON into `ai_responses` table.
5. **Entity Extraction**: Runs deterministic brand mention detection and parses citation URLs.
6. **Aggregate Recalculation**: Triggers incremental aggregation for project's rolling metrics.
7. **Completion**: Updates `prompt_runs` to `status = 'completed'` and logs token cost and latency.

---

## 6. Caching Strategy & Boundaries

Visnora enforces clear caching rules to balance performance with data consistency:

```
┌────────────────────────────────────────────────────────┐
│                    CACHING BOUNDARIES                  │
├─────────────────────────┬──────────────────────────────┤
│ Cacheable Layer         │ Strictly Uncacheable Layer   │
├─────────────────────────┼──────────────────────────────┤
│ • Precomputed SOV & OMR │ • Subscription Entitlements  │
│   aggregates (TTL: 1h)  │   and Active Quota Meters    │
│ • Public marketing pages│ • RBAC Role Checks & Tenant  │
│ • Static UI components  │   Membership Lookups         │
│ • Provider pricing meta │ • Raw Integration Tokens &   │
│                         │   Decrypted Credentials      │
└─────────────────────────┴──────────────────────────────┘
```

- **Redis Cache**: Used exclusively for ephemeral rate limiting counters, BullMQ state, and aggregate cache keys (`cache:org:<id>:project:<id>:trends:<date>`).
- **Next.js `unstable_cache`**: Applied solely to public marketing routes and static documentation.

---

## 7. Frontend State Management & Component Architecture

Visnora uses **React 19** within Next.js App Router:
- **Server Components (RSC)**: Serve as the primary data fetching layer. Data is fetched directly on the server next to the database, eliminating client-side loading waterfalls.
- **Client Components (`'use client'`)**: Restricted strictly to interactive controls: date range selectors, filter dropdowns, modal dialogs, and Recharts visualization wrappers.
- **Form Mutations**: Powered by React Server Actions with `useActionState` and Zod validation, ensuring graceful error handling and zero client bundle bloat.

---

## 8. Observability & Telemetry Architecture

1. **Structured JSON Logging**: Every log entry includes `timestamp`, `level`, `trace_id`, `organization_id`, `service`, and `message`.
2. **Request Tracing**: A unique `x-visnora-trace-id` header is attached at the Next.js middleware and propagated through domain services to background worker jobs.
3. **Audit Trails**: Security and billing modifications generate immutable records in the `audit_logs` table.

---

## 9. Milestone M1 SaaS Foundation Implementation Architecture

### 9.1 Pure Light Theme Design System
Visnora implements a strict, professional Light Theme:
- Background: `#F8FAFC` (Slate-50)
- Surfaces / Cards: `#FFFFFF` (Pure White)
- Primary Typography: `#172033` (Slate-900 / High Contrast)
- Muted Typography: `#64748B` (Slate-500)
- Brand Primary: `#2563EB` (Blue-600)
- Surface Borders: `#E2E8F0` (Slate-200)

### 9.2 Next.js 15 App Router & Supabase SSR Auth
- In Next.js 15, `cookies()` is an asynchronous Promise API. All server components and route handlers `await cookies()`.
- Supabase SSR `@supabase/ssr` manages cookie-based sessions across server components, route handlers, and client components.
- Route protection middleware (`apps/web/middleware.ts`) refreshes active sessions and redirects unauthenticated requests on protected routes (`/dashboard`, `/workspaces`, `/projects`, `/team`, `/settings`) to `/login`.

### 9.3 Tenancy Resolution & Hierarchy
- **Organization Switcher**: Updates `visnora_active_org` cookie on the client and triggers server layout re-resolution.
- **Transactional Provisioning**: `createOrganizationWithDefaults` creates Organization, Owner Membership, Default Workspace, and Primary Brand Project atomically within a Prisma `$transaction`.
- **RBAC Matrix**: `ROLE_HIERARCHY` maps `OWNER: 4`, `ADMIN: 3`, `MEMBER: 2`, `ANALYST: 2`, `VIEWER: 1`. Domain services verify permissions via `assertPermission(userRole, requiredRole)`.
- **Tokenized Invitations**: Secure 64-character hex tokens generated with Node `crypto.randomBytes(32)` expiring in 7 days. Public acceptance route at `/invite/[token]` provides instant onboarding.

---

## 10. Cross-Reference Navigation
- **Product Requirements**: [PRD.md](file:///D:/react-native/VISNORA/docs/PRD.md)
- **Technical Blueprint**: [TECHNICAL_BLUEPRINT.md](file:///D:/react-native/VISNORA/docs/TECHNICAL_BLUEPRINT.md)
- **Database Schema**: [DATABASE_DESIGN.md](file:///D:/react-native/VISNORA/docs/DATABASE_DESIGN.md)
- **API Contracts**: [API_CONTRACT.md](file:///D:/react-native/VISNORA/docs/API_CONTRACT.md)
- **Security Architecture**: [SECURITY.md](file:///D:/react-native/VISNORA/docs/SECURITY.md)
- **Data Methodology**: [DATA_METHODOLOGY.md](file:///D:/react-native/VISNORA/docs/DATA_METHODOLOGY.md)
- **Development Roadmap**: [ROADMAP.md](file:///D:/react-native/VISNORA/docs/ROADMAP.md)
- **Integration Feasibility**: [INTEGRATIONS.md](file:///D:/react-native/VISNORA/docs/INTEGRATIONS.md)
- **Development Guidelines**: [DEVELOPMENT_GUIDELINES.md](file:///D:/react-native/VISNORA/docs/DEVELOPMENT_GUIDELINES.md)

