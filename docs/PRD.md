# Visnora — Product Requirements Document (PRD)

**Document Version:** 1.0  
**Baseline Date:** 4 November 2026  
**Document Stage:** Concept and Feasibility Planning; Baseline Source of Truth  
**Product Category:** AI-Powered Marketing & Competitive Intelligence SaaS  
**Document Owner:** Founder / Product Owner  
**Repository Context:** `D:\react-native\VISNORA`  

---

## Document Control & Governance

| Field | Approved Specification |
| :--- | :--- |
| **Product Name** | Visnora |
| **Document Type** | Master Product Requirements Document (PRD) |
| **Current Baseline** | Version 1.0 (4 November 2026) |
| **Stage & Authorization** | Approved planning baseline. No unverified production features authorized. |
| **Implementation Environment** | Google Antigravity, GitHub, Node.js (v22+), Next.js App Router |
| **Target Budget Envelope** | ₹0–₹10,000 planning/bootstrap budget; pay-as-you-go API consumption strictly monitored |
| **Commercial Target** | ₹1,00,000 Monthly Recurring Revenue (MRR) gross target |
| **Operational Reality** | Solo-founder full-stack architecture; requires modular monolith, high automation, zero unnecessary infra |

> [!IMPORTANT]
> **Status Note & Truth-in-Specification**: This document is the primary product specification and source of truth for Visnora. Provider access, commercial redistribution rights, pricing tiers, country availability, API quotas, and terms of service must be formally verified before code commitment. Claims of competitor private ad metrics or global AI answer market share are strictly prohibited.

---

## 1. Executive Summary & Product Vision

Visnora is a multi-tenant Software-as-a-Service (SaaS) platform engineered for digital marketing agencies, SEO/GEO (Generative Engine Optimization) consultants, brand marketers, and business owners. It empowers businesses to monitor their brand visibility in AI-generated answers and analyze competitive and first-party advertising signals through legally permitted and authorized interfaces.

The long-term product vision integrates three specialized intelligence modules sharing a unified SaaS core:
1. **Module A — AI Visibility Intelligence**: Measures how brand entities appear across AI answer engines (OpenAI ChatGPT, Google Gemini) based on structured, repeatable prompt runs with verifiable citations.
2. **Module B — Ad Intelligence**: Bridges customer-authorized first-party ad accounts (Google Ads, Meta Ads) with legally accessible, permitted public ad creative research (e.g., Meta Ad Library, Google Ads Transparency Center).
3. **Module C — ChatGPT Ads Intelligence**: Connects an advertiser's authorized OpenAI Ads account to analyze their own campaign metrics, ad delivery, and conversion performance inside ChatGPT.

### Recommended Phased Strategy
- **Phase 1 (MVP)**: Launch a disciplined, reliable AI Visibility MVP for a single brand/project, validating paid demand with 5–10 pilot customers.
- **Phase 2**: Validate connected first-party ad account reporting.
- **Phase 3**: Integrate ChatGPT Ads authorized advertiser reporting as official partner access expands.

---

## 2. Product Positioning & Value Proposition

### 2.1 Positioning Statement
> *"Visnora helps businesses and agencies measure how their brands appear across AI answer experiences, understand competitive marketing signals, and turn trustworthy data into practical actions."*

### 2.2 Core Value Pillars
- **Radical Provenance & Transparency**: Distinguish observed, sampled, estimated, and platform-reported metrics. No "black box" claims.
- **Evidence-Backed Tracking**: Every AI visibility score links directly to the raw response snapshot, timestamp, model version, and exact textual evidence spans.
- **Agency-Ready Multi-Tenancy**: Built from day one with organizational boundaries, workspace isolation, client project segregation, and role-based permissions.

### 2.3 Explicit Non-Goals (What Visnora Will NOT Do)
1. **No Accessing Private ChatGPT Chats**: Never attempt to access consumer chat histories or private conversations.
2. **No Fabricated Global Search Volume**: Never claim to report total global AI search impressions or consumer search volume from small prompt samples.
3. **No Espionage on Competitor Private Ad Accounts**: Never promise or simulate competitor private spend, impressions, clicks, or ROAS without authorized API access.
4. **No Bypassing Anti-Bot or Terms**: Never bypass Cloudflare, CAPTCHAs, paywalls, or platform Terms of Service.
5. **No Ranking Guarantees**: Never guarantee that GEO recommendations will cause an AI engine to recommend a brand.
6. **No Autonomous Ad Buying in Early Milestones**: Visnora is an intelligence and reporting platform, not an automated programmatic bidding bot.

---

## 3. Goals, Success Metrics & Constraints

### 3.1 Business Goals
- Validate genuine recurring demand with **5–10 paying pilot customers** before expanding scope.
- Maintain sustainable gross margins (>75%) by enforcing per-plan prompt execution quotas.
- Build toward a gross recurring revenue target of **₹1,00,000 MRR**.

### 3.2 Product Performance Indicators

| Metric Category | Initial Target Indicator | Verification Method |
| :--- | :--- | :--- |
| **Activation** | User creates organization, brand profile, and runs initial prompt set within 15 minutes. | Telemetry on onboarding funnel completion. |
| **Time to Value** | First evidence-backed AI visibility report available within one collection cycle (<3 minutes). | Job run latency logs. |
| **Reliability** | Scheduled collection runs achieve ≥99% success rate; transient errors retry automatically with exponential backoff. | BullMQ dead-letter queue metrics. |
| **Data Trust** | 100% of reported metrics display explicit provenance tooltips (Source, Timestamp, Sample Size, Formula). | UI consistency automated tests. |
| **Retention** | Pilot customers review dashboard trends or export recurring CSV/PDF reports at least monthly. | Monthly Active Workspace (MAW) tracking. |
| **Unit Economics** | Raw LLM API + compute cost per tracked prompt run remains under ₹0.15–₹0.40 depending on model. | Billing reconciliation vs provider logs. |

### 3.3 Operating Constraints
- **Solo-Founder Architecture**: Designed for single-operator maintainability. Modular monolith with Next.js App Router, Supabase PostgreSQL, and background worker queues.
- **Capital Constraints**: Strict bootstrap budget (₹0–₹10,000 initial cash outlay). Lean cloud tiers (Supabase, Upstash Redis/BullMQ, Vercel/Railway).
- **Compliance & Privacy**: Full compliance with DPDP Act (India), GDPR, CCPA, and AI provider developer terms.

---

## 4. Target Personas & Jobs-to-be-Done (JTBD)

### 4.1 Personas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          VISNORA USER PERSONAS                          │
├─────────────────────┬─────────────────────┬─────────────────────────────┤
│ Digital Agency      │ SEO & GEO           │ In-House Brand Marketer     │
│ Owner               │ Consultant          │ & Growth Lead               │
│ • Multi-client      │ • Prompt-level      │ • Share of voice trends     │
│   workspace         │   citations         │ • Executive visual reports  │
│ • White-label CSV   │ • Model comparison  │ • Competitor positioning    │
│ • Proof-of-work     │ • Optimization tips │ • Budget justification      │
├─────────────────────┼─────────────────────┴─────────────────────────────┤
│ SMB Founder         │ Paid Media Manager                                │
│ • Simple brand check│ • Own-account ad performance                      │
│ • Low time overhead │ • Permitted competitor creative research          │
└─────────────────────┴───────────────────────────────────────────────────┘
```

### 4.2 Core Jobs-to-be-Done
- **JTBD-1**: *When prospective buyers query generative AI engines for category recommendations, I want to know if my brand is surfaced and which competitors are favored, so that I can optimize my digital presence.*
- **JTBD-2**: *When our AI visibility drops, I want to inspect the exact prompt, answer text, citations, and model version, so that I can diagnose whether algorithmic shifts or competitor press caused the change.*
- **JTBD-3**: *When planning digital ad campaigns, I want to view verified competitor ad creatives from official transparency registries alongside our own first-party campaign ROAS, so that our creative strategy is competitive.*
- **JTBD-4**: *When managing 10 client brands as an agency, I want isolated workspaces, custom prompt schedules, and branded exports, so that I can deliver recurring intelligence without cross-client data leaks.*

---

## 5. Product Scope & Module Strategy

### 5.1 Shared SaaS Foundation (Core Platform)
The SaaS foundation provides the operational backbone shared across all modules:
- **Public Surface**: Landing page, product tours, interactive sample report, transparent pricing calculator, FAQ, legal policies (Privacy Policy, Terms of Service, Cookie Policy).
- **Identity & Access**: Email/password authentication, magic link, email verification, password reset, session management via Supabase Auth.
- **Multi-Tenancy Hierarchy**: `Organization` (billing tenant) -> `Workspace` (client container) -> `Project` (brand/product focus).
- **Role-Based Access Control (RBAC)**: Super Admin, Organization Owner, Workspace Admin, Analyst, Viewer.
- **Project Configuration**: Brand canonical name, verified domain, aliases, industry, target country/locale, language, competitor entities, and topic tags.
- **Subscription & Quota Engine**: Plan definitions, cycle allowances, real-time usage meters, hard/soft quota caps, Razorpay billing integration.
- **Security & Secrets Vault**: AES-256-GCM application-level encryption for customer ad credentials and API keys.
- **System Observability**: Structured JSON logging, audit logs, background job monitor, webhook delivery logs.

---

### 5.2 Module A — AI Visibility Intelligence

#### 5.2.1 Core Purpose
Executes recurring, parameterized prompt suites across AI answer providers (OpenAI GPT models, Google Gemini), captures verbatim responses, extracts brand/competitor presence with exact textual evidence spans, and calculates statistical sample metrics.

#### 5.2.2 Feature Scope (MVP vs Later)

| Feature | Scope | Acceptance Criteria |
| :--- | :--- | :--- |
| **Tracked Prompt Library** | **MVP** | Create, edit, tag, pause, and categorize prompts by buying stage (Awareness, Consideration, Decision). |
| **Provider/Locale Targeting** | **MVP** | Configure provider (OpenAI, Gemini), model identifier, geography/locale, and query language. |
| **Scheduled Execution** | **MVP** | Cron-based worker execution with rate limiting, quota checks, and safe exponential retries. |
| **Raw Response Storage** | **MVP** | Immutable storage of raw API JSON payload, latency, token count, and run status. |
| **Brand Mention Extraction** | **MVP** | Normalized exact-string & alias matching with character offset spans and confidence scores. |
| **Citations Extraction** | **MVP** | Parse returned web links/citations from Gemini Grounding / OpenAI Web Search when present. |
| **Sample Share of Voice** | **MVP** | Calculate SOV strictly across collected project prompt samples. Explicit denominator displayed. |
| **Mention Sentiment & Context**| **Later** | Optional secondary LLM classification of brand sentiment (Positive/Neutral/Negative) with excerpt. |
| **Historical Trends** | **MVP** | Like-for-like time series comparisons isolating prompt set or model changes. |
| **GEO Recommendations** | **Later** | Automated recommendations identifying missing citations and competitor authority sources. |
| **Data Exports** | **MVP CSV / Later PDF**| Export full run evidence, mention logs, and aggregate metrics to CSV. |

#### 5.2.3 Formal Metric Formulas & Rules
1. **Observed Mention Rate ($\text{OMR}$)**:
   $$\text{OMR} = \frac{\text{Successful responses containing detected brand mention}}{\text{Total successful responses in the selected sample period}} \times 100$$
2. **Sample Share of Voice ($\text{SSOV}$)**:
   $$\text{SSOV} = \frac{\text{Count of mentions for Brand } X}{\sum \text{Count of all tracked brand and competitor mentions}} \times 100$$
   *Requirement*: The UI must explicitly present the denominator (e.g., "based on 42 mentions across 30 prompt runs").
3. **Prompt Coverage ($\text{PC}$)**:
   $$\text{PC} = \frac{\text{Active prompts with } \ge 1 \text{ successful run in period}}{\text{Total active tracked prompts}} \times 100$$
4. **Average Mention Position ($\text{AMP}$)**:
   Calculated only when the response is an ordered list (`1.`, `2.`, `3.`). If unstructured prose, displayed as `"Unstructured / Not Measurable"`.

---

### 5.3 Module B — Ad Intelligence

#### 5.3.1 Core Purpose
Provides a dual-pane advertising intelligence environment:
1. **First-Party Connected Accounts**: Authorize customer Google Ads and Meta Ads accounts to ingest platform-reported campaign performance.
2. **Public Ad Creative Research**: Query official public repositories (Meta Ad Library, Google Ads Transparency Center) for competitive creative insights without misrepresenting public data as private analytics.

#### 5.3.2 Data Classification & Scope Rules

| Capability | Data Classification | Provenance & Rules |
| :--- | :--- | :--- |
| **Google Ads Own-Account** | First-Party / Platform-Reported | Ingest impressions, clicks, cost, conversions via official Google Ads API OAuth. Strictly segregated to owning tenant. |
| **Meta Ads Own-Account** | First-Party / Platform-Reported | Ingest campaign insights via Meta Marketing Graph API following App Review approval. |
| **Public Creative Research** | Public Observed | Query official Meta Ad Library API for active competitor ads. Store creative text, media link, first/last seen. |
| **Transparency Center Research**| Public Observed | Snapshot public Google Ads Transparency data where terms allow. Never synthesize private spend. |
| **Third-Party Keyword Estimates**| Third-Party Estimated | Display third-party licensed keyword volume data with explicit provider and date attribution. |
| **Cross-Platform Analytics** | Mixed Provenance | Present side-by-side without merging incompatible attribution models. |

---

### 5.4 Module C — ChatGPT Ads Intelligence

#### 5.4.1 Core Purpose
Supports advertisers participating in the OpenAI ChatGPT Ads ecosystem by connecting their authorized advertiser account via official OpenAI Ads APIs.

#### 5.4.2 Product Boundaries & Strict Feasibility
- **Authorized First-Party Campaigns**: Connect customer OpenAI Ads account via API keys/partner OAuth to report impressions, clicks, ad group spend, and conversion events.
- **Strict Boundary Against Competitor Ads**: OpenAI Ads APIs do **not** provide a global public competitor feed. Visnora **will not promise** competitor ChatGPT ad tracking until an official public endpoint is launched and legally verified.
- **Attribution Guardrail**: Visnora will not guess or infer which specific consumer prompt triggered a ChatGPT ad.

---

## 6. Functional Requirements Matrix (FR-001 to FR-020)

| ID | Module / Area | Specific Functional Requirement |
| :--- | :--- | :--- |
| **FR-001** | Identity & Auth | Secure user registration, email verification, login, password recovery, session renewal via Supabase Auth. |
| **FR-002** | Tenant Isolation | Enforce `organization_id` tenancy checks on all server operations; PostgreSQL Row Level Security (RLS) as defense in depth. |
| **FR-003** | Workspace Lifecycle | Support creation, naming, settings update, and deletion of workspaces and projects within an organization. |
| **FR-004** | Role Enforcement | Enforce RBAC permissions (Owner, Admin, Analyst, Viewer) on every API route handler and server action. |
| **FR-005** | Project Management | Maintain brand profile, industry classification, website URL, target country, and default query language. |
| **FR-006** | Brand & Competitors | Manage canonical brand names, search aliases, domain names, and competitor definitions per project. |
| **FR-007** | Prompt Management | Create, edit, pause, tag, and schedule tracked prompts with provider, model, and locale parameters. |
| **FR-008** | Queue & Collection | Dispatch background prompt runs via BullMQ; record latency, retry count, status (`queued`, `running`, `completed`, `failed`). |
| **FR-009** | Raw Evidence Archive | Store raw provider JSON responses immutably with cryptographic hash to guarantee historical audit integrity. |
| **FR-010** | Metric Calculation | Compute Observed Mention Rate, Sample SOV, and Prompt Coverage strictly based on successful, like-for-like runs. |
| **FR-011** | Ad Account Auth | Securely connect customer Google Ads and Meta accounts via OAuth 2.0; store refresh tokens encrypted at rest. |
| **FR-012** | Data Provenance | Tag every data point with `data_class` (`actual`, `observed`, `sampled`, `estimated`, `platform_reported`), timestamp, and source. |
| **FR-013** | Report Generation | Export project prompt runs, citations, and metrics to CSV format; include methodology header in every file. |
| **FR-014** | Subscriptions | Sync subscription plans, cycle dates, and payment status via Razorpay webhook listeners. |
| **FR-015** | Quota Enforcement | Check usage allowance before scheduling prompt runs or sync jobs; provide clear upgrade path when exhausted. |
| **FR-016** | Platform Admin | Provide super-admin console for inspecting tenant health, job queues, provider failure rates, and system flags. |
| **FR-017** | Notifications | Deliver in-app and email alerts for failed collection jobs, exhausted quotas, and integration disconnections. |
| **FR-018** | Privacy & Deletion | Provide self-service workspace and project data deletion; purge raw payloads and credentials in compliance with DPDP/GDPR. |
| **FR-019** | Audit Logging | Maintain append-only audit trail for team invitations, role modifications, credential connections, and deletions. |
| **FR-020** | Health Observability | Expose metrics for queue backlog, provider response latency, error breakdown, and API consumption costs. |

---

## 7. Non-Functional Requirements (NFRs)

### 7.1 Performance
- Authenticated dashboard page load: **p75 < 2.5 seconds** (excluding external API collection latency).
- Prompt parsing and mention extraction pipeline: **< 500 ms per response**.
- Database query execution for dashboard aggregates: **< 150 ms**.

### 7.2 Availability & Fault Tolerance
- App Availability: **99.5% monthly uptime target**.
- Third-Party Isolation: Outages at OpenAI or Google Gemini must never crash the Visnora dashboard or prevent inspection of existing historical data.
- Job Resilience: Background workers must handle rate limits (HTTP 429) using exponential backoff with jitter and a Dead Letter Queue (DLQ).

### 7.3 Accessibility & Design
- Desktop-first responsive layout optimized for 1280px+ desktop workflows, with tablet and mobile responsiveness for reporting and monitoring.
- Target **WCAG 2.2 Level AA** compliance for contrast ratios, focus rings, keyboard navigation, and screen reader labels.

### 7.4 Data Integrity & Auditing
- Store all monetary values as integer minor units (paise/cents) with ISO currency codes.
- Store all timestamps in UTC (`TIMESTAMPTZ`); preserve original ad account timezones for reporting conversion.

---

## 8. User Roles & Permission Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       VISNORA ACCESS CONTROL MATRIX                         │
├────────────────────────────┬─────────┬─────────┬─────────┬─────────┬────────┤
│ Operation                  │ Super   │ Org     │ Admin   │ Analyst │ Viewer │
│                            │ Admin   │ Owner   │         │         │        │
├────────────────────────────┼─────────┼─────────┼─────────┼─────────┼────────┤
│ Manage Platform Settings   │   YES   │   NO    │   NO    │   NO    │   NO   │
│ Manage Org Billing & Plans │   YES   │   YES   │   NO    │   NO    │   NO   │
│ Invite / Remove Org Members│   NO    │   YES   │   YES   │   NO    │   NO   │
│ Create / Delete Workspaces │   NO    │   YES   │   YES   │   NO    │   NO   │
│ Create / Configure Projects│   NO    │   YES   │   YES   │   NO    │   NO   │
│ Manage Tracked Prompts     │   NO    │   YES   │   YES   │   YES   │   NO   │
│ Trigger Manual Prompt Run  │   NO    │   YES   │   YES   │   YES   │   NO   │
│ Connect / Revoke Ad Account│   NO    │   YES   │   YES   │   NO    │   NO   │
│ View Reports & Analytics   │   NO    │   YES   │   YES   │   YES   │   YES  │
│ Export CSV Data            │   NO    │   YES   │   YES   │   YES   │   YES  │
│ Delete Organization Data   │   YES   │   YES   │   NO    │   NO    │   NO   │
└────────────────────────────┴─────────┴─────────┴─────────┴─────────┴────────┘
```

---

## 9. Pricing, Packaging & Usage Metering Model

| Plan Tier | Target Segment | Proposed Entitlements (Validation Baseline) | Metered Units |
| :--- | :--- | :--- | :--- |
| **Free / Trial** | Evaluation / New User | 1 Project, 5 Tracked Prompts, Weekly Cadence, 30 Days History, CSV Export | Prompts, Runs |
| **Starter** | Solo Brand / SMB | 1 Workspace, 2 Projects, 25 Prompts, Daily Cadence, 90 Days History, CSV Export | Prompts, Runs |
| **Pro** | Growing Brand / Consultant | 3 Workspaces, 10 Projects, 100 Prompts, Daily Cadence, 1 Year History, CSV/PDF | Prompts, Runs, Ad Syncs |
| **Agency** | Digital Marketing Agency | 10 Workspaces, 50 Projects, 500 Prompts, Flexible Cadence, Multi-seat, White-label CSV | Prompts, Runs, Seats, Ad Syncs |
| **Enterprise** | Large Organization | Custom Quotas, Dedicated DB, Custom SLA, SSO / SAML, Audit Logs Export | Custom SLA |

---

## 10. Unresolved Decisions & Strategic Open Questions

| Decision Identifier | Item Description | Recommended Working Baseline | Current Status |
| :--- | :--- | :--- | :--- |
| **DEC-001** | Primary Launch Segment | India-based SEO/GEO consultants & digital marketing agencies | Proposed; Requires Pilot Validation |
| **DEC-002** | First MVP Provider | Google Gemini API (cost efficiency & grounding citations) vs OpenAI | Proposed; To benchmark in M0 |
| **DEC-003** | Ad Intelligence First Source | Meta Ad Library API (public research) vs Google Ads (own-account OAuth) | Undecided; Dependent on Developer Approval |
| **DEC-004** | Pricing Strategy | Fixed monthly subscription in INR with usage overage protection | Undecided; Requires Unit Cost Modeling |
| **DEC-005** | Production Hosting Setup | Supabase Managed + Railway / Vercel | Undecided; Target bootstrap infrastructure |
| **DEC-006** | Legal Entity & GST Setup | Indian Proprietorship / LLP with Razorpay payment gateway | Undecided; Founder to confirm before M4 |

---

## 11. Cross-Reference Navigation
- **Architecture & System Design**: [ARCHITECTURE.md](file:///D:/react-native/VISNORA/docs/ARCHITECTURE.md)
- **Database Schema & RLS**: [DATABASE_DESIGN.md](file:///D:/react-native/VISNORA/docs/DATABASE_DESIGN.md)
- **API Contracts & Endpoints**: [API_CONTRACT.md](file:///D:/react-native/VISNORA/docs/API_CONTRACT.md)
- **Security & Cryptography**: [SECURITY.md](file:///D:/react-native/VISNORA/docs/SECURITY.md)
- **Data Provenance & Formulas**: [DATA_METHODOLOGY.md](file:///D:/react-native/VISNORA/docs/DATA_METHODOLOGY.md)
- **Development Roadmap (M0–M7)**: [ROADMAP.md](file:///D:/react-native/VISNORA/docs/ROADMAP.md)
- **Third-Party API Feasibility**: [INTEGRATIONS.md](file:///D:/react-native/VISNORA/docs/INTEGRATIONS.md)
- **Engineering Guidelines**: [DEVELOPMENT_GUIDELINES.md](file:///D:/react-native/VISNORA/docs/DEVELOPMENT_GUIDELINES.md)

