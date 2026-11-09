# Visnora — AI Visibility & Ad Intelligence SaaS

**Current milestone:** M3 — Intelligence and pilot hardening (in progress)  
**Production:** https://visnora.vercel.app  
**UI:** Strict light mode only.

Visnora helps brands and agencies understand how they appear in sampled AI-generated answers, compare observed visibility against configured competitors, inspect citation sources, and turn evidence into practical improvements. Planned expansion includes customer-authorized advertising analytics.

Core workflow: **Discover → Analyze → Compare → Recommend → Improve.**

> Visibility metrics are sampled observations from configured prompts and model responses. They are not global search impressions, market share, guaranteed rankings, or private competitor advertising metrics.

## Milestones

- **M0 — Technical feasibility:** Completed.
- **M1 — SaaS foundation:** Completed.
- **M2 — AI Visibility MVP:** Completed.
- **M3 — Intelligence and pilot hardening:** In progress.
- **M4 — Subscription and billing:** Planned; requires Razorpay merchant configuration.
- **M5 — Ad Intelligence:** Planned; requires customer-authorized Google/Meta account access and platform approvals.
- **M6 — ChatGPT Ads Intelligence:** Conditional on official advertiser API/partner access.

See [docs/ROADMAP.md](docs/ROADMAP.md) for scope, gates and acceptance criteria.

## Technology

- Next.js App Router, React, TypeScript and Tailwind CSS
- Supabase Auth and PostgreSQL; Prisma ORM
- Gemini/OpenAI provider adapters
- Recharts for analytics
- Vitest and Playwright test tooling
- BullMQ/Redis dependencies are present, but a durable prompt worker must be implemented and verified before scheduled tracking is described as reliable.

## Local development

Requirements: Node.js 22+, npm 10+, a Visnora development Supabase project and configured environment variables.

```bash
npm install
npm run db:generate
npm run dev
```

Use a local `.env.local` populated from `.env.example`. Never commit secrets or production credentials.

## Repository map

- `apps/web` — Next.js app, dashboard and API routes
- `packages/database` — Prisma schema and migrations
- `packages/domain` — domain services and business rules
- `packages/integrations` — AI provider adapters
- `packages/shared` — shared validation, permissions and utilities
- `docs` — product, architecture, security, data methodology and roadmap
- `tests` — unit and end-to-end tests

## Engineering guardrails

- Enforce tenant isolation server-side; never trust client-supplied organization/project IDs without membership checks.
- Keep the UI in light mode.
- Do not run paid AI collection or modify production data as a side effect of tests.
- Do not expose private competitor advertising performance.
- Keep credentials out of source control and logs.
