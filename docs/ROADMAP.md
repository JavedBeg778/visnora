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

- **Milestone Objective**: Deploy the AI Visibility MVP to 5–10 real pilot users, monitor operational stability, harden failure modes, and incorporate feedback.
- **Dependencies**: M2 acceptance, staging/production hosting environment.
- **Scope**:
  - Guided project onboarding flow.
  - Enhanced error handling (graceful displays for failed or partial runs).
  - Cost tracking dashboard in admin console.
  - In-app feedback collection mechanism.
  - UI refinement for mobile/tablet responsive review.
- **Technical Tasks**:
  - Implement Sentry error monitoring and Upstash Redis rate limiters.
  - Add admin telemetry for queue depth and provider API expenditure.
  - Conduct user onboarding sessions with pilot agencies.
- **Database Requirements**:
  - Indexes optimized for high-volume `prompt_runs` queries.
- **Security Requirements**:
  - Penetration testing on all exposed `/api/v1/*` endpoints.
  - Rate limiting active on all public and authenticated routes.
- **Testing Requirements**:
  - Load testing queue throughput with 500 simulated prompt runs.
- **Acceptance Criteria**:
  1. 5–10 pilot users successfully execute recurring prompt monitoring for ≥2 weeks.
  2. Zero unhandled server crashes or cross-tenant leaks.
  3. Documented qualitative feedback confirming report utility.
- **Known Risks**:
  - Pilot users fail to set up prompts without personal founder onboarding.

---

### Milestone M4: Subscription, Billing & Monetization (Razorpay)

- **Milestone Objective**: Enable self-service subscription purchasing, plan limit enforcement, and automated recurring billing.
- **Dependencies**: M3 validation, Razorpay merchant account approval, Indian legal entity setup.
- **Scope**:
  - Plan definitions (Free Trial, Starter, Pro, Agency).
  - Razorpay checkout integration for subscriptions and card/UPI payments.
  - Signed webhook listener with idempotency protection.
  - Real-time usage metering and hard/soft quota enforcement.
  - Customer billing portal (view plan, download invoices, cancel subscription).
- **Technical Tasks**:
  - Implement Razorpay checkout SDK flow in frontend.
  - Author `/api/v1/webhooks/razorpay` handler with HMAC-SHA256 signature verification.
  - Build transactional quota checker in domain service (`assertQuotaAvailable`).
  - Implement automated invoice generation and email dispatch.
- **Database Requirements**:
  - Tables: `subscriptions`, `usage_counters`, `payments`, `webhook_events`.
- **Security Requirements**:
  - Webhook replay attack protection via database transactions.
  - Zero credit card or banking details stored on Visnora servers.
- **Testing Requirements**:
  - Webhook simulation test suite covering `subscription.activated`, `payment.captured`, and `subscription.cancelled`.
  - Quota exhaustion test verifying prompt creation is blocked when limit is reached.
- **Acceptance Criteria**:
  1. End-to-end checkout flow works in Razorpay test mode and verified live mode.
  2. Quotas increment accurately and block over-limit actions with an upgrade modal.
  3. Duplicate webhooks do not create duplicate subscription records.
- **Known Risks**:
  - Razorpay merchant account activation delays.
  - Indian recurring mandate regulations (e-mandate / RBI regulations).

---

### Milestone M5: Ad Intelligence (Own-Account & Permitted Public Creative)

- **Milestone Objective**: Expand into advertising intelligence by integrating first-party connected ad accounts and permitted public creative research.
- **Dependencies**: M4 monetization, Google Ads API / Meta App Review approvals.
- **Scope**:
  - Google Ads OAuth connection and first-party campaign reporting.
  - Meta Marketing API connection for own-account insights.
  - Meta Ad Library integration for permitted public competitor ad research.
  - Unified multi-platform ad dashboard with strict provenance badging.
- **Technical Tasks**:
  - Build OAuth 2.0 connection flows for Google and Meta.
  - Implement AES-256-GCM token encryption and automatic token refresh worker.
  - Develop daily scheduled sync job for campaign spend, impressions, clicks, conversions.
  - Implement public ad creative query interface.
- **Database Requirements**:
  - Tables: `ad_connections`, `ad_accounts`, `ad_campaigns`, `ad_insights`, `public_ad_observations`.
- **Security Requirements**:
  - OAuth state parameter validation to prevent CSRF.
  - Secure credential revocation on user disconnect.
- **Testing Requirements**:
  - Token refresh failure handling and re-authentication alert workflows.
- **Acceptance Criteria**:
  1. A user connects their Google Ads account and views yesterday's spend/conversions.
  2. Public competitor creative search returns active ad copies from Meta Ad Library without misrepresenting private performance metrics.
- **Known Risks**:
  - Meta App Review delays or permission rejections for marketing APIs.

---

### Milestone M6: ChatGPT Ads Intelligence (OpenAI Ads Connector)

- **Milestone Objective**: Provide specialized campaign performance reporting for advertisers running campaigns in ChatGPT.
- **Dependencies**: M5 architecture, OpenAI Ads Advertiser API developer access.
- **Scope**:
  - Customer OpenAI Ads account connection via API key / partner credentials.
  - Campaign, ad group, and creative performance ingestion.
  - Conversion tracking status monitor.
  - ChatGPT Ads reporting dashboard.
- **Technical Tasks**:
  - Author OpenAI Ads API client adapter.
  - Build ingestion pipeline for ad group impressions, clicks, and reported conversions.
  - Implement dashboard components highlighting ChatGPT ad metrics.
- **Database Requirements**:
  - Integration with existing `ad_connections` and `ad_insights` tables.
- **Security Requirements**:
  - Encryption of OpenAI Ads advertiser keys.
- **Testing Requirements**:
  - Integration tests verifying payload normalization against OpenAI Ads schemas.
- **Acceptance Criteria**:
  1. An advertiser connects their ChatGPT ads account and inspects campaign delivery metrics.
  2. Product clearly explains that competitor ChatGPT ads are private and not accessible.
- **Known Risks**:
  - OpenAI Ads API availability restrictions or regional deployment barriers.

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

