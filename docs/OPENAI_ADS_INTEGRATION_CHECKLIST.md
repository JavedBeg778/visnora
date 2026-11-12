# Visnora — OpenAI ChatGPT Ads Live Integration Checklist

**Status:** Architecture Implemented & Fail-Closed Verified (Awaiting External Advertiser Credentials)  
**Security Standard:** Strict Zero-Fake-ID Enforcement (Never generates synthetic IDs or bypasses remote verification)

---

## 1. Overview & Current Security Baseline

Milestone M6 (ChatGPT Ads Intelligence) is fully implemented in the Visnora codebase with complete fail-closed integrity:
- **AES-256-GCM Encryption**: Account credentials and API keys are encrypted at rest using `ENCRYPTION_KEY`.
- **Zero Fake IDs**: Unlike earlier prototypes, services strictly refuse to generate placeholder IDs (`camp_${Date.now()}` or `pix_...`).
- **Fail-Closed Semantics**: If credentials are unset or the external API call fails, Visnora returns `NOT_CONFIGURED` or `BLOCKED_EXTERNAL_DEPENDENCY`.
- **Financial Safeguards**: New campaigns default to `PAUSED` until budget and funding are verified.

To enable live remote provisioning with OpenAI, the following prerequisites must be fulfilled by the organization.

---

## 2. Organization Eligibility & Access Requirements

- [ ] **OpenAI Developer & Ads Program Approval**:
  - The organization must have an active OpenAI Developer Platform account enrolled in the OpenAI Ads / Sponsored Contexts pilot program.
  - Organization ID (`org-...`) with advertiser permissions.
- [ ] **Billing & Spend Commitment**:
  - Verified payment method linked to the OpenAI Developer account.
  - Active advertising budget allocation for sponsored conversational slots.
- [ ] **API Key Scopes**:
  - API Key generated specifically for advertising automation.
  - Required scopes: `ads.campaigns.write`, `ads.ad_groups.write`, `ads.creatives.write`, `ads.conversions.write`, `ads.insights.read`.

---

## 3. Account Credential Setup & Encryption Verification

1. **Configure Encryption Key**:
   Ensure `ENCRYPTION_KEY` is set in the environment:
   ```bash
   # Generate a 32-byte hex key
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Connect Account in Dashboard**:
   - Navigate to `/chatgpt-ads/settings`.
   - Click **Connect OpenAI Ads Account**.
   - Input:
     - Account Name (e.g., `Acme Corp Main`)
     - OpenAI Organization ID (`org-xxxxxxxxxxxx`)
     - API Key (`oa_ads_...`)
     - Currency (`USD`, `INR`, `EUR`)
     - Timezone (`UTC`, `Asia/Kolkata`, `America/New_York`)
3. **Verify Encryption at Rest**:
   - Confirm that the database `ChatGPTAdsAccount` record stores `encryptedApiKey` with an initialization vector (`iv`) and auth tag (`tag`), and never plaintext keys.

---

## 4. Live API Endpoint Verification Checklist

Once valid credentials are configured, execute the following staged verification:

### 4.1 Campaign API Verification
- [ ] Call `POST /api/v1/chatgpt-ads/campaigns`:
  - Payload: `{ name: "Pilot AI Search 2026", objective: "CONVERSIONS", dailyBudget: 5000 }`
  - Verify remote HTTP 201 response containing genuine OpenAI campaign ID (`cmp_live_...`).
  - Verify campaign initializes with status `PAUSED`.

### 4.2 Ad Group & Targeting Verification
- [ ] Call `POST /api/v1/chatgpt-ads/ad-groups`:
  - Payload: `{ campaignId: "...", name: "SaaS Decision Makers", targeting: { contexts: ["enterprise software", "crm"] } }`
  - Verify remote HTTP 201 response containing genuine OpenAI ad group ID (`ag_live_...`).

### 4.3 Creative Studio & Asset Upload
- [ ] Call `POST /api/v1/chatgpt-ads/ads`:
  - Upload headline, prompt triggers, destination URL, and optional conversational creative card.
  - Verify remote creative approval webhook / status check.

### 4.4 Conversions API & Pixel Tracking
- [ ] Connect Conversions Pixel via `/api/v1/chatgpt-ads/conversions/pixel`:
  - Confirm OpenAI Conversions API endpoint accepts test conversion payload.
  - Verify SHA-256 deduplication hashing ensures zero duplicate attribution.

### 4.5 Performance & Analytics Sync
- [ ] Run manual sync via `POST /api/v1/chatgpt-ads/sync`:
  - Verify BullMQ background job processes metrics and writes to `ChatGPTAdsMetric` without hardcoding currency symbols.

