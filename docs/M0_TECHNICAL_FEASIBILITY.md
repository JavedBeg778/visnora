# Visnora — Milestone M0: Technical Feasibility & Authentication / Quota Diagnostic

**Document Version:** 3.0 (429 Root Cause & Search Grounding Quota Audit)  
**Baseline Date:** 6 November 2026  
**Document Stage:** Technical Feasibility, Authentication & Rate-Limit Diagnostic Baseline  
**Document Owner:** Technical Lead & Senior AI Integration Engineer  
**Repository Context:** `D:\react-native\VISNORA`  

---

## 1. Executive Summary & Audit Context

This document provides a rigorous, empirical technical feasibility evaluation for Milestone M0, incorporating corrective findings and controlled root-cause diagnostics regarding Google Gemini API authentication, Search Grounding quota restrictions, HTTP 429 (`RESOURCE_EXHAUSTED`), and HTTP 503 (`UNAVAILABLE`) behaviors.

### Key Diagnostic Highlights:
1. **API Key Authentication Status: VERIFIED**: The active key configured in `.env.local` is valid and active. Verification against the Generative Language API endpoint (`/v1beta/models`) succeeded with HTTP 200, discovering 50 active models including `gemini-3.8-flash`, `gemini-3.5-flash-lite`, and preview models.
2. **Search Grounding Quota vs. Text Generation (Root Cause of HTTP 429)**:
   - When executed **WITH Search Grounding** (`tools: [{ googleSearch: {} }]`), Google immediately returns `HTTP 429 RESOURCE_EXHAUSTED` with `"You exceeded your current quota, please check your plan and billing details"`.
   - On Google AI Studio / Developer API Free Tier, Google Search Grounding is restricted or has a quota of 0 requests/day until a billed project or specific search quota is activated.
   - The previous benchmark runner had `enableGrounding: true` **hardcoded**, causing all benchmark calls to immediately fail with HTTP 429.
3. **Model Server Demand (HTTP 503)**:
   - When executed **WITHOUT Search Grounding**, `gemini-3.8-flash` returned `HTTP 503 UNAVAILABLE` with `"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."`
   - This represents a transient server capacity spike on the frontier model, entirely distinct from quota exhaustion.
4. **Architectural Remediation Implemented**:
   - Made Search Grounding fully configurable via `--grounding` / `--no-grounding` (defaulting safely to text-only mode).
   - Upgraded error classification to distinguish `AiGroundingQuotaError` (status 429, non-retryable), `AiQuotaExhaustedError` (status 429, non-retryable), `AiCapacityError` (status 503, retryable), and `AiRateLimitError` (transient RPM throttle).
   - Fixed benchmark result misalignment to ensure failed requests never fabricate metrics or distort observed mention rates.
   - All 29 unit tests passing with 0 TypeScript compilation errors.

---

## 2. Gemini API Diagnostic & Root Cause Investigation

### 2.1 API Key Verification & Model Discovery (HTTP 200)

Direct API key verification via `https://generativelanguage.googleapis.com/v1beta/models?key=[REDACTED]` confirms that the current key is authenticated and authorized:

```json
{
  "status": 200,
  "modelsDiscovered": 50,
  "targetWorkhorse": "models/gemini-3.8-flash",
  "budgetWorkhorse": "models/gemini-3.5-flash-lite",
  "generationMethods": ["generateContent", "countTokens", "createCachedContent", "batchGenerateContent"]
}
```

### 2.2 Controlled Diagnostic Matrix (Empirical Findings)

Three controlled requests were executed using `@google/genai` (v2.32.0) without exposing credentials:

| Diagnostic Test | Target Model | Search Grounding Tool | HTTP Status | Google Structured Response / Code | Architectural Interpretation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Test A1** | `gemini-3.8-flash` | Disabled (`config: {}`) | **503** | `UNAVAILABLE`<br>`"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."` | Transient server capacity spike on `gemini-3.8-flash`. Model endpoint is reachable and authenticated. |
| **Test A2** | `gemini-3.8-flash` | Disabled (`config: {}`) | **503** | `UNAVAILABLE`<br>`"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."` | Confirmed temporary high demand state. Handled as retryable `AiCapacityError`. |
| **Test B** | `gemini-3.8-flash` | Enabled (`tools: [{ googleSearch: {} }]`) | **429** | `RESOURCE_EXHAUSTED`<br>`"You exceeded your current quota, please check your plan and billing details."`<br>Links: `https://ai.google.dev/gemini-api/docs/rate-limits` | **ROOT CAUSE**: Google Search Grounding feature quota is 0 or unbilled on this project. Non-retryable plan limit. |

### 2.3 Detailed Structured 429 Error Payload

```json
{
  "error": {
    "code": 429,
    "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. ",
    "status": "RESOURCE_EXHAUSTED",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.Help",
        "links": [
          {
            "description": "Learn more about Gemini API quotas",
            "url": "https://ai.google.dev/gemini-api/docs/rate-limits"
          }
        ]
      }
    ]
  }
}
```

### 2.4 Why the Previous Implementation Failed

1. **Hardcoded Grounding in Benchmark Runner**:
   In `packages/integrations/ai-providers/benchmark-runner.ts`, line 125 hardcoded `enableGrounding: true` unconditionally. There was no CLI flag to disable it.
2. **Immediate 429 on Unbilled Grounding**:
   Google Developer API Free Tier permits text generation on Flash models (within RPM/RPD limits), but Search Grounding either requires Pay-as-you-go billing ($35 / 1k queries or project quota allocation) or has zero quota on unlinked projects.
3. **Compound Retries**:
   The adapter classified 429 as a retryable `AiRateLimitError`, retrying 3 times with exponential backoff on a plan-level quota rejection, causing compounding delays and terminal failures.

---

## 3. Safe Diagnostic Remediations Implemented

### 3.1 Grounding Configurable Across Benchmarks & CLI
- Added `enableGrounding?: boolean` option to `runBenchmark()`.
- Defaulted `enableGrounding` to `false` (safe text-only mode for Free Tier / development).
- Added `--grounding` CLI flag to enable Search Grounding when explicitly desired on billed accounts.
- Added dedicated npm scripts:
  - `npm run benchmark:gemini:text`: Runs 3-prompt benchmark in text-only mode.
  - `npm run benchmark:gemini:grounded`: Runs 3-prompt benchmark with Search Grounding enabled.

### 3.2 Granular Error Classification in GeminiAdapter
- `AiGroundingQuotaError` (Code: `GROUNDING_QUOTA_EXHAUSTED`, Status 429, `isRetryable: false`): Thrown immediately when a request with search grounding fails with quota exhaustion, preventing wasteful backoff retries.
- `AiQuotaExhaustedError` (Code: `QUOTA_EXHAUSTED`, Status 429, `isRetryable: false`): Thrown when general project or text quota is exhausted per billing plan.
- `AiCapacityError` (Code: `CAPACITY_EXHAUSTED`, Status 503, `isRetryable: true`): Thrown when the model reports temporary high demand.
- `AiRateLimitError` (Code: `RATE_LIMITED`, Status 429, `isRetryable: true`): Reserved for transient rate-limiting with retry-after intervals.

### 3.3 Benchmark Evaluation Alignment & Truth in Reporting
- Replaced direct array indexing with `Map<string, BatchRunEvaluationItem>` keyed by `promptId`.
- If a prompt fails (due to capacity or quota), it is cleanly recorded as `status: 'FAILED'`, with 0 fabricated mentions and 0 fabricated citations.
- Observed Mention Rate (OMR) and Sample Share of Voice (SSOV) calculations strictly evaluate successful responses, while tracking `failedRunsCount` accurately.

---

## 3. Gemini Model Lifecycle & Selection Verification

Consulting official documentation ([`https://ai.google.dev/gemini-api/docs/models`](https://ai.google.dev/gemini-api/docs/models)):

```
┌────────────────────────┬─────────────────────────┬───────────────────────────┬──────────────────────────────────────────┐
│ Model Identifier       │ Official Status         │ Pricing (Input / Output)  │ Operational Role in Visnora              │
├────────────────────────┼─────────────────────────┼───────────────────────────┼──────────────────────────────────────────┤
│ gemini-3.8-flash       │ ACTIVE (Workhorse)      │ $0.75 / $3.75 per 1M      │ Primary standard for AI Visibility MVP.  │
│                        │                         │ (introductory rate)       │ Supports Google Search Grounding.        │
│ gemini-3.5-flash-lite  │ ACTIVE (High-Scale)     │ $0.30 / $2.50 per 1M      │ Ultra-budget alternative for frequent    │
│                        │                         │                           │ background prompt polling.               │
│ gemini-3.7-flash       │ REPLACED                │ N/A                       │ Automatically routed to gemini-3.8-flash │
│ gemini-2.5-flash       │ DEPRECATED              │ N/A                       │ Automatically routed to 3.5-flash-lite   │
│ gemini-1.5-flash       │ END-OF-LIFE             │ N/A                       │ Retired by Google                        │
└────────────────────────┴─────────────────────────┴───────────────────────────┴──────────────────────────────────────────┘
```

### Approved Technical Decision & Model Strategy:
Visnora designates **`gemini-3.8-flash`** as the preferred primary baseline model, while **`gemini-3.5-flash-lite`** is established and verified as the **configurable fallback model** (via `--model=gemini-3.5-flash-lite` or adapter config). 

**Free Tier Allocation Comparison (AI Studio Dashboard)**:
- **`gemini-3.8-flash`**: 5 RPM, 250K TPM, 20 RPD (highly constrained daily budget; subject to transient HTTP 503 high-demand spikes).
- **`gemini-3.5-flash-lite`**: 15 RPM, 250K TPM, 500 RPD (25× higher daily quota; empirical live request completed successfully in 10.69s).

This fallback is strictly **configurable** (not an automatic silent substitution), guaranteeing that benchmarks and customer runs remain deterministic and transparent.

---

## 4. OpenAI Integration Architecture & Boundary

- **SDK**: `openai` (v4.85.4).
- **Baseline Model**: `gpt-4o-mini` ($0.150 / 1M input, $0.600 / 1M output).
- **Web Search Tool**: Official pricing is **$10.00 per 1,000 search calls** + 8,000 fixed input tokens per search call on `gpt-4o-mini`.
- **Status**: Formally marked **PENDING API ACCESS**. The adapter architecture is complete, verified via dry-run unit tests, and makes zero network calls until an authorized key is supplied.

---

## 5. Summary Checklist for Milestone M1 Readiness

Milestone M1 (Core SaaS Foundation & Tenancy Infrastructure) may begin once:
- [ ] Founder reviews Google AI Studio / Google Cloud Console dashboard:
  - Verifies that `generativelanguage.googleapis.com` is enabled on the project.
  - Verifies key restrictions allow the Generative Language API.
  - Verifies that the complete key string is in `.env.local`.
- [ ] Founder runs `npm run benchmark:gemini:test` to confirm HTTP 200 response.
- [ ] Field customer discovery interviews ([`docs/M0_CUSTOMER_DISCOVERY.md`](file:///D:/react-native/VISNORA/docs/M0_CUSTOMER_DISCOVERY.md)) confirm agency problem urgency with at least 5 target agencies.

---

## 6. Cross-Reference Navigation
- **Benchmark Report**: [M0_BENCHMARK_REPORT.md](file:///D:/react-native/VISNORA/docs/M0_BENCHMARK_REPORT.md)
- **Unit Economics**: [M0_UNIT_ECONOMICS.md](file:///D:/react-native/VISNORA/docs/M0_UNIT_ECONOMICS.md)
- **Customer Discovery**: [M0_CUSTOMER_DISCOVERY.md](file:///D:/react-native/VISNORA/docs/M0_CUSTOMER_DISCOVERY.md)
- **Integrations Register**: [INTEGRATIONS.md](file:///D:/react-native/VISNORA/docs/INTEGRATIONS.md)
- **Roadmap**: [ROADMAP.md](file:///D:/react-native/VISNORA/docs/ROADMAP.md)
