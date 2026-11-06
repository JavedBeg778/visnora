# Visnora — Data Provenance & Metric Methodology

**Document Version:** 1.0  
**Baseline Date:** 4 November 2026  
**Document Stage:** Data Governance & Metric Calculation Baseline  
**Document Owner:** Head of Data Science & Product Architect  
**Repository Context:** `D:\react-native\VISNORA`  

---

## 1. Data Provenance & Classification Framework

In compliance with Visnora's core product principle of radical transparency, every numeric indicator, chart point, and analytical statement in the platform is strictly classified under one of five data provenance classes.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      DATA PROVENANCE TAXONOMY                          │
├────────────────────┬───────────────────────────────────────────────────┤
│ Data Class         │ Definition & Platform Treatment                   │
├────────────────────┼───────────────────────────────────────────────────┤
│ 1. Actual          │ Directly measured, deterministic internal events  │
│                    │ (e.g., prompt runs executed, invoices charged,    │
│                    │ active workspace count, user seats utilized).     │
├────────────────────┼───────────────────────────────────────────────────┤
│ 2. Observed        │ Verbatim output captured from an external platform│
│                    │ at a specific UTC timestamp (e.g., raw text of an │
│                    │ LLM answer, public ad creative text from library).│
├────────────────────┼───────────────────────────────────────────────────┤
│ 3. Sampled         │ Statistical aggregations computed over a bounded, │
│                    │ finite set of observed queries (e.g., Visnora's   │
│                    │ Observed Mention Rate and Sample Share of Voice). │
├────────────────────┼───────────────────────────────────────────────────┤
│ 4. Platform-       │ Authoritative campaign performance returned by an │
│    Reported        │ ad network API for an authorized account (e.g.,   │
│                    │ Google Ads spend, Meta impressions, ROAS).        │
├────────────────────┼───────────────────────────────────────────────────┤
│ 5. Estimated       │ Modeled or probabilistic approximations from third│
│                    │ parties (e.g., estimated search keyword volumes).  │
│                    │ Must always be badged with provider and date.     │
└────────────────────┴───────────────────────────────────────────────────┘
```

> [!WARNING]
> **Strict Truth-in-Reporting Mandate**: Never display sampled AI prompt observations as "Total Global Market Share", "Total Consumer AI Search Volume", or "Market-Wide Visibility". Misleading data labels destroy agency credibility and violate Visnora product ethics.

---

## 2. Module A: AI Visibility Intelligence Methodology

### 2.1 Formal Mathematical Formulations

#### 1. Observed Mention Rate ($\text{OMR}$)
The Observed Mention Rate measures the percentage of successful prompt responses in which a specific brand was detected.

$$\text{OMR}_{\text{brand}} = \left( \frac{\sum_{i=1}^{N} \mathbb{I}(\text{brand appears in response } i)}{N_{\text{successful}}} \right) \times 100$$

*Where:*
- $N_{\text{successful}}$ = Total count of successfully collected prompt responses within the selected time window, provider, and project filter.
- $\mathbb{I}(\dots)$ = Binary indicator function evaluating to $1$ if the canonical brand or an approved alias was extracted, and $0$ otherwise.
- **Reporting Requirement**: Displayed alongside sample size $N$ (e.g., "72% OMR ($n = 50$ runs)").

#### 2. Sample Share of Voice ($\text{SSOV}$)
The Sample Share of Voice evaluates the relative prominence of a brand compared to its tracked competitor set within the tested prompt runs.

$$\text{SSOV}_{\text{brand}} = \left( \frac{M_{\text{brand}}}{M_{\text{brand}} + \sum_{c \in C} M_{c}} \right) \times 100$$

*Where:*
- $M_{\text{brand}}$ = Total number of mentions extracted for the target brand across the eligible prompt sample.
- $C$ = Set of active competitor entities configured for the project.
- $M_{c}$ = Total number of mentions extracted for competitor $c$.
- **Display Constraint**: The platform must explicitly expose the total mention count denominator in the UI tooltip (e.g., "35% SSOV (based on 28 brand mentions out of 80 total brand/competitor mentions across 30 prompt runs)").

#### 3. Prompt Coverage ($\text{PC}$)
Measures execution fidelity across the user's active prompt catalog.

$$\text{PC} = \left( \frac{P_{\text{executed}}}{P_{\text{total active}}} \right) \times 100$$

*Where:*
- $P_{\text{executed}}$ = Count of distinct active prompts that completed at least one successful collection run during the period.
- $P_{\text{total active}}$ = Total count of active tracked prompts configured in the project.

#### 4. Average Mention Position ($\text{AMP}$)
Evaluates the positional placement of a brand when the AI answer provides an ordered or ranked recommendation list.

$$\text{AMP}_{\text{brand}} = \frac{1}{K} \sum_{k=1}^{K} \text{Rank}_{k}$$

*Where:*
- $K$ = Count of responses where the brand was extracted within an explicit ordered list (`1.`, `2.`, `3.`).
- $\text{Rank}_{k}$ = The integer ordinal rank in response $k$.
- **Boundary Condition**: If the response is unstructured narrative prose without explicit list ranking, $\text{AMP}$ is null and the UI displays `"Unstructured / Not Measurable"`.

#### 5. Composite AI Visibility Score (0–100 Normalized Metric — Implemented in M2)
The platform-wide normalized composite score synthesizing presence, market share of voice, source validation, and contextual sentiment:

$$\text{AI Visibility Score} = 0.45 \times \text{OMR} + 0.25 \times \text{SSOV} + 0.15 \times \text{Citation Rate} + 0.15 \times \text{Positive Sentiment Rate}$$

*Where:*
- $\text{OMR} \in [0, 100]$: Percentage of completed prompt responses mentioning the brand (45% max weight).
- $\text{SSOV} \in [0, 100]$: Percentage of total observed brand and competitor mentions captured by the primary brand (25% max weight).
- $\text{Citation Rate} \in [0, 100]$: Percentage of prompt responses citing the brand's verified domain (15% max weight).
- $\text{Positive Sentiment Rate} \in [0, 100]$: Percentage of brand mentions classified with positive recommendation sentiment (15% max weight).
- **Sampling Boundary**: Automatically handles 0-denominator edge cases without division-by-zero errors. Capped strictly between $0.0$ and $100.0$.

---

### 2.2 Brand & Competitor Entity Extraction Pipeline

```
Raw Response Text
       │
       ▼
[Text Normalizer] ──> Lowercases (preserving case-sensitive spans), normalizes unicode whitespace
       │
       ▼
[Regex & Boundary Matcher]
       │ • Matches canonical name and aliases using word boundaries (`\b`)
       │ • Rejects negative false-positives (e.g., "Apple pie" vs "Apple Inc")
       │ • Disambiguates domain mentions (e.g., "visnora.com")
       ▼
[Span & Context Extractor]
       │ • Captures `char_start` and `char_end`
       │ • Extracts a 100-character surrounding excerpt for human verification
       │ • Assigns Extraction Confidence:
       │    - Exact Canonical Match: 1.00
       │    - Exact Alias Match:     0.90
       │    - Domain / URL Match:    0.85
       ▼
[Persistence] ──> Writes verified occurrences into `response_mentions` table
```

---

### 2.3 Grounding & Citation Extraction

When queries run against providers supporting search grounding (e.g., Google Gemini with Google Search tool or OpenAI with Search), returned web citations are ingested:
1. **URL Normalization**: Strips tracking parameters (`utm_*`, `gclid`, `fbclid`).
2. **Domain Extraction**: Isolates canonical root domain (e.g., `forbes.com`, `g2.com`).
3. **Citation Ordering**: Records the index/order in which the source was cited by the AI model.
4. **Competitive Authority Mapping**: Aggregates which third-party domains are cited most frequently when competitors are recommended.

---

### 2.4 Longitudinal Comparison & Like-for-Like Tracking
AI models are dynamic and update unpredictably. To ensure reliable historical trend analysis:
- **Segmentation Guardrail**: Visnora prevents combining runs from different providers (e.g., OpenAI vs Gemini) or drastically different model versions (e.g., GPT-4o vs GPT-4o-mini) into a single continuous metric line.
- **Prompt Set Change Annotations**: If a user adds or pauses prompts in a project, a vertical "Configuration Modified" marker is rendered on the trend chart to notify users that sample composition shifted.

---

## 3. Module B: Ad Intelligence Data Methodology

### 3.1 First-Party Platform-Reported Data
- **Source**: Official developer APIs (Google Ads API, Meta Marketing API).
- **Attribution Windows**: Preserves platform-specific attribution settings (e.g., Google Ads 30-day click / Meta 7-day click + 1-day view).
- **Timezone Alignment**: Aggregates daily spend and conversions according to the ad account's configured operational timezone, converting to UTC for database storage.
- **Currency Normalization**: Ad spend is ingested in account currency and converted to tenant base currency using daily exchange rate feeds where cross-currency reporting is enabled.

### 3.2 Public Observed Ad Data
- **Source**: Meta Ad Library API, Google Ads Transparency Center.
- **Provenance Rules**: Ad creatives are recorded with `first_observed_at`, `last_observed_at`, creative text, and media type.
- **Strict Limitation**: Private competitor metrics (spend, impressions, clicks, targeting exclusions) are never guessed or manufactured. The UI explicitly states: *"Creative data captured from public ad transparency registries. Exact competitor spend and clicks are private to the advertiser."*

---

## 4. Module C: ChatGPT Ads Intelligence Methodology

- **Account Boundaries**: All campaign, ad set, and creative delivery data is ingested directly from the customer's own authorized OpenAI Ads Advertiser account.
- **No Inferred Attribution**: Visnora will not fabricate connections between consumer prompt logs and ad impressions. Only platform-reported ad delivery events returned by the OpenAI Ads API are displayed.

---

## 5. Summary of Metric Trust Disclaimers

Every report export (CSV/PDF) and UI widget includes standard methodology disclaimers:
> *"Visnora calculates AI Visibility metrics based on periodic programmatic queries executed against external generative AI models under controlled conditions. These metrics represent sampled observations across the specified prompt set and do not constitute universal consumer search volume or guaranteed search engine rankings."*

---

## 6. Cross-Reference Navigation
- **Product Requirements**: [PRD.md](file:///D:/react-native/VISNORA/docs/PRD.md)
- **Technical Blueprint**: [TECHNICAL_BLUEPRINT.md](file:///D:/react-native/VISNORA/docs/TECHNICAL_BLUEPRINT.md)
- **Architecture Specification**: [ARCHITECTURE.md](file:///D:/react-native/VISNORA/docs/ARCHITECTURE.md)
- **Database Schema**: [DATABASE_DESIGN.md](file:///D:/react-native/VISNORA/docs/DATABASE_DESIGN.md)
- **API Contracts**: [API_CONTRACT.md](file:///D:/react-native/VISNORA/docs/API_CONTRACT.md)
- **Security Blueprint**: [SECURITY.md](file:///D:/react-native/VISNORA/docs/SECURITY.md)
- **Development Roadmap**: [ROADMAP.md](file:///D:/react-native/VISNORA/docs/ROADMAP.md)
- **Integration Feasibility**: [INTEGRATIONS.md](file:///D:/react-native/VISNORA/docs/INTEGRATIONS.md)
- **Development Guidelines**: [DEVELOPMENT_GUIDELINES.md](file:///D:/react-native/VISNORA/docs/DEVELOPMENT_GUIDELINES.md)

