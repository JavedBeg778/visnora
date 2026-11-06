# Visnora — Milestone M0: Customer Discovery & Problem Validation Framework

**Document Version:** 1.0  
**Baseline Date:** 4 November 2026  
**Document Stage:** Customer Discovery Protocol & Qualitative Validation Baseline  
**Geographic Focus:** India (Bengaluru, NCR, Mumbai, Pune, Chennai, Hyderabad) & Global Remote  
**Document Owner:** Product Owner & SaaS Architect  
**Repository Context:** `D:\react-native\VISNORA`  

---

## 1. Governance & Strict Truth-in-Validation Notice

> [!IMPORTANT]
> **Strict Non-Fabrication Mandate**: In accordance with Visnora development guidelines, customer interview findings, customer feedback, willingness-to-pay metrics, and commercial market demand **shall never be fabricated or simulated**. This document establishes the formal customer discovery protocol, interview scripts, customer hypotheses, and validation criteria. It explicitly segregates **Hypotheses** from **Validated Findings**.

---

## 2. Customer Segment Hypotheses

Visnora hypothesizes that three distinct customer profiles experience acute, monetizable pain around AI search visibility:

### Hypothesis 1: Boutique Digital Marketing Agencies (5–30 Employees)
- **Profile**: Performance marketing and full-service digital agencies managing 10 to 50 active client retainers.
- **Pain Hypothesis**: Clients are beginning to ask *"Why isn't our brand showing up when prospective customers query ChatGPT and Google Gemini for recommendations?"* Agencies currently have no automated, defensible tool to monitor this, forcing account managers to perform manual queries or rely on vague assurances.
- **Value Hypothesis**: A multi-tenant workspace platform that automatically runs client prompt sets, tracks mentions against competitors, and generates proof-of-work CSV/PDF reports saves 15–20 hours of manual labor per month and justifies recurring agency retainers.
- **Willingness-to-Pay Hypothesis**: ₹4,999 to ₹14,999 / month per agency.

### Hypothesis 2: Independent SEO & GEO Consultants
- **Profile**: Specialized search engine optimization consultants and boutique SEO agencies transitioning into Generative Engine Optimization (GEO).
- **Pain Hypothesis**: Traditional rank trackers (Semrush, Ahrefs, Moz) track traditional SERP blue links, but do not systematically track which third-party domains and sources Google Gemini and ChatGPT cite in their generative AI summaries.
- **Value Hypothesis**: Precise citation extraction and domain authority mapping showing exactly which review sites (G2, Trustpilot, YourStory) must be influenced to gain AI search presence.
- **Willingness-to-Pay Hypothesis**: ₹1,499 to ₹3,999 / month.

### Hypothesis 3: In-House Marketing & Brand Growth Leads (Mid-Market SaaS / D2C)
- **Profile**: Heads of Marketing and Growth Leads at funded Indian startups and mid-market enterprises.
- **Pain Hypothesis**: Executive leadership inquires about brand sentiment and presence in AI answer engines, but marketing leads have no longitudinal time-series data to prove whether presence is expanding or declining.
- **Value Hypothesis**: Executive dashboards with Sample Share of Voice (SSOV), Observed Mention Rate (OMR), and competitive benchmarking.
- **Willingness-to-Pay Hypothesis**: ₹3,999 to ₹9,999 / month.

---

## 3. The 15 Structured Discovery Interview Questions

The following questions must be administered verbatim during 30-minute discovery interviews with target prospects. Responses must be documented verbatim in an internal interview log:

### Current Workflow & Awareness (Questions 1–4)
1. *"How do your clients or executive stakeholders currently ask about your brand's presence in generative AI answer tools like ChatGPT, Google Gemini, or Perplexity?"*
2. *"What manual steps, if any, does your team currently take to check whether your brand or your clients appear in AI answers?"*
3. *"How many hours per week or month does your team spend manually querying AI search engines for brand monitoring?"*
4. *"What tools do you currently use for your primary monthly client search and competitive reporting?"*

### Pain Points & Limitations (Questions 5–8)
5. *"When an AI engine recommends a direct competitor instead of your brand, how do you diagnose why that occurred?"*
6. *"How do you identify which third-party websites or review sources the AI engine cited to justify its recommendations?"*
7. *"What is the most frustrating limitation of traditional SEO tools (like Semrush or Ahrefs) when it comes to generative AI search?"*
8. *"Have you ever had a client demand proof-of-work regarding their AI search visibility, and how did you satisfy that request?"*

### Competitive Ad Intelligence (Questions 9–11)
9. *"How does your team currently research competitor advertising creatives on Google Ads and Meta Ads?"*
10. *"Do you use public ad registries (like Meta Ad Library or Google Transparency Center), and what are their biggest workflow bottlenecks?"*
11. *"Would you value viewing your own connected ad account performance side-by-side with competitive AI visibility data?"*

### Willingness-to-Pay & Commercial Valuation (Questions 12–15)
12. *"If a software tool ran 50 of your critical buying queries daily across Google Gemini and ChatGPT, extracted exact citation sources, and provided client-ready exportable reports, what would that be worth to your business per month?"*
13. *"What software subscription in your current marketing stack would this replace or complement?"*
14. *"What specific feature or proof would your team require before entering a credit card or authorizing a ₹2,999 to ₹9,999 monthly subscription?"*
15. *"Would you be willing to participate in a 14-day assisted pilot using your real brand keywords to review sample reports with us?"*

---

## 4. Alternative Solutions & Competitive Landscape

```
┌───────────────────────────┬───────────────────────────────────┬────────────────────────────────────────┐
│ Current Alternative       │ Strengths                         │ Critical Limitations for Indian Market │
├───────────────────────────┼───────────────────────────────────┼────────────────────────────────────────┤
│ Manual Prompts in ChatGPT │ Free, immediate, exploratory.     │ Not repeatable, zero history tracking, │
│ & Gemini UI               │                                   │ no multi-client reporting, labor-heavy.│
│ Semrush / Ahrefs          │ Massive traditional SERP index,   │ Built for traditional blue links;      │
│                           │ robust keyword volume estimates.  │ no prompt-level LLM citation tracking. │
│ Otterly.ai / Peec.ai      │ Specialized AI monitoring,        │ Expensive USD pricing ($99–$499/mo),   │
│                           │ early mover advantage in US/EU.   │ no INR billing, no local ad intel.     │
│ Spreadsheets & Custom     │ Customized to agency template.    │ Highly fragile, manual data entry,     │
│ Google Sheets Scripts     │                                   │ breaks when AI layouts shift.          │
└───────────────────────────┴───────────────────────────────────┴────────────────────────────────────────┘
```

---

## 5. Customer Validation Gates (Prerequisites for Milestone M1)

Before allocating engineering resources to production multi-tenant database migrations or public onboarding, the following qualitative validation gates must be satisfied:

- [ ] **Gate 1**: Conduct **10 to 15 completed interviews** across the target personas.
- [ ] **Gate 2**: At least **7 out of 10 interviewees** confirm that tracking generative AI citations is an active problem they have attempted to solve in the past 60 days.
- [ ] **Gate 3**: At least **3 prospective agencies** commit in writing to a paid pilot or structured trial upon MVP availability.
- [ ] **Gate 4**: Feedback confirms whether agencies prioritize **CSV raw exports** or **white-label executive PDF presentations** for their clients.

---

## 6. Current Validated Findings Status

| Validation Status | Record |
| :--- | :--- |
| **Interviews Completed** | 0 (Protocol established; field interviews scheduled for Discovery phase). |
| **Validated Findings** | None yet. All customer demand statements remain **Unverified Hypotheses** until field interview logs are formally documented. |
| **Integrity Assurance** | Zero fabricated customer quotes or synthetic demand metrics are present in this document. |

---

## 7. Cross-Reference Navigation
- **Benchmark Report**: [M0_BENCHMARK_REPORT.md](file:///D:/react-native/VISNORA/docs/M0_BENCHMARK_REPORT.md)
- **Unit Economics**: [M0_UNIT_ECONOMICS.md](file:///D:/react-native/VISNORA/docs/M0_UNIT_ECONOMICS.md)
- **Technical Feasibility**: [M0_TECHNICAL_FEASIBILITY.md](file:///D:/react-native/VISNORA/docs/M0_TECHNICAL_FEASIBILITY.md)
- **PRD**: [PRD.md](file:///D:/react-native/VISNORA/docs/PRD.md)
- **Roadmap**: [ROADMAP.md](file:///D:/react-native/VISNORA/docs/ROADMAP.md)

