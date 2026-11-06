# Visnora — Master Technical Blueprint

**Document Version:** 1.0  
**Baseline Date:** 4 November 2026  
**Document Stage:** Technical Specification & System Design Baseline  
**System Architecture:** Modular Monolith (Next.js + PostgreSQL + Worker Queue)  
**Document Owner:** Technical Lead & System Architect  
**Repository Context:** `D:\react-native\VISNORA`  

---

## 1. Technical Vision & Architectural Decisions

Visnora is engineered as a commercial, multi-tenant SaaS application tailored for operational simplicity, extreme data integrity, and cost sustainability. Given the solo-founder, low-budget constraint (₹0–₹10,000 initial budget envelope), the technical strategy deliberately avoids premature microservices, Kubernetes clusters, or distributed event buses.

Instead, Visnora adopts a **Modular Monolith** architecture:
- A single Next.js application powering both server-rendered UI and secure API route handlers.
- Decoupled domain packages (`domain/`, `integrations/`, `jobs/`, `database/`) maintaining strict boundary encapsulation.
- An asynchronous BullMQ worker process handling long-running LLM queries, data scraping/APIs, and metric aggregations without stalling HTTP request threads.
- PostgreSQL as the single source of truth, fortified with Row Level Security (RLS) for tenant isolation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VISNORA SYSTEM TOPOLOGY                         │
└────────────────────────────────────────────────────────────────────────┘

    Client Layer             Web & API Layer               Data & Queue Layer
 ┌────────────────┐       ┌───────────────────────┐       ┌───────────────────┐
 │ Next.js Client │  ──>  │ Next.js App Router    │  ──>  │ Supabase Postgres │
 │ (React 19 /    │  <──  │ • Server Components   │  <──  │ • Multi-Tenant DB │
 │  shadcn/ui)    │       │ • Route Handlers      │       │ • Row Level Sec   │
 └────────────────┘       │ • Domain Services     │       └───────────────────┘
                          └──────────┬────────────┘                 ▲
                                     │ Enqueue                      │ Write / Read
                                     ▼                              ▼
                          ┌───────────────────────┐       ┌───────────────────┐
                          │ BullMQ + Redis        │  ──>  │ Worker Process    │
                          │ • prompt-runs         │       │ • LLM Adapters    │
                          │ • ad-sync             │       │ • Mention Parser  │
                          │ • report-gen          │       │ • Aggregates      │
                          └───────────────────────┘       └───────────────────┘
```

---

## 2. Technology Stack & Component Justifications

| Layer | Approved Technology | Technical Justification & Guardrails |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15+ (App Router)** | Full-stack TypeScript framework with React Server Components (RSC) for fast initial rendering, built-in Route Handlers, and SEO optimization for the public marketing shell. |
| **Language** | **TypeScript 5+ (Strict)** | Strict compiler mode (`"strict": true`, `"noImplicitAny": true`). Eliminates runtime null pointer bugs across domain calculations. |
| **Styling & UI** | **Tailwind CSS + shadcn/ui** | Atomic CSS utility system paired with unstyled, accessible Radix UI primitives. Eliminates bloated UI library dependencies and delivers an agency-grade dark-first aesthetic. |
| **Database** | **PostgreSQL 16+ (Supabase)** | Robust relational database. Offers native JSONB storage for raw LLM payloads, powerful foreign key constraints, and Row Level Security for multi-tenant isolation. |
| **Authentication** | **Supabase Auth** | Built-in JWT authentication, email confirmation, secure HTTP-only cookies, password reset, and direct integration with Postgres RLS roles. |
| **ORM / Migrations**| **Prisma ORM** | Type-safe query builder and declarative schema management. Single authority for migrations; maintains database integrity across environments. |
| **Background Queue**| **BullMQ + Redis (Upstash/Self)** | High-throughput Redis-backed message queue. Provides distributed scheduling, concurrency controls, rate limiting, and exponential retries for AI API calls. |
| **File Storage** | **Supabase Storage (S3 API)** | Secure object storage with signed URLs for CSV export artifacts, PDF summaries, and public ad creative snapshots. |
| **Data Viz** | **Recharts** | Declarative React charting library built on SVG. Supports accessible tooltips, responsive viewports, and clean time-series visualization. |
| **AI Adapters** | **OpenAI SDK & Google Gen AI SDK** | Isolated adapter pattern around official provider SDKs. Normalizes output payloads and isolates upstream breaking changes. |
| **Payment Gateway** | **Razorpay Node SDK** | Primary payment gateway for Indian and international SaaS transactions. Native support for UPI, Indian credit/debit cards, subscriptions, and signed webhook validation. |
| **Version Control** | **GitHub** | Source repository, issue tracking, and GitHub Actions CI for linting, type-checking, and test automation. |

---

## 3. Modular Monolith Architecture & Repository Structure

To maintain separation of concerns while keeping operations unified, Visnora follows a structured codebase layout:

```
VISNORA/
├── apps/
│   └── web/                                # Primary Next.js Application
│       ├── app/
│       │   ├── (marketing)/                # Public Marketing Pages (Home, Pricing, Legal)
│       │   ├── (auth)/                     # Authentication Routes (Login, Signup, Verify)
│       │   ├── (dashboard)/                # Authenticated App Shell & Module Workspaces
│       │   │   └── [orgSlug]/
│       │   │       └── [workspaceSlug]/
│       │   │           ├── ai-visibility/  # Module A Dashboard & Prompts
│       │   │           ├── ad-intel/       # Module B Competitive & First-Party Ads
│       │   │           ├── chatgpt-ads/    # Module C OpenAI Ads Connector
│       │   │           └── settings/       # Workspace, Team, Billing, Integrations
│       │   ├── api/                        # REST Route Handlers (v1 API & Webhooks)
│       │   └── layout.tsx
│       ├── components/                     # UI Components (atoms, molecules, charts)
│       └── styles/                         # Tailwind CSS configurations
├── packages/
│   ├── database/                           # Database Schema & Migrations
│   │   ├── prisma/
│   │   │   └── schema.prisma               # Prisma Schema & Model Definitions
│   │   └── src/                            # Typed DB Client Singleton
│   ├── domain/                             # Core Business Logic & Domain Services
│   │   ├── organizations/                  # Tenant & Membership Management
│   │   ├── projects/                       # Brand & Competitor Configurations
│   │   ├── ai-visibility/                  # Mention Detectors, SOV Calculators
│   │   ├── ad-intelligence/                # Ad Aggregators & Provenance Normalizers
│   │   ├── billing/                        # Plan Entitlements & Subscription Engine
│   │   └── usage/                          # Quota Metering & Event Ingestion
│   ├── integrations/                       # External Third-Party Adapters
│   │   ├── ai-providers/                   # OpenAI, Google Gemini Adapters
│   │   ├── google-ads/                     # Google Ads API Connector
│   │   ├── meta/                           # Meta Marketing API & Ad Library Connector
│   │   ├── openai-ads/                     # OpenAI Ads Advertiser API Connector
│   │   └── razorpay/                       # Webhook Verification & Checkout
│   ├── jobs/                               # BullMQ Queue Workers & Schedulers
│   │   ├── queues/                         # Queue Definitions & Connection Options
│   │   └── workers/                        # Prompt Runner, Sync Worker, Report Exporter
│   └── shared/                             # Cross-Cutting Utilities
│       ├── types/                          # Shared TypeScript Contracts & DTOs
│       ├── validation/                     # Zod Schemas for Input Validation
│       ├── permissions/                    # RBAC Authorization Rules
│       ├── crypto/                         # AES-256-GCM Credential Encryption
│       └── observability/                  # Structured Logger & Telemetry
├── docs/                                   # Master System Documentation (10 Files)
├── tests/                                  # Test Suites
│   ├── unit/                               # Domain & Algorithm Unit Tests
│   ├── integration/                        # DB & API Integration Tests
│   └── e2e/                                # Playwright User Flow Tests
├── .env.example                            # Sanitized Environment Configuration
├── package.json                            # Workspace Root Scripts & Dependencies
├── tsconfig.json                           # Root TypeScript Configuration
└── README.md                               # Project Overview & Quick Start
```

---

## 4. Core End-to-End Execution Pipelines

### 4.1 Flow 1: AI Visibility Collection & Analytics Pipeline

```
[Cron Scheduler] ──> Checks Due Tracked Prompts in Postgres
      │
      ▼
[Quota Service]  ──> Verifies Plan Prompt Allowance & Idempotency Key
      │ (Allowed)
      ▼
[BullMQ Queue]   ──> Enqueues 'run-prompt' job with {promptId, runConfig}
      │
      ▼
[Worker Process] ──> Selects Provider Adapter (OpenAI / Gemini)
      │
      ├──> Dispatches Request with Locale & Search Parameters
      ├──> Receives Raw JSON Payload (Latency, Tokens, Text, Citations)
      ├──> Saves Immutable Record into `prompt_runs` & `ai_responses`
      ├──> Runs Brand/Competitor Mention Extraction & Span Locator
      ├──> Parses Grounded Web Links into `citations` Table
      ├──> Recomputes Aggregates (`visibility_aggregates`)
      └──> Updates Job Status to 'completed' / Emits Dashboard Event
```

### 4.2 Flow 2: Third-Party Credential Ingestion & Encryption

```
[User Action]    ──> Submits OAuth Callback or API Key in Settings
      │
      ▼
[API Route]      ──> Validates Request via Zod & Checks RBAC (`Admin`+)
      │
      ▼
[Crypto Service] ──> Encrypts Sensitive Token using AES-256-GCM
      │              (Uses APP_ENCRYPTION_KEY + Unique IV per record)
      ▼
[Postgres DB]    ──> Stores Encrypted Ciphertext + Auth Tag in `ad_connections`
      │              (Plaintext secrets are NEVER persisted or logged)
      ▼
[Test Probe]     ──> Executes lightweight probe call to verify token validity
      └──> Updates status to 'connected' or flags error details.
```

### 4.3 Flow 3: Billing & Webhook Idempotency Pipeline

```
[Razorpay]       ──> Sends Signed Webhook Event (e.g., `subscription.charged`)
      │
      ▼
[Route Handler]  ──> Validates HMAC-SHA256 Signature using RAZORPAY_WEBHOOK_SECRET
      │ (Valid)
      ▼
[Postgres DB]    ──> Checks `webhook_events` Table for `event_id` (Idempotency)
      │
      ├──> If already processed: Returns HTTP 200 immediately.
      └──> If new:
            ├── Inserts event into `webhook_events` (status: 'processing')
            ├── Updates `subscriptions` record (status, current_period_end)
            ├── Refreshes `usage_counters` for new billing cycle
            ├── Records payment record in `payments` table
            └── Marks `webhook_events` as 'completed'
```

---

## 5. Non-Functional Specifications & Operational SLOs

### 5.1 Service Level Objectives (SLOs)
- **API Response Latency**: p95 < 300 ms for core dashboard read queries.
- **Worker Execution Latency**: Prompt run jobs processed within 120 seconds of schedule time under standard queue depth.
- **Uptime**: 99.5% availability for Web Application and Database.

### 5.2 Storage & Retention Architecture
- **Raw LLM Payloads**: Stored in PostgreSQL `ai_responses` table for 90 days (Starter) to 365 days (Pro/Agency). Automated cron worker archives older raw payloads while preserving precomputed aggregates.
- **Export Artifacts**: CSV and PDF reports stored in Supabase Storage with expiring presigned URLs (valid for 24 hours).

---

## 6. Development & Deployment Principles
- **No Direct Schema Tweaks**: Every database change requires a Prisma migration committed to Git.
- **Never Log Secrets**: The structured logging module masks strings matching token or authorization patterns.
- **Fail Fast, Fail Clean**: Failed external API calls return typed failure responses rather than generic unhandled exceptions.

---

## 7. Cross-Reference Navigation
- **Product Requirements**: [PRD.md](file:///D:/react-native/VISNORA/docs/PRD.md)
- **System Architecture**: [ARCHITECTURE.md](file:///D:/react-native/VISNORA/docs/ARCHITECTURE.md)
- **Database Schema**: [DATABASE_DESIGN.md](file:///D:/react-native/VISNORA/docs/DATABASE_DESIGN.md)
- **API Specifications**: [API_CONTRACT.md](file:///D:/react-native/VISNORA/docs/API_CONTRACT.md)
- **Security Blueprint**: [SECURITY.md](file:///D:/react-native/VISNORA/docs/SECURITY.md)
- **Data Provenance**: [DATA_METHODOLOGY.md](file:///D:/react-native/VISNORA/docs/DATA_METHODOLOGY.md)
- **Implementation Roadmap**: [ROADMAP.md](file:///D:/react-native/VISNORA/docs/ROADMAP.md)
- **Integration Feasibility**: [INTEGRATIONS.md](file:///D:/react-native/VISNORA/docs/INTEGRATIONS.md)
- **Coding Guidelines**: [DEVELOPMENT_GUIDELINES.md](file:///D:/react-native/VISNORA/docs/DEVELOPMENT_GUIDELINES.md)

