# Visnora — Milestone M0: Audited Unit Economics & Inference Cost Analysis

**Document Version:** 2.0 (Audited & Corrected)  
**Baseline Date:** 4 November 2026 (Audited at 21:42 IST)  
**Document Stage:** Cost Modeling & Unit Economic Feasibility Baseline  
**Currency Baseline:** USD ($) and Indian Rupee (₹) at standard baseline exchange rate **1 USD = 87.00 INR** (Timestamp: `2026-11-04T21:42:09+05:30`)  
**Document Owner:** Senior SaaS Architect & Technical Lead  
**Repository Context:** `D:\react-native\VISNORA`  

---

## 1. Executive Summary & Audit Context

The initial M0 report claimed gross margins of ~99% on raw AI token inference. That preliminary figure was misleading because it evaluated only raw token consumption within Google's free Search Grounding allowance, omitting:
1. **Search Grounding Overage Costs**: Google charges **$14.00 per 1,000 search queries** once monthly free allowances are exceeded.
2. **Search Query Multipliers**: A single complex prompt execution can trigger 1 to 3 distinct search queries.
3. **Operational Cloud Infrastructure**: Fixed database storage (Supabase Pro), worker queue caching (Upstash Redis), application hosting (Vercel/Railway), and error telemetry (Sentry).
4. **Payment Gateway Fees**: Razorpay domestic processing (2.0% + 18% GST = **2.36%**).

This audited document rectifies those assumptions, rebuilds the mathematical calculator, separates every cost category, and explains the step-function cost behavior of Search Grounding at scale.

---

## 2. Official Gemini API Pricing Matrix (Published Baselines)

Consulting official pricing ([`https://ai.google.dev/gemini-api/docs/pricing`](https://ai.google.dev/gemini-api/docs/pricing)):

```
┌──────────────────────────────────────┬─────────────────────────────┬─────────────────────────────┐
│ Cost Component                       │ Gemini 3.8 Flash (Workhorse)│ Gemini 3.5 Flash-Lite       │
├──────────────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ Input Token Cost (per 1M tokens)     │ $0.75 (~₹65.25)             │ $0.30 (~₹26.10)             │
│ Output Token Cost (per 1M tokens)    │ $3.75 (~₹326.25)            │ $2.50 (~₹217.50)            │
│ Standard Token Pricing (Post-2026)   │ $1.50 in / $7.50 out per 1M │ Unchanged                   │
│ Search Grounding Free Allowance      │ 5,000 free queries / month  │ 5,000 free queries / month  │
│ Search Grounding Overage Rate        │ $14.00 per 1,000 queries    │ $14.00 per 1,000 queries    │
│ Daily Grounding Request Cap          │ 1,500 requests / day (RPD)  │ 1,500 requests / day (RPD)  │
│ Retrieved Grounding Context Tokens   │ NOT charged as input tokens │ NOT charged as input tokens │
└──────────────────────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

---

## 3. Comprehensive Prompt Execution Cost Scenarios

Standard token assumptions per prompt run:
- Average Prompt Input: **150 tokens**
- Average Model Output: **450 tokens**
- Total Tokens / Run: **600 tokens**
- Transient Failure Retry Buffer: **5%**
- Exchange Rate: **₹87.00 per 1 USD**

### 3.1 Scenario A: No Search Grounding (Pure LLM Inference)
Evaluates base language model generation without web retrieval:

| Prompt Volume | Total Tokens | AI Cost (USD) | AI Cost (INR) | Effective Cost / Prompt |
| :--- | :--- | :--- | :--- | :--- |
| **100 Prompts** | 60,000 | $0.189 | ₹16.44 | **₹0.164** |
| **1,000 Prompts** | 600,000 | $1.890 | ₹164.43 | **₹0.164** |
| **2,500 Prompts** | 1,500,000 | $4.725 | ₹411.07 | **₹0.164** |
| **10,000 Prompts** | 6,000,000 | $18.900 | ₹1,644.30 | **₹0.164** |

### 3.2 Scenario B: Standard Search Grounding (1 Search Query per Prompt)
Includes live web citations with a 1:1 prompt-to-query ratio:

| Prompt Volume | Total Search Queries | Billable Queries | Grounding Fee | Total AI Cost (USD) | Total AI Cost (INR) | Cost / Prompt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **100 Prompts** | 100 | 0 (Free) | $0.00 | $0.189 | **₹16.44** | **₹0.164** |
| **1,000 Prompts** | 1,000 | 0 (Free) | $0.00 | $1.890 | **₹164.43** | **₹0.164** |
| **2,500 Prompts** | 2,500 | 0 (Free) | $0.00 | $4.725 | **₹411.07** | **₹0.164** |
| **10,000 Prompts**| 10,000 | 5,000 billable | **$70.00** | **$92.400** | **₹8,038.80** | **₹0.804** |

### 3.3 Scenario C: Deep Search Grounding (2 Search Queries per Prompt)
When complex brand and competitor queries trigger multiple web search queries per prompt:

| Prompt Volume | Total Search Queries | Billable Queries | Grounding Fee | Total AI Cost (USD) | Total AI Cost (INR) | Cost / Prompt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **100 Prompts** | 200 | 0 (Free) | $0.00 | $0.189 | **₹16.44** | **₹0.164** |
| **1,000 Prompts** | 2,000 | 0 (Free) | $0.00 | $1.890 | **₹164.43** | **₹0.164** |
| **2,500 Prompts** | 5,000 | 0 (Exact Free Cap) | $0.00 | $4.725 | **₹411.07** | **₹0.164** |
| **10,000 Prompts**| 20,000 | 15,000 billable | **$210.00** | **$239.400** | **₹20,827.80** | **₹2.083** |

---

## 4. Root Cause Analysis: The 10,000-Prompt Cost Jump

In the previous M0 report, 1,000 prompts cost ₹13, but 10,000 prompts suddenly jumped to over ₹6,500. 

### Why This Step-Function Occurs:
- Google AI Studio grants **5,000 free search requests per month** per project on paid tiers.
- For 100, 1,000, and 2,500 prompts, total search queries remain within this free allowance ($0.00 grounding charge).
- Once query volume crosses 5,000, **every additional 1,000 queries costs $14.00 (₹1,218.00)**.
- At 10,000 prompts with 1 query/prompt:
  - 5,000 billable queries $\times \$14.00 / 1,000 = \$70.00$ (₹6,090.00).
  - Raw inference cost is only $\$18.00$ (₹1,566.00).
  - **Grounding fees represent 79.5% of total AI expenditure** at high volumes.
- At 2 queries per prompt (10,000 prompts = 20,000 queries):
  - 15,000 billable queries cost **$210.00** (₹18,270.00), resulting in an effective cost of **₹2.08 per prompt**.

---

## 5. All-Inclusive Subscription Plan Economics

To establish genuine financial viability, fixed cloud infrastructure and payment processing must be amortized alongside variable AI costs. 

### Estimated Monthly Operational Fixed Costs (Amortized across 20 Subscribers):
- **Database & Storage (Supabase Pro)**: $25.00/mo = ~₹2,175 / 20 = **₹108.75 / tenant** *(Estimate)*
- **Queue & Cache (Upstash Redis)**: $10.00/mo = ~₹870 / 20 = **₹43.50 / tenant** *(Estimate)*
- **Application Hosting (Vercel/Railway Pro)**: $20.00/mo = ~₹1,740 / 20 = **₹87.00 / tenant** *(Estimate)*
- **Error Monitoring (Sentry Team)**: $15.00/mo = ~₹1,305 / 20 = **₹65.25 / tenant** *(Estimate)*
- **Payment Gateway (Razorpay)**: 2.0% + 18% GST = **2.36% of subscription price** *(Actual)*

### Itemized Plan Margins Table (Monthly Basis)

```
┌──────────────────────────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Cost Category                        │ Starter Plan     │ Pro Plan         │ Agency Plan      │
├──────────────────────────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Monthly Subscription Price           │ ₹1,499           │ ₹3,999           │ ₹9,999           │
│ Included Monthly Prompt Runs         │ 100 runs         │ 500 runs         │ 2,500 runs       │
│ Assumed Search Query Multiplier      │ 1.0 query/prompt │ 1.0 query/prompt │ 1.5 query/prompt │
├──────────────────────────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ 1. AI Inference Cost (Gemini 3.8)    │ ₹15.66           │ ₹78.30           │ ₹391.50          │
│ 2. Search Grounding Cost             │ ₹0.00 (Free cap) │ ₹0.00 (Free cap) │ ₹0.00 (Free cap) │
│ 3. Database & Storage (Amortized)    │ ₹108.75          │ ₹108.75          │ ₹108.75          │
│ 4. Queue & Redis (Amortized)         │ ₹43.50           │ ₹43.50           │ ₹43.50           │
│ 5. App Hosting (Amortized)           │ ₹87.00           │ ₹87.00           │ ₹87.00           │
│ 6. Payment Gateway Fee (Razorpay)    │ ₹35.38           │ ₹94.38           │ ₹235.98          │
│ 7. Monitoring & Logging (Amortized)  │ ₹65.25           │ ₹65.25           │ ₹65.25           │
├──────────────────────────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ TOTAL ESTIMATED MONTHLY COST         │ ₹355.54          │ ₹477.18          │ ₹931.98          │
│ ESTIMATED MONTHLY NET PROFIT         │ ₹1,143.46        │ ₹3,521.82        │ ₹9,067.02        │
│ ESTIMATED NET CONTRIBUTION MARGIN    │ 76.3%            │ 88.1%            │ 90.7%            │
└──────────────────────────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

> [!WARNING]
> **Plan Pricing Not Finalized**: These plan margins represent realistic engineering estimates under an initial 20-customer operating model. Plan prices must not be considered final until customer discovery interviews validate willingness to pay, and pilot telemetry measures real-world search grounding query multipliers.

---

## 6. How to Run the Audited Cost Calculator

Execute the CLI tool to inspect real-time calculations:

```bash
npm run benchmark:cost
```

---

## 7. Cross-Reference Navigation
- **Benchmark Report**: [M0_BENCHMARK_REPORT.md](file:///D:/react-native/VISNORA/docs/M0_BENCHMARK_REPORT.md)
- **Technical Feasibility**: [M0_TECHNICAL_FEASIBILITY.md](file:///D:/react-native/VISNORA/docs/M0_TECHNICAL_FEASIBILITY.md)
- **Customer Discovery**: [M0_CUSTOMER_DISCOVERY.md](file:///D:/react-native/VISNORA/docs/M0_CUSTOMER_DISCOVERY.md)
- **Integrations Register**: [INTEGRATIONS.md](file:///D:/react-native/VISNORA/docs/INTEGRATIONS.md)
- **Roadmap**: [ROADMAP.md](file:///D:/react-native/VISNORA/docs/ROADMAP.md)
