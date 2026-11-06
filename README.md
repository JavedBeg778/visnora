# Visnora — AI-Powered Marketing & Competitive Intelligence SaaS

**Status:** Architectural Specification & Milestone Baseline  
**Current Milestone Target:** M0 / M1 Foundation  
**Primary Specification:** [PRD.md](file:///D:/react-native/VISNORA/docs/PRD.md)  

---

## 1. Overview & Vision

Visnora is a commercial, multi-tenant Software-as-a-Service (SaaS) platform built for digital marketing agencies, SEO/GEO consultants, brand marketers, and business owners. It provides systematic intelligence into how brands appear in AI-generated answers, paired with competitive and first-party advertising analytics.

The platform unites three core intelligence modules on a shared SaaS foundation:
1. **Module A — AI Visibility Intelligence**: Tracks brand presence, citations, and Share of Voice (SOV) across generative AI answer engines (Google Gemini, OpenAI).
2. **Module B — Ad Intelligence**: Ingests customer-authorized first-party advertising data (Google Ads, Meta Ads) and analyzes legally accessible public ad creative registries (Meta Ad Library).
3. **Module C — ChatGPT Ads Intelligence**: Connects customer-authorized OpenAI Ads accounts for native ChatGPT ad campaign and conversion performance reporting.

---

## 2. Master Documentation Index (`docs/`)

The repository includes a comprehensive, authoritative documentation suite in [`docs/`](file:///D:/react-native/VISNORA/docs/):

| Document | Description |
| :--- | :--- |
| **[PRD.md](file:///D:/react-native/VISNORA/docs/PRD.md)** | Complete Product Requirements Document, user personas, non-goals, functional matrix (FR-001 to FR-020), and plan concepts. |
| **[TECHNICAL_BLUEPRINT.md](file:///D:/react-native/VISNORA/docs/TECHNICAL_BLUEPRINT.md)** | System overview, tech stack justifications, operational workflows, and execution pipelines. |
| **[ARCHITECTURE.md](file:///D:/react-native/VISNORA/docs/ARCHITECTURE.md)** | Modular monolith topology, multi-tenancy hierarchy, queue design (BullMQ), and caching boundaries. |
| **[DATABASE_DESIGN.md](file:///D:/react-native/VISNORA/docs/DATABASE_DESIGN.md)** | PostgreSQL 16 schema, ERD, tables, UUIDv4 standards, composite indexes, and Supabase RLS policies. |
| **[API_CONTRACT.md](file:///D:/react-native/VISNORA/docs/API_CONTRACT.md)** | RESTful v1 endpoints catalog, uniform JSON envelope, error mapping, and Zod validation schemas. |
| **[SECURITY.md](file:///D:/react-native/VISNORA/docs/SECURITY.md)** | Multi-tenant isolation, RBAC matrix, AES-256-GCM credential encryption, SSRF protection, and webhook HMAC. |
| **[DATA_METHODOLOGY.md](file:///D:/react-native/VISNORA/docs/DATA_METHODOLOGY.md)** | Data provenance classes (Actual, Observed, Sampled, Estimated, Platform-Reported) and mathematical formulas (OMR, SSOV). |
| **[ROADMAP.md](file:///D:/react-native/VISNORA/docs/ROADMAP.md)** | Phased milestone plan (M0 through M7) with scopes, database tasks, security requirements, and acceptance criteria. |
| **[INTEGRATIONS.md](file:///D:/react-native/VISNORA/docs/INTEGRATIONS.md)** | Third-party API feasibility register (Gemini, OpenAI, Google Ads, Meta, OpenAI Ads, Razorpay). |
| **[DEVELOPMENT_GUIDELINES.md](file:///D:/react-native/VISNORA/docs/DEVELOPMENT_GUIDELINES.md)** | Engineering standards, TypeScript strictness, Prisma migrations, and Definition of Done. |

---

## 3. Technology Architecture

- **Web & API Framework**: Next.js 15+ (App Router, Server Components, Route Handlers)
- **UI & Design System**: React 19, Tailwind CSS, shadcn/ui, Recharts
- **Database**: PostgreSQL 16+ (Supabase Managed Engine) with Row Level Security (RLS)
- **ORM & Migrations**: Prisma ORM
- **Authentication**: Supabase Auth (JWT, secure HTTP-only cookies)
- **Asynchronous Processing**: BullMQ + Redis (Upstash / Redis 7+)
- **Storage**: Supabase Storage (S3-compatible, signed download URLs)
- **AI Adapters**: Google Gemini API (`@google/genai`), OpenAI API (`openai`)
- **Payments**: Razorpay Node SDK (INR Subscriptions & Webhook HMAC Verification)

---

## 4. Repository Structure

```
VISNORA/
├── apps/
│   └── web/                # Next.js Application (Marketing, Auth, Dashboard, API routes)
├── packages/
│   ├── database/           # Prisma schema, migrations, DB client singleton
│   ├── domain/             # Business logic (organizations, projects, AI visibility, billing)
│   ├── integrations/       # External API clients (Gemini, OpenAI, Google Ads, Meta, Razorpay)
│   ├── jobs/               # BullMQ background workers and schedulers
│   └── shared/             # Shared TypeScript types, Zod schemas, RBAC rules, crypto
├── docs/                   # 10 Master documentation files and original specification
├── tests/                  # Unit, Integration, and Playwright E2E suites
├── .env.example            # Sanitized environment template
└── package.json            # Root dependency manifest and scripts
```

---

## 5. Development Setup & Quickstart

### Prerequisites
- Node.js v22+
- npm v10+
- Supabase account (PostgreSQL & Auth)
- Redis instance (local or Upstash)

### Installation
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd VISNORA
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   ```bash
   cp .env.example .env.local
   # Populate .env.local with development API keys and Supabase credentials
   ```
4. Generate Prisma client & apply migrations:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
5. Run development server:
   ```bash
   npm run dev
   ```

---

## 6. Development Milestones
- **M0**: Discovery & Technical Feasibility *(Active baseline)*
- **M1**: Core SaaS Foundation & Tenancy Infrastructure
- **M2**: AI Visibility Intelligence MVP
- **M3**: Pilot Testing & Hardening
- **M4**: Subscription & Monetization (Razorpay)
- **M5**: Ad Intelligence (Own-Account & Permitted Public Creative)
- **M6**: ChatGPT Ads Intelligence
- **M7**: Advanced Features, Scaling & Automation

---

## 7. License & Rights
Commercial SaaS proprietary software. All rights reserved.

