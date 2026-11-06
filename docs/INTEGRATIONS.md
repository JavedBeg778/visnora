# Visnora — Third-Party Integration Feasibility Register

**Document Version:** 1.0  
**Baseline Date:** 4 November 2026  
**Document Stage:** Integration Feasibility & API Boundary Register Baseline  
**Document Owner:** Principal Integration Architect & API Engineer  
**Repository Context:** `D:\react-native\VISNORA`  

---

## 1. Integration Feasibility Governance & Status Legend

Visnora enforces strict integration governance to prevent architectural fantasy, deceptive product claims, or premature investment in blocked APIs. Every external integration is assigned an unambiguous feasibility status:

- **VERIFIED**: Official developer documentation reviewed; authentication, quotas, commercial terms, and pricing confirmed viable for target milestone.
- **NEEDS VERIFICATION**: Official documentation exists, but specific developer approvals, App Reviews, partner agreements, or country-level rollouts must be formally tested before code commitment.
- **BLOCKED**: The envisioned capability cannot lawfully or technically be achieved via official public interfaces (e.g., attempting to access private competitor ad spend or universal unauthenticated ChatGPT ad feeds).

---

## 2. Master Integration Feasibility Register

| Integration Source | Primary Use in Visnora | Target Milestone | Feasibility Status | Key Technical & Commercial Guardrails |
| :--- | :--- | :--- | :--- | :--- |
| **Google Gemini API** | AI Visibility prompt execution & search grounding | **M2** | **VERIFIED (Active Key; Grounding Quota Gated)** | Upgraded to `@google/genai` (v2.32.0). Gemini 3.8 Flash & 3.5 Flash-Lite. Configured key in `.env.local` verified active (50 models discovered). Search Grounding returns HTTP 429 when unbilled/0-quota; text-only generation functional. Search Grounding made strictly configurable. |
| **OpenAI API (Platform)**| AI Visibility prompt execution | **M2 / M7** | **PENDING API ACCESS** | GPT-4o-mini ($0.15/$0.60 per 1M). Built-in Web Search ($10/1k calls + 8k tokens). Architecture implemented; live calls blocked until founder provides API key. Zero paid calls made. |
| **Razorpay API** | Customer subscriptions, payments, webhooks | **M4** | **VERIFIED** | Standard Indian SaaS payment gateway. Supports cards, UPI, recurring e-mandates. Webhooks verified via HMAC-SHA256. |
| **Meta Ad Library API** | Permitted public competitor ad creative research | **M5** | **NEEDS VERIFICATION** | Requires Meta App Review, Business Verification, and agreement to Ad Library API terms. Public creative text only; no private metrics. |
| **Google Ads API** | First-party connected account campaign reporting | **M5** | **NEEDS VERIFICATION** | Requires Google Developer Token approval (Basic/Standard access), OAuth 2.0 verification. Restricted to authorized own account. |
| **OpenAI Ads Advertiser API**| ChatGPT Ads customer campaign & conversion reporting| **M6** | **NEEDS VERIFICATION** | Official Advertiser API for authorized accounts. Rolling out to select regions (expanded Aug 2026). NOT a universal competitor ad discovery tool. |
| **Google Ads Transparency Center**| Competitor ad observation snapshots | **M5** | **BLOCKED (as API)** | Public consumer transparency portal; no official structured public REST API for commercial automated ingestion. |
| **Meta Marketing API** | First-party connected Meta ad account insights | **M5** | **NEEDS VERIFICATION** | Requires `ads_read` permission, Advanced Access App Review, and Business Manager verification. |
| **Licensed Keyword Providers**| Estimated search & ad traffic intelligence | **M7** | **NEEDS VERIFICATION** | Commercial enterprise data licensing (e.g., Semrush/SimilarWeb API) requires capital evaluation and redistribution rights review. |

---

## 3. Deep-Dive Integration Specifications

---

### 3.1 Google Gemini API

- **Primary Role**: Powering Module A (AI Visibility Intelligence) prompt collection and live source citation extraction.
- **Official Documentation**: [https://ai.google.dev/docs](https://ai.google.dev/docs) & [https://ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing)
- **SDK Package**: `@google/genai` (v2.32.0) — Official unified Google Gen AI SDK.
- **Authentication Method**:
  - `x-goog-api-key` header or environment variable (`GEMINI_API_KEY`).
  - Supports both **Standard API Keys** (require explicit API restrictions) and **Authorization (Auth) Keys** (bound to Google Cloud service accounts; default in Google AI Studio).
  - *Current Empirical Verification*: Key configured in `.env.local` verified active against `generativelanguage.googleapis.com` with 50 available models discovered.
  - *Rate Limit & Quota Diagnostics*:
    - **Search Grounding Quota Exhaustion (HTTP 429)**: Requests with `tools: [{ googleSearch: {} }]` return `429 RESOURCE_EXHAUSTED` ("You exceeded your current quota, please check your plan and billing details"). This is a plan-level quota constraint on unbilled projects.
    - **Temporary Model Capacity (HTTP 503)**: Text generation requests on `gemini-3.8-flash` may encounter `503 UNAVAILABLE` during peak global traffic ("model is currently experiencing high demand"), classified as retryable `AiCapacityError`.
  - *Remediation*: Search Grounding is now explicitly opt-in (`--grounding`), preserving text-only benchmarks by default without exhausting quota or inducing compounding retries.
- **Supported Workhorse Model**: `gemini-3.8-flash` (primary baseline workhorse; 5 RPM, 20 RPD free tier) with `gemini-3.5-flash-lite` (verified configurable fallback; 15 RPM, 500 RPD free tier; empirical live execution passed with HTTP 200). Older models (`gemini-1.5-flash`, `gemini-2.5-flash`, `gemini-3.7-flash`) are deprecated or superseded.
- **Commercial Usage Restrictions**: Paid tier does not use customer inputs/outputs for model training. Output storage and customer-facing analytical displays are permitted.
- **Data Availability**: Full text response, safety ratings, token counts (`usageMetadata`), and structured `groundingMetadata` containing search query chunks and verified citation URLs when Search Grounding is enabled.
- **Search Grounding Pricing & Quotas**:
  - **Free Tier**: 5,000 free search requests per month (shared across Gemini 3+ models; requires billing enablement / quota allocation on project).
  - **Paid Tier**: $14.00 per 1,000 requests thereafter. Default cap of 1,500 requests/day. Retrieved grounding context text is **not** charged as input tokens.
- **Token Pricing Baseline**:
  - `gemini-3.8-flash`: $0.75 per 1M input tokens / $3.75 per 1M output tokens (introductory rate through Dec 31, 2026; $1.50 / $7.50 standard thereafter).
  - `gemini-3.5-flash-lite`: $0.30 per 1M input tokens / $2.50 per 1M output tokens.
- **Implementation Complexity**: Low. Native TypeScript client via `@google/genai`.
- **Verdict**: **VERIFIED (Active Key; Live Text Execution Verified on 3.5 Flash-Lite; Grounding Gated to Opt-In)** — Recommended primary MVP provider for Milestone M2.

---

### 3.2 OpenAI API (Platform)

- **Primary Role**: Secondary AI Visibility provider for comparative benchmarking.
- **Official Documentation**: [https://platform.openai.com/docs](https://platform.openai.com/docs)
- **Authentication Method**: Bearer Token (`OPENAI_API_KEY`) via official OpenAI Node SDK.
- **Required Permissions / Scopes**: Standard OpenAI organization API key.
- **API Availability**: Global commercial availability.
- **Commercial Usage Restrictions**: Data submitted via commercial API is not used for model training. Customers retain rights to generated outputs.
- **Data Availability**: Full text completions, JSON Schema structured outputs, logprobs, token usage metrics.
- **Rate Limits**: Tier-dependent (Tier 1: 500 RPM; Tier 2+: 5,000 RPM).
- **Pricing Baseline**:
  - GPT-4o-mini: $0.150 per 1M input / $0.600 per 1M output tokens.
  - GPT-4o: $2.50 per 1M input / $10.00 per 1M output tokens.
- **Implementation Complexity**: Low. Standard official SDK (`openai`).
- **Verdict**: **VERIFIED** — Approved for Milestone M2 comparative benchmark testing.

---

### 3.3 Razorpay Payment Gateway

- **Primary Role**: Powering Milestone M4 subscription checkout, recurring billing, and invoice generation.
- **Official Documentation**: [https://razorpay.com/docs/api/](https://razorpay.com/docs/api/)
- **Authentication Method**: HTTP Basic Auth (`Key ID` : `Key Secret`) server-side; Client Key ID for frontend checkout modal.
- **Required Permissions / Scopes**: Standard merchant account with Subscriptions API enabled.
- **API Availability**: India (INR) native; supports international card processing with activated export features.
- **Commercial Usage Restrictions**: Requires registered business entity (Proprietorship, LLP, or Pvt Ltd) and bank KYC in India.
- **Data Availability**: Customer IDs, Subscription IDs, Payment Entities, Invoices, Webhook event streams.
- **Pricing Baseline**: ~2% standard transaction fee on domestic cards/UPI; international cards ~3%.
- **Implementation Complexity**: Moderate. Requires webhook signature verification (`razorpay_signature`) and state reconciliation.
- **Verdict**: **VERIFIED** — Mandatory payment gateway for Indian commercial SaaS launch.

---

### 3.4 Google Ads API

- **Primary Role**: Module B First-party connected account campaign reporting.
- **Official Documentation**: [https://developers.google.com/google-ads/api/docs/reporting/overview](https://developers.google.com/google-ads/api/docs/reporting/overview)
- **Authentication Method**: OAuth 2.0 Web Application Flow (Access Token + Refresh Token) + Google Developer Token.
- **Required Permissions / Scopes**: `https://www.googleapis.com/auth/adwords` scope.
- **API Availability**: Global.
- **Commercial Restrictions & Guardrails**:
  - Developer token required. Basic Access must be requested with an architectural justification and compliance review.
  - **Crucial Boundary**: The Google Ads API provides reporting **only** for accounts to which the authenticating customer has authorized access. It does **not** allow querying competitor accounts.
- **Pricing**: Google Ads API calls are free of charge, subject to developer token rate limits.
- **Implementation Complexity**: High. Requires OAuth credential lifecycle, token refresh daemon, protobuf/REST client mapping, and Google compliance review.
- **Verdict**: **NEEDS VERIFICATION** — Deferred to Milestone M5.

---

### 3.5 Meta Marketing API & Meta Ad Library API

- **Primary Role**:
  - First-party ad reporting (Marketing API).
  - Permitted public competitor ad creative research (Ad Library API).
- **Official Documentation**: [https://developers.facebook.com/docs/marketing-apis](https://developers.facebook.com/docs/marketing-apis)
- **Authentication Method**: OAuth 2.0 User Access Token & System User Access Token.
- **Required Permissions / Scopes**:
  - First-Party: `ads_read`, `read_insights`. Requires Meta App Review and Business Verification.
  - Public Ad Library: Separate Ad Library API access application.
- **Commercial Usage Restrictions**:
  - Ad Library API provides public ads active within Meta technologies.
  - **Crucial Boundary**: Does **not** expose private competitor impressions, exact spend, or conversion performance for commercial non-political ads.
- **Pricing**: Free, subject to Graph API rate limits (call counts based on app user volume).
- **Implementation Complexity**: High. Meta App Review process requires video screencasts and business verification documentation.
- **Verdict**: **NEEDS VERIFICATION** — Deferred to Milestone M5.

---

### 3.6 Google Ads Transparency Center

- **Primary Role**: Intended by some marketers for competitor ad observation.
- **Official Documentation**: [https://adstransparency.google.com/](https://adstransparency.google.com/)
- **Authentication Method**: None (Web user interface).
- **Feasibility Assessment**:
  - Google does **not** provide an official public, structured REST API for the Ads Transparency Center for commercial SaaS ingestion.
  - Automated HTML scraping violates Google Terms of Service and is blocked by anti-bot measures.
- **Verdict**: **BLOCKED (as automated API)** — Visnora will not build fragile, unauthorized scrapers. Any competitor creative research on Google must rely on verified, authorized partner data or manual customer entry.

---

### 3.7 OpenAI Ads Advertiser API

- **Primary Role**: Module C ChatGPT Ads campaign performance reporting for authorized advertisers.
- **Official Documentation**:
  - Developer Overview: [https://developers.openai.com/ads/api-overview](https://developers.openai.com/ads/api-overview)
  - Ads Platform: [https://developers.openai.com/ads](https://developers.openai.com/ads)
  - Partner Setup: [https://learn.chatgpt.com/ads/api-partner-setup](https://learn.chatgpt.com/ads/api-partner-setup)
  - Help Center & Expansion: [https://help.openai.com/en/articles/20001047-ads-in-chatgpt](https://help.openai.com/en/articles/20001047-ads-in-chatgpt) and [OpenAI Announcement (Aug 2026)](https://openai.com/index/expanding-access-to-ai-with-chatgpt-ads/)
- **Authentication Method**: Advertiser Account API Key / Partner OAuth access.
- **Required Permissions / Scopes**: Advertiser API access grants management of campaigns, ad groups, ads, conversion measurement setup, and performance reporting.
- **Commercial Restrictions & Product Boundary**:
  - The API is designed for **an advertiser managing their own ad spend and campaigns inside ChatGPT**.
  - **Critical Architectural Distinction**: The OpenAI Ads API does **not** provide a universal competitor ad discovery feed. It will not reveal competitor campaign budgets, bids, prompt triggers, or target audiences.
- **Pricing**: API access is coupled with advertising spend inside ChatGPT Ads Manager.
- **Implementation Complexity**: High. Dependent on customer holding an active OpenAI Ads account in an eligible region.
- **Verdict**: **NEEDS VERIFICATION** — Scheduled for Milestone M6. Scope strictly restricted to customer-authorized accounts.

---

## 4. Cross-Reference Navigation
- **Product Requirements**: [PRD.md](file:///D:/react-native/VISNORA/docs/PRD.md)
- **Technical Blueprint**: [TECHNICAL_BLUEPRINT.md](file:///D:/react-native/VISNORA/docs/TECHNICAL_BLUEPRINT.md)
- **Architecture Specification**: [ARCHITECTURE.md](file:///D:/react-native/VISNORA/docs/ARCHITECTURE.md)
- **Database Schema**: [DATABASE_DESIGN.md](file:///D:/react-native/VISNORA/docs/DATABASE_DESIGN.md)
- **API Contracts**: [API_CONTRACT.md](file:///D:/react-native/VISNORA/docs/API_CONTRACT.md)
- **Security Blueprint**: [SECURITY.md](file:///D:/react-native/VISNORA/docs/SECURITY.md)
- **Data Provenance**: [DATA_METHODOLOGY.md](file:///D:/react-native/VISNORA/docs/DATA_METHODOLOGY.md)
- **Development Roadmap**: [ROADMAP.md](file:///D:/react-native/VISNORA/docs/ROADMAP.md)
- **Development Guidelines**: [DEVELOPMENT_GUIDELINES.md](file:///D:/react-native/VISNORA/docs/DEVELOPMENT_GUIDELINES.md)

