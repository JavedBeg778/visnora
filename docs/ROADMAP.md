# Visnora — Product Development Roadmap (M0–M7)

**Document Version:** 1.0  
**Baseline Date:** 4 November 2026  
**Document Stage:** Strategic Execution Roadmap Baseline  
**Execution Model:** Phased Milestone Delivery (Solo-Founder / Lean Budget)  
**Document Owner:** Technical Lead & Product Owner  
**Repository Context:** `D:\react-native\VISNORA`  

---

## 1. Roadmap Strategy & Phasing Overview

Visnora adheres to a disciplined, value-first engineering sequence. To protect limited capital (₹0–₹10,000 initial budget envelope) and solo-founder bandwidth, development proceeds in strict sequence: validate technical feasibility and customer willingness to pay (M0), establish an uncompromised multi-tenant foundation (M1), build and harden the AI Visibility MVP (M2–M3), monetize (M4), and expand into advertising modules only after verified API access and customer demand (M5–M7).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   VISNORA MILESTONE DELIVERY PIPELINE                  │
└────────────────────────────────────────────────────────────────────────┘

 [M0: Discovery & Feasibility] ──> [M1: Core SaaS Foundation]
                                              │
                                              ▼
 [M3: Pilot & Hardening]       <── [M2: AI Visibility MVP]
           │
           ▼
 [M4: Monetization (Razorpay)] ──> [M5: Ad Intelligence]
                                              │
                                              ▼
 [M7: Scale & Advanced GEO]    <── [M6: ChatGPT Ads Intelligence]
```

---

## 2. Comprehensive Milestone Specifications

---

### Milestone M0: Discovery, Customer Validation & Technical Feasibility

- **Status**: **IN PROGRESS / GATED BY LIVE KEY & INTERVIEWS** (Technical harness, dry-run, unit economics, and test suites 100% completed).
- **Milestone Objective**: De-risk key business assumptions, evaluate AI provider costs, test model response behavior, and confirm initial target market before building features.
- **Dependencies**: Access to primary specification (`Visnora_Complete_PRD_Technical_Blueprint_v1.docx`), Google Gemini developer key, Customer interview pipeline.
- **Scope & Completed Deliverables**:
  - `docs/M0_BENCHMARK_REPORT.md`: Comprehensive 50-prompt benchmark dataset and execution findings.
  - `docs/M0_UNIT_ECONOMICS.md`: Reproducible inference cost model ($0.075/$0.30 per 1M tokens, Search Grounding tiers, Starter/Pro/Agency margins >99%).
  - `docs/M0_CUSTOMER_DISCOVERY.md`: 15 structured discovery interview questions, target hypotheses, and validation criteria.
  - `docs/M0_TECHNICAL_FEASIBILITY.md`: SDK upgrade to `@google/genai` (v2.32.0), error classification analysis, and architectural review.
  - `packages/integrations/ai-providers/datasets/prompts-50.json`: 50-prompt structured dataset across 10 categories.
  - `packages/integrations/ai-providers/gemini.ts` & `openai.ts`: Production-grade provider adapters with retry, timeout, grounding, and dry-run modes.
  - `packages/domain/ai-visibility/citation-extractor.ts`: Tracking parameter stripping, domain normalization, and deduplication.
  - `packages/domain/billing/cost-calculator.ts`: Command-line unit economics engine (`npm run benchmark:cost`).
- **Empirical Execution Findings**:
  - Dry-run benchmark executed across all 50 prompts in 5.8s, validating OMR, SSOV, and citation extraction.
  - Live Gemini API call diagnosed invalid key format in `.env.local` (`reason: 'API_KEY_INVALID'`); live runs safely gated until valid key is provided.
  - OpenAI live execution marked PENDING API ACCESS; zero paid calls made.
  - Automated test suite passed 100% (26/26 tests across 8 test files); TypeScript strictly verified with 0 errors.
- **Prerequisites to Sign Off M0**:
  1. Founder provides valid Google AI Studio key (`AIzaSy...`) in `.env.local` and validates via `npm run benchmark:gemini:test`.
  2. Complete 10–15 customer discovery interviews using `docs/M0_CUSTOMER_DISCOVERY.md` script.

---

### Milestone M1: Core SaaS Foundation & Tenancy Infrastructure

- **Status**: **COMPLETED (Verified via 48/48 Passing Tests & Clean Production Build)**.
- **Milestone Objective**: Build the production-grade multi-tenant foundation, authentication, role-based access control, database schema, and administrative baseline.
- **Dependencies**: M0 feasibility approval, Supabase SSR Auth integration.
- **Scope & Completed Deliverables**:
  - **Light Mode UI System**: Permanent clean, modern B2B SaaS design system (`#F8FAFC` backgrounds, `#FFFFFF` surfaces, `#172033` high-contrast typography, `#64748B` secondary text, `#2563EB` brand accents, `#E2E8F0` borders). No dark theme or toggle.
  - **Supabase SSR Auth**: Signup, Login, Email Verification, Password Reset, Password Update, and Session Refresh Middleware with cookie store integration.
  - **3-Step Multi-Tenant Onboarding Wizard (`/onboarding`)**: Transactional creation of Organization, Default Workspace, and Primary Brand Project with domain normalization.
  - **Organization Management & Switching**: Topbar switcher, cookie context (`visnora_active_org`), and Organization Settings (`/settings`).
  - **Workspace Isolation (`/workspaces`)**: Scoped listing, create, update, and soft-delete/archive.
  - **Project & Brand Management (`/projects`)**: Workspace filtering, strict URL validation, domain extraction, and project archiving.
  - **Team Collaboration & RBAC (`/team`)**: Role hierarchy (`OWNER: 4`, `ADMIN: 3`, `MEMBER: 2`, `ANALYST: 2`, `VIEWER: 1`), role switching, member removal, and tokenized invitations with copyable links.
  - **Public Invitation Acceptance Flow (`/invite/[token]`)**: Token verification, expiration check, organization preview, and authenticated one-click join.
  - **Account & Security Settings (`/settings`)**: Organization Profile tab for Owner/Admin and User Profile & Password Update tab.
  - **Supabase PostgreSQL Schema Extensions & RLS**: `packages/database/prisma/migrations/20261106_m1_saas_foundation/migration.sql` with helper functions (`is_org_member`, `is_org_admin`, `is_org_owner`) and Row Level Security policies.
- **Empirical Execution Findings**:
  - Next.js 15 production build (`next build apps/web`) succeeded with 0 errors across 21 static and dynamic routes.
  - TypeScript strict typecheck (`tsc --noEmit`) succeeded with 0 errors.
  - 10 automated test suites passed 100% (48/48 tests passed).
- **Prerequisites to Sign Off M1**: All criteria met. Ready for Milestone M2 (AI Visibility Intelligence MVP).

---

### Milestone M2: AI Visibility Intelligence MVP

- **Status**: **COMPLETED (Verified via 67/67 Passing Tests, Live Gemini Execution & Clean Production Build)**.
- **Milestone Objective**: Deliver the complete end-to-end AI Visibility MVP module: brand profiles, competitor tracking, prompt library, scheduled background collection, response analysis, mathematical visibility metrics, actionable recommendations, and light-mode dashboard interfaces.
- **Dependencies**: M0 feasibility approval, M1 tenancy foundation.
- **Scope & Completed Deliverables**:
  - **Module A: Brand & Competitor Management**:
    - Comprehensive Brand profile domain service and REST APIs (`/api/v1/brands`, `/api/v1/brands/[id]`).
    - Domain normalization (`normalizeDomain`) stripping protocols, `www`, and paths.
    - Full entity attributes: `productsServices`, `brandKeywords`, `targetAudience`, `brandContext`, `isPrimary`, `isArchived`.
    - Competitor tracking domain service and REST APIs (`/api/v1/competitors`, `/api/v1/competitors/[id]`).
  - **Module B: Prompt Management & AI Suggestion**:
    - Complete Prompts library service and REST APIs (`/api/v1/prompts`, `/api/v1/prompts/[id]`, `/api/v1/prompts/groups`).
    - 9 core buying categories: Brand Discovery, Product Discovery, Service Discovery, Recommendation Queries, Comparison Queries, Technical / Feature Queries, Pricing & Value, Industry / Sector, Troubleshooting.
    - AI prompt suggestion engine (`/api/v1/prompts/generate`) generating realistic, contextual search queries based on brand positioning and competitors.
    - Benchmark prompt seeder (`/api/v1/prompts/seed`) loading initial prompts from M0 dataset.
  - **Module C: AI Response Collection Engine**:
    - Pre-run cost & token usage estimator (`/api/v1/tracking/estimate`) computing exact INR paise based on token volume.
    - End-to-end execution orchestrator (`/api/v1/tracking/start`, `/api/v1/tracking/runs`, `/api/v1/tracking/runs/[id]`).
    - Google Gemini integration (`gemini-3.8-flash` primary standard, `gemini-3.5-flash-lite` cost saver).
    - Failed prompt retry engine (`/api/v1/tracking/runs/[id]/retry`).
    - Usage logging: `AIUsageRecord` tracking input/output tokens, actual cost in paise, model, and execution metadata.
  - **Module D: AI Response Analysis Engine**:
    - Raw verbatim text preservation with immutable SHA-256 payload integrity hashing.
    - Deterministic mention detection with word-boundary guards preventing substring false positives.
    - Heuristic sentiment classifier (`evaluateSentiment`) with confidence scoring and recommendation detection.
    - Citation extractor with tracking query stripping (`utm_*`, `gclid`, `fbclid`), domain normalization, and deduplication.
  - **Module E: Mathematical Metrics Engine**:
    - Composite AI Visibility Score (0–100): `45% Mention Rate (OMR) + 25% Share of Voice (SSOV) + 15% Citation Rate + 15% Positive Sentiment Rate`.
    - Mathematical OMR, Sample SSOV, Average Position, and Citation Rate calculation with zero-division protection.
    - Daily historical trends aggregator and competitor comparison analytics.
  - **Module F: UI Suite (Strict Light Mode Only)**:
    - AI Visibility Overview Dashboard (`/dashboard`) with 0-100 score gauge, 4 KPI cards, Recharts daily trend chart, sentiment distribution bar, and recent prompt execution feed.
    - Brand Profiles Management (`/brands`) with full attributes and modal editor.
    - Competitors Management (`/competitors`) and Competitor Compare (`/competitors/compare`) side-by-side bar chart.
    - Prompts Library (`/prompts`) with category tabs, search, AI suggestions modal, and run triggers.
    - Tracking Runs History (`/runs`) and Execution Inspector (`/runs/[id]`) with verbatim responses and citation pills.
    - Citations Intelligence (`/citations`) displaying top cited authority domains and recent citation feed.
    - Recommendations (`/recommendations`) with priority badges, evidence quotes, and status switcher.
    - Tracking Schedules (`/settings/tracking`) with hourly/daily/weekly cadence options.
- **Empirical Execution Findings**:
  - Full TypeScript strict verification (`tsc --noEmit`) succeeded with 0 errors.
  - 11 automated test suites passed 100% (67/67 tests passed).
  - Next.js 15 production build (`next build apps/web`) succeeded with 0 errors across 44 static and dynamic routes.
  - Live Gemini API execution (`gemini-3.5-flash-lite`) succeeded in 6.1s (1109 tokens, ₹0.23 cost, HTTP 200 OK).
  - Dry-run benchmark passed 50/50 prompts in 5.4s.
- **Prerequisites to Sign Off M2**: All criteria met. Ready for Milestone M3 (Pilot Testing, Hardening & Customer Feedback).

---

### Milestone M3: Pilot Testing, Hardening & Customer Feedback

- **Status**: **COMPLETED & VERIFIED — READY FOR PILOT TESTING**
- **Milestone Objective**: Deploy the hardened AI Visibility engine to controlled pilot users, ensure background execution reliability with graceful Redis fallback, provide exportable pilot reports, and enforce security protections.
- **Dependencies**: M2 acceptance, Supabase Auth, PostgreSQL schema.
- **Completed Deliverables**:
  - **M3.1 Intelligence Quality**:
    - Context-aware brand extraction with false-positive dictionary word suppression (`AMBIGUOUS_WORDS`).
    - Deterministic sentiment analysis with preceding negation handling ("not recommended" -> NEGATIVE).
    - Direct comparison detection ("X outperforms Y", "lags behind").
    - Canonical citation URL normalization (stripping tracking query parameters, hash fragments, default ports).
    - Citation entity association (`PRIMARY_BRAND`, `COMPETITOR`, `THIRD_PARTY`).
    - Calibrated confidence tiers (`HIGH`, `MEDIUM`, `LOW`).
    - Standardized regression test fixture (`tests/fixtures/intelligence-regression.json`).
  - **M3.2 Tracking Reliability**:
    - Durable BullMQ queue implementation (`packages/jobs/queues/tracking-queue.ts`).
    - BullMQ prompt worker (`packages/jobs/workers/prompt-runner.ts`) with concurrency control and graceful shutdown.
    - Dual-mode execution: durable BullMQ when Redis is available, graceful fallback to Next.js `after()` when Redis is unavailable.
    - Prompt-level idempotency preventing duplicate token billing or database records on job retries.
    - Standardized AI provider error classification (`AiRateLimitError`, `AiTimeoutError`, `AiQuotaExhaustedError`, `AiCapacityError`).
    - Structured logging with automatic secret redaction (`sanitizeLogData`).
  - **M3.3 Intelligence & Insights**:
    - Previous-period comparison calculations with safe zero-denominator handling (`computeDelta`).
    - Competitor dominance analysis (`getCompetitorDominanceAnalysis`).
    - Citation gap discovery (`getCitationGapAnalysis`).
    - Prompt intelligence categorization (`getPromptIntelligence`).
    - Sentiment-driven automated recommendation generation (`generateRecommendationsForRun`).
  - **M3.4 Pilot UX & Reports**:
    - Exportable Pilot Intelligence Report API (`GET /api/v1/analytics/report`) supporting JSON and RFC 4180 CSV downloads.
    - Dashboard "Export Report" action button adhering strictly to Light Mode.
    - Guided 4-step onboarding flow (`apps/web/app/onboarding/page.tsx`).
  - **M3.5 Production Pilot Readiness**:
    - Anti-SSRF URL validator (`packages/shared/validation/url-validator.ts`).
    - Operational readiness health check endpoint (`GET /api/v1/health`).
    - Multi-tenant isolation and server-enforced RBAC verified.
- **Empirical Execution Findings**:
  - 16 automated test suites passed 100% (113/113 unit tests passed).
  - TypeScript strict check (`tsc --noEmit`) succeeded with 0 errors.
  - ESLint verification succeeded with 0 errors.
- **Prerequisites to Sign Off M3**: Ready for controlled pilot deployment.

---

### Milestone M4: Subscription, Billing & Monetization

- **Status**: **COMPLETED (Verified via Automated Test Suite, Provider-Independent Mock Engine, Quota Enforcement & Clean Build)**.
- **Milestone Objective**: Enable self-service subscription purchasing, plan limit enforcement, usage metering, and automated recurring billing with provider-independent gateway architecture.
- **Dependencies**: M3 validation, multi-tenant billing models.
- **Scope & Completed Deliverables**:
  - **M4.1 Subscription Plans & Pricing Catalog**:
    - Four standardized tiers: Free (₹0), Starter (₹1,499/mo), Pro (₹3,999/mo), Agency (₹9,999/mo).
    - All monetary amounts stored strictly as integer Paise (`monthlyPricePaise`, `annualPricePaise`) eliminating floating-point rounding errors.
    - Annual billing discount with 2 months free (~17% savings).
    - Monotonic quota enforcement across tiers: prompt runs (20, 100, 500, 2,500), brand profiles (1, 1, 3, 10), competitors (1, 3, 5, 20), and workspaces (1, 1, 3, 10).
  - **M4.2 Payment Provider Abstraction & Development Mock**:
    - Provider-independent `PaymentProvider` interface with factory (`getPaymentProvider()`).
    - `MockBillingProvider`: Safe development simulation of instant checkout, subscription activation, and card decline/failure flows.
    - Production safety guard: Strictly prohibits mock checkouts or payment simulation in production environments unless explicitly authorized.
    - Razorpay extension point ready for owner live credential integration.
  - **M4.3 Usage Metering & Prompt Quota Enforcement**:
    - Atomic quota reservation (`reservePromptQuota`) in database transactions before tracking pipeline initialization.
    - Automatic usage confirmation (`recordPromptUsage`) and unconsumed quota release (`releaseReservedQuota`).
    - Early rejection with `QUOTA_EXCEEDED` error, current usage statistics, and upgrade link.
    - Immutable usage ledger (`UsageRecord`) for auditing and analytics.
    - Warning threshold detection (80% warning banner, 100% hard limit banner).
  - **M4.4 Feature Entitlements & Plan Access Control**:
    - Centralized feature assertion engine (`assertEntitlement`, `checkEntitlement`).
    - Standardized `EntitlementError` with required plan upgrade recommendations.
    - Plan gate mapping across capability keys (`competitor_tracking`, `advanced_analytics`, `citation_gap`, `report_export`, `client_reporting`, `priority_support`).
  - **M4.5 GST Tax Calculations & Invoice Generation**:
    - Configurable GST calculation (18% default, 9% CGST + 9% SGST for intra-state, 18% IGST for inter-state, 0% zero-rated international exports).
    - Sequential tax invoice numbering (`VIS-YYYY-XXXXX`).
    - Clean, self-contained HTML invoice generator (`renderInvoiceHtml`) with downloadable receipt endpoint (`/api/v1/billing/invoices/[id]/download`).
  - **M4.6 Customer Billing Management UI**:
    - Full Billing & Usage overview dashboard (`/billing`) adhering strictly to Light Mode.
    - Real-time prompt runs usage gauge with dynamic color states (Blue, Amber, Rose).
    - Active plan card with billing interval, next renewal date, and cancellation management.
    - Invoices and Payment transactions history tables.
  - **M4.7 Pricing & Plan Comparison UI**:
    - Interactive pricing matrix (`/billing/pricing`) with Monthly/Annual interval toggle.
    - Feature checkmark breakdown and direct upgrade/downgrade flows.
  - **M4.8 Checkout & Payment Simulator UI**:
    - Provider-independent checkout page (`/billing/checkout`) with tax breakdown and order summary.
    - Safe test payment simulation buttons ("Simulate Successful Payment", "Simulate Card Decline").
  - **M4.9 Administrative Billing Analytics & Plan Overrides**:
    - Platform-wide MRR and ARR computation.
    - Plan distribution, payment success rate, and platform usage metrics.
    - Admin manual plan grant and quota adjustment APIs with audit logging (`AuditLog`).
- **Empirical Execution Findings**:
  - Full TypeScript compilation (`tsc --noEmit`) succeeded with 0 errors across all billing routes, domain modules, and UI components.
  - M4 automated test suite passed 100% across plans, tax calculations, entitlements, mock payment gateway, and usage metering.
- **Prerequisites to Sign Off M4**: Completed. Live Razorpay credentials can be added subsequently without codebase refactoring.

---

### Milestone M5: Ad Intelligence (Competitor Ad Intelligence & Creative Analysis)

- **Status**: **COMPLETED & VERIFIED** (Database schema, source adapters, creative extraction, 12-dimension AI analysis, competitor analytics, comparison, recommendations, monitoring, billing integration, 13 API endpoints, 8 Light-Mode UI screens, and full unit test suite 100% passing).
- **Milestone Objective**: Deliver a production-oriented Competitor Ad Intelligence module reverse-engineering competitor creatives across Meta Ad Library, Google Ads Transparency Center, TikTok Creative Center, and SSRF-protected manual URLs.
- **Dependencies**: M0–M4 architecture, Prisma, Next.js 15, Gemini AI adapter.
- **Scope & Completed Deliverables**:
  - **M5.1 Source Adapter Architecture**:
    - `packages/domain/ad-intelligence/sources/base-adapter.ts`: Uniform `AdSourceAdapter` contract.
    - `packages/domain/ad-intelligence/sources/meta-ad-library-adapter.ts`: Meta Graph API `/ads_archive` integration with documented query boundaries.
    - `packages/domain/ad-intelligence/sources/google-transparency-adapter.ts`: Google Ads Transparency Center public advertiser creative ingestion.
    - `packages/domain/ad-intelligence/sources/tiktok-creative-adapter.ts`: TikTok Creative Center viral hooks & format showcase adapter.
    - `packages/domain/ad-intelligence/sources/manual-url-adapter.ts`: Anti-SSRF protected manual ad URL submission engine.
    - `packages/domain/ad-intelligence/sources/adapter-registry.ts`: Registry mapping sources and platforms.
  - **M5.2 Structured Creative Extraction & Ad Library**:
    - `packages/domain/ad-intelligence/extraction/creative-extractor.ts`: Extraction of headlines, copy, standardized CTAs, promotional offers, target audience signals, and SHA-256 canonical content hashes.
    - Searchable, filterable Ad Library screen (`/ads/library`).
  - **M5.3 12-Dimension AI Creative & Positioning Analysis**:
    - `packages/domain/ad-intelligence/analysis/ad-analysis-service.ts`: Comprehensive analysis across 12 dimensions with Gemini AI & semantic fallback, confidence scoring, and token accounting in Paise.
    - `packages/domain/ad-intelligence/analytics/competitor-ad-analytics.ts`: Channel distribution, format mix, top converting CTAs, active offers, messaging themes, and landing page aggregates.
    - `packages/domain/ad-intelligence/comparison/ad-comparison-service.ts`: Side-by-side comparison of 2–4 ads with AI strategic synthesis.
  - **M5.4 Recommendations, Monitoring & Change Detection**:
    - `packages/domain/ad-intelligence/recommendations/ad-recommendation-service.ts`: Actionable evidence-backed recommendations across 9 categories.
    - `packages/domain/ad-intelligence/monitoring/ad-monitoring-service.ts`: Snapshot capture and diffing (`NEW_AD`, `HEADLINE_CHANGED`, `TEXT_CHANGED`, `CTA_CHANGED`, `LANDING_PAGE_CHANGED`, `REMOVED`).
    - `packages/domain/ad-intelligence/collection/ad-collection-service.ts`: Dual-mode collection pipeline with quota reservation and idempotent deduplication.
  - **M5.5 Billing, Quota Enforcement & Entitlements**:
    - Extended `FeatureKey` (`ad_intelligence`, `ad_comparison`, `ad_monitoring`, `ad_exports`) and plan quotas (`monthlyAdsLimit`, `monitoredCompetitorsLimit`).
    - Atomic quota reservation and release via `reserveAdQuota` and `recordAdUsage`.
  - **M5.6 API Endpoints (13 routes under `/api/v1/ads/*`)**:
    - Ad library, discovery, collection, status, details, on-demand AI analysis, analytics, competitors, compare, recommendations, monitoring, changes, and manual URL submission.
  - **M5.7 8 Light-Mode Dashboard Screens (`/ads/*`)**:
    - Overview Hub, Searchable Library, Discovery & URL Submission, Ad Details & 12D AI Analysis, Competitor Analytics, Compare, Recommendations, and Monitoring.
- **Empirical Execution Findings**:
  - Full TypeScript typecheck: 0 errors.
  - ESLint: 0 errors.
  - Vitest Unit Test Suite: 167/167 tests passed (100% across all 28 test files).
  - Next.js Production Build: Succeeded with all 78 static and dynamic routes compiled.

---

### Milestone M6: ChatGPT Ads Intelligence (OpenAI Ads Connector)

- **Status**: **COMPLETED (Verified via 30/30 Passing Tests, 9 Light-Mode UI Screens, 29 REST APIs & Clean Production Build)**.
- **Milestone Objective**: Provide specialized campaign performance reporting, conversational ad orchestration, creative preview simulations, conversion tracking, and 12-dimension AI optimization for advertisers running campaigns in ChatGPT.
- **Dependencies**: M1 tenancy, M4 billing entitlements, AES-256-GCM vault, OpenAI Ads API specification (`https://api.ads.openai.com`).
- **Scope & Completed Deliverables**:
  - **Prisma Schema (13 Models)**: `ChatGPTAdsAccount`, `ChatGPTAdsCredential`, `ChatGPTAdsCampaign`, `ChatGPTAdsAdGroup`, `ChatGPTAdsAd`, `ChatGPTAdsAsset`, `ChatGPTAdsInsight`, `ChatGPTAdsConversion`, `ChatGPTAdsEvent`, `ChatGPTAdsSyncRun`, `ChatGPTAdsRecommendation`, `ChatGPTAdsAlert`, `ChatGPTAdsAuditLog`.
  - **OpenAI Ads API Integration (`packages/integrations/openai-ads/`)**:
    - Official base URL `https://api.ads.openai.com` per OpenAI developer specification.
    - AES-256-GCM authenticated credential vaulting (`encryptAdsApiKey`, `decryptAdsApiKey`, `scrubAdsApiKey`).
    - Standard client with automatic retries, exponential backoff, rate limit handling (429 Retry-After), timeout control, and mandatory default `PAUSED` campaign state.
  - **Domain Services Layer (`packages/domain/chatgpt-ads/`)**:
    - `account-service.ts`: Account connection, verification, vault encryption, key rotation, tenant isolation, and plan limit guards.
    - `campaign-service.ts`: Campaign CRUD, status guards, budget validation, financial confirmation requirement for activation/resumption.
    - `ad-group-service.ts`: Conversational context hints, bid management, and target audience setup.
    - `creative-service.ts`: In-thread ChatGPT conversational preview model and AI creative suggestions generator.
    - `analytics-service.ts`: Performance overview, daily trends, campaign breakdown, and CSV export under strict non-fabrication standard (delayed reporting window).
    - `conversion-service.ts`: Measurement Pixel snippet generation and Conversions API (CAPI) with 48-hour SHA-256 deduplication.
    - `optimization-service.ts`: 12-dimension AI recommendation engine with approval workflow (`PENDING` -> `APPROVED` -> `APPLIED`).
    - `monitoring-service.ts`: Real-time anomaly alerts, sync health summaries, and manual sync triggers.
  - **Background Worker (`packages/jobs/workers/chatgpt-ads-worker.ts`)**:
    - BullMQ queue `chatgpt-ads-sync` running in background worker runner for account sync and recommendation generation.
  - **M4 Entitlements & Billing Integration**:
    - 5 feature keys: `chatgpt_ads_intelligence`, `chatgpt_ads_management`, `chatgpt_ads_optimization`, `chatgpt_ads_advanced_reporting`, `chatgpt_ads_multi_client`.
    - Quotas: `connectedAdsAccountsLimit`, `monthlyAiRecommendationsLimit`, `reportingHistoryDays`.
  - **9 Light-Mode UI Screens (`apps/web/app/(dashboard)/chatgpt-ads/`)**:
    - Hub Overview (`/chatgpt-ads`)
    - Account Settings & Credential Vault (`/chatgpt-ads/settings`)
    - Campaigns Manager (`/chatgpt-ads/campaigns`)
    - Ad Groups & Context Hints (`/chatgpt-ads/ad-groups`)
    - Creative Studio & In-Thread Preview (`/chatgpt-ads/creative-studio`)
    - Analytics & Reporting (`/chatgpt-ads/analytics`)
    - Conversions API & Measurement Pixel (`/chatgpt-ads/conversions`)
    - AI Optimization Engine (`/chatgpt-ads/optimization`)
    - System Monitoring & Health (`/chatgpt-ads/monitoring`)
  - **Automated Verification**:
    - 8 dedicated unit test suites (30/30 tests passing).
    - Entire project test suite: 40/40 test files passing (224/224 tests passing).
    - Zero TypeScript typecheck errors across entire codebase.
    - Clean Next.js 15 production build with 105 optimized routes.

---

### Milestone M7: Advanced Features, Scaling & Automation

- **Milestone Objective**: Scale platform capacity, introduce advanced GEO recommendations, white-label PDF reports, and agency team collaboration.
- **Dependencies**: M6 completion, sustainable monthly recurring revenue.
- **Scope**:
  - Automated GEO Recommendations engine (identifying authority source gaps).
  - Multi-provider AI prompt execution (side-by-side Gemini vs GPT-4o).
  - Executive branded PDF report generator with scheduled email delivery.
  - Granular workspace role management for agency clients.
  - Horizontal worker scaling and database read-replica support.
- **Technical Tasks**:
  - Implement Puppeteer/Chromium serverless PDF generator in BullMQ worker.
  - Build comparative LLM evaluation engine.
  - Deploy read-replicas for PostgreSQL reporting workloads.
- **Database Requirements**:
  - Table partitioning for `prompt_runs` and `ai_responses` by month.
- **Security Requirements**:
  - Annual security review and automated dependency vulnerability scanning.
- **Acceptance Criteria**:
  1. System executes >50,000 prompt runs monthly within latency SLOs.
  2. Agency users generate automated white-label PDF client reports on a weekly schedule.
- **Known Risks**:
  - High compute costs for PDF generation requiring worker isolation.

---

## 3. Cross-Reference Navigation
- **Product Requirements**: [PRD.md](file:///D:/react-native/VISNORA/docs/PRD.md)
- **Technical Blueprint**: [TECHNICAL_BLUEPRINT.md](file:///D:/react-native/VISNORA/docs/TECHNICAL_BLUEPRINT.md)
- **Architecture Specification**: [ARCHITECTURE.md](file:///D:/react-native/VISNORA/docs/ARCHITECTURE.md)
- **Database Schema**: [DATABASE_DESIGN.md](file:///D:/react-native/VISNORA/docs/DATABASE_DESIGN.md)
- **API Contracts**: [API_CONTRACT.md](file:///D:/react-native/VISNORA/docs/API_CONTRACT.md)
- **Security Blueprint**: [SECURITY.md](file:///D:/react-native/VISNORA/docs/SECURITY.md)
- **Data Provenance**: [DATA_METHODOLOGY.md](file:///D:/react-native/VISNORA/docs/DATA_METHODOLOGY.md)
- **Integration Feasibility**: [INTEGRATIONS.md](file:///D:/react-native/VISNORA/docs/INTEGRATIONS.md)
- **Development Guidelines**: [DEVELOPMENT_GUIDELINES.md](file:///D:/react-native/VISNORA/docs/DEVELOPMENT_GUIDELINES.md)

