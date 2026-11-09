# Visnora Product Roadmap (M0–M6)

**Last updated:** 9 November 2026  
**Product:** AI Visibility Intelligence + Ad Intelligence SaaS  
**Execution:** Lean modular monolith; deliver and verify one milestone at a time.  
**UI constraint:** Strict light mode only. No dark theme or theme switch.

## Product direction

Visnora helps brands and agencies understand how their brands appear in sampled AI-generated answers, compare observed presence with configured competitors, inspect citation sources, and turn evidence into improvements. Later expansion includes advertising intelligence using customer-authorized account data and permitted public ad observations.

Core workflow: **Discover → Analyze → Compare → Recommend → Improve.**

Metrics represent sampled prompt observations. They are not global search impressions, market share, guaranteed rankings, or private competitor advertising performance.

## Milestone status

| Milestone | Scope | Status |
|---|---|---|
| M0 | Technical feasibility, provider benchmarks, unit economics | **Completed** |
| M1 | SaaS foundation, authentication, tenancy, RBAC | **Completed** |
| M2 | AI Visibility MVP: brands, competitors, prompts, collection, analysis, dashboards | **Completed** |
| M3 | Intelligence improvements, operational hardening, pilot readiness | **In progress** |
| M4 | Subscription billing, plan limits, Razorpay | Planned; requires merchant configuration |
| M5 | Ad Intelligence: own Google/Meta accounts and permitted public creative | Planned; requires platform API approvals |
| M6 | ChatGPT Ads Intelligence | Conditional; only if official advertiser API/access is available |

## M0 — Technical feasibility (completed)

- Gemini/OpenAI provider adapter groundwork and benchmark harness.
- 50-prompt benchmark dataset, citation extraction, token/cost estimation.
- Documented unit economics and feasibility findings.

## M1 — SaaS foundation (completed)

- Supabase SSR authentication and account lifecycle.
- Organizations, workspaces, projects, team membership, invitations and RBAC.
- Tenant-aware database schema and RLS baseline.
- Permanent light-mode visual system.

## M2 — AI Visibility MVP (completed)

- Brand and competitor profiles.
- Prompt library, categories, suggestions and tracking controls.
- AI response collection, raw response retention, payload hashes, mention/sentiment/citation extraction.
- Visibility overview, competitor comparison, citation intelligence, historical chart and recommendations.
- Tracking run history and retry workflow.

## M3 — Intelligence and pilot hardening (in progress)

### Engineering scope
- Keep the composite score consistent everywhere: 45% OMR + 25% SSOV + 15% citation rate + 15% positive sentiment rate.
- Enforce active organization membership and project/brand ownership on tenant-scoped APIs.
- Validate and bound query inputs, protect endpoints with rate limits, and avoid unbounded database work.
- Make tracking execution resilient and durable before promising scheduled/background execution. A request-lifecycle callback is not a durable queue.
- Add structured, redacted operational logs, error monitoring, and useful failure states.
- Add in-app pilot feedback and responsive review across phone/tablet/desktop.
- Add operational usage/cost visibility with estimated-vs-actual provenance.
- Add automated tests for tenant isolation, analytics formulas, retries, and failure paths.

### Pilot readiness gates
- Verify no cross-tenant data access in the API test suite.
- Verify run failure and partial-success handling.
- Verify scheduled runs execute reliably after process restarts.
- Verify cost and usage reporting against stored provider usage.
- Complete 5–10 pilot onboarding sessions and gather consented feedback.
- Do not claim a 2-week pilot or zero incidents until measured evidence exists.

## M4 — Subscription and monetization (planned)

- Free trial, Starter, Pro and Agency plan definitions.
- Razorpay test-mode checkout, signed and idempotent webhooks, subscription lifecycle.
- Server-side usage metering and plan quota enforcement.
- Billing history, invoices and cancellation controls.
- Live payments only after merchant account, legal/tax details and explicit go-live review.

## M5 — Ad Intelligence (planned; API-gated)

- OAuth connections to each customer's own Google Ads and Meta Ads accounts.
- Campaign metrics imported only from accounts the customer is authorized to connect.
- Permitted public ad creative observations with source and capture date.
- Encrypt tokens, validate OAuth state, support revocation and re-authentication.
- Never infer or claim private competitor spend, conversions, targeting or ROAS from public creative.

## M6 — ChatGPT Ads Intelligence (conditional)

- Build only against an official OpenAI advertiser API or documented partner integration with approved access.
- Import only metrics the connected advertiser is authorized to access.
- Clearly distinguish unavailable capabilities; never imply competitor account visibility.

## Cross-cutting definition of done

- TypeScript checks, unit tests, production build and relevant E2E tests pass.
- Tenant boundaries and role permissions are verified.
- Data provenance and sampling caveats are visible where metrics are presented.
- Light mode remains the only theme.
- No production data is seeded, overwritten or destructively migrated as part of routine development.
- Production deployment and paid provider execution require an explicit, separately scoped release decision.
