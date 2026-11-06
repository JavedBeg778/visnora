# Visnora — Security, Privacy & Compliance Architecture

**Document Version:** 1.0  
**Baseline Date:** 4 November 2026  
**Document Stage:** Security Specification & Threat Model Baseline  
**Classification:** Internal Technical Security Blueprint  
**Document Owner:** Chief Information Security Officer & Security Engineer  
**Repository Context:** `D:\react-native\VISNORA`  

---

## 1. Security Philosophy & Principles

Visnora handles sensitive marketing strategies, competitor targeting lists, client rosters, and authorized ad network tokens. Security cannot be treated as an afterthought or relegated to client-side UI toggles.

### Fundamental Security Mandates:
1. **Server-Enforced Authorization**: Hiding a button, menu item, or navigation link in the frontend is **never** authorization. Every Route Handler and Server Action must validate session validity, tenant membership, and role permissions server-side.
2. **Tenant Isolation via Defense-in-Depth**: Multi-tenancy is guarded at three distinct boundaries:
   - Request Middleware (validates tenant context).
   - Domain Service Queries (explicit `WHERE organization_id = :id`).
   - PostgreSQL Row Level Security (hardware-enforced row isolation).
3. **Zero Secrets in Frontend Bundles**: No secret keys (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RAZORPAY_KEY_SECRET`, `APP_ENCRYPTION_KEY`) shall ever be prefixed with `NEXT_PUBLIC_` or bundled in client scripts.
4. **End-to-End Cryptographic Protection**: Third-party OAuth tokens and ad account credentials must be encrypted at rest using AES-256-GCM.
5. **Radical Auditability**: Every privileged administrative, financial, or data deletion event is logged to an immutable audit ledger.

---

## 2. Threat Modeling & STRIDE Analysis

| Threat Category | Potential Attack Vector in Visnora | Mitigation Architecture |
| :--- | :--- | :--- |
| **Spoofing** | Forged user session or impersonated payment webhook. | Supabase Auth cryptographically signed JWTs; HMAC-SHA256 signature verification on Razorpay webhooks. |
| **Tampering** | Interception or modification of competitor tracking lists or ad metrics. | Enforced TLS 1.3 in transit; SHA-256 cryptographic hashing on raw LLM responses to detect data manipulation. |
| **Repudiation** | User denies deleting a client project or modifying an agency prompt suite. | Append-only `audit_logs` table recording `actor_user_id`, `action`, `target_id`, `ip_address`, and `timestamp`. |
| **Information Disclosure** | Cross-tenant data leakage (Agency A viewing Agency B's prompts/clients). | Hardened PostgreSQL RLS policies; multi-tenant queries parameterizing `organization_id`. |
| **Denial of Service** | Abuse of LLM prompt execution queue to exhaust API budget. | Strict per-tier monthly quotas; BullMQ concurrency throttles; Upstash Redis rate limiting. |
| **Elevation of Privilege** | An `ANALYST` invites an `OWNER` or modifies billing subscriptions. | Strict server-side RBAC guards; role promotion restricted to verified Organization `OWNER`. |

---

## 3. Multi-Tenant Data Isolation Architecture

```
                       INCOMING REQUEST
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. EDGE MIDDLEWARE (Token Verification)                     │
│    • Supabase Auth verifies JWT signature & expiry          │
│    • Extracts authenticated `user_id`                       │
└─────────────────────────────┬───────────────────────────────┘
                              │ Valid Session
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. TENANT CONTEXT RESOLVER                                  │
│    • Inspects `X-Organization-Id` or Route Parameter        │
│    • Verifies user is an ACTIVE member of organization      │
│    • Attaches validated `TenantContext` to request          │
└─────────────────────────────┬───────────────────────────────┘
                              │ Valid Membership
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. APPLICATION DOMAIN SERVICE                               │
│    • Evaluates RBAC role against required operation         │
│    • Constructs query with explicit `organization_id` filter│
└─────────────────────────────┬───────────────────────────────┘
                              │ Scoped Query
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. POSTGRESQL ROW LEVEL SECURITY (RLS)                      │
│    • Hardware-level database barrier                        │
│    • Blocks record reads/writes if `organization_id` fails  │
│      matching `auth.get_user_organizations()`               │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Role-Based Access Control (RBAC) Specification

Visnora establishes five distinct operational roles:

1. **Platform Super Admin**: Visnora internal operator. Accesses the admin console, inspects system health, monitors aggregate queue performance, manages feature flags. Audited on all actions.
2. **Organization Owner**: Primary tenant owner. Manages billing, upgrades plans, manages payment methods, transfers ownership, invites admins, and deletes projects/organizations.
3. **Admin**: Operational team manager. Creates workspaces, sets up brand projects, connects ad accounts, manages prompt schedules, invites members, analysts, and viewers.
4. **Member / Analyst**: Operational team member. Configures projects, reviews evidence, inspects trends, and collaborates within workspaces. Cannot modify billing, change organization settings, or delete projects.
5. **Viewer**: Client stakeholder / read-only observer. Inspects dashboards, trends, and reports. Cannot run prompts or mutate configurations.

### 4.1 Tokenized Invitation Security & Session Policies
- **Cryptographic Generation**: Invitation tokens are generated via `crypto.randomBytes(32).toString('hex')` (256-bit entropy, 64 hex characters).
- **Time-Bounded Validity**: Invitations carry a strict 7-day expiration timestamp (`expires_at`), after which they transition to `EXPIRED`.
- **Single-Use State Machine**: An invitation transitions from `PENDING` to `ACCEPTED` inside a Prisma atomic transaction that simultaneously creates the `OrganizationMember` row. If revoked by an Admin/Owner, it is marked `REVOKED`.
- **Session Protection**: Supabase SSR Auth cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` (in production), preventing XSS token harvesting.

### RBAC Enforcement Function (Domain Service Standard)
```typescript
export function assertPermission(
  memberRole: OrgRole,
  requiredRole: OrgRole
): void {
  const roleHierarchy: Record<OrgRole, number> = {
    VIEWER: 1,
    MEMBER: 2,
    ANALYST: 2,
    ADMIN: 3,
    OWNER: 4,
  };

  if (roleHierarchy[memberRole] < roleHierarchy[requiredRole]) {
    throw new ForbiddenError(
      `Access denied: Operation requires ${requiredRole} privilege, but user has ${memberRole}.`
    );
  }
}
```

---

## 5. Cryptography & Secret Management

### 5.1 Application-Level Encryption for Integration Tokens
Credentials for external ad networks (Google Ads refresh tokens, Meta system tokens, OpenAI Ads keys) are encrypted using **AES-256-GCM** before persistence in PostgreSQL.

```
Plaintext Credential 
       │
       ▼
[AES-256-GCM Encryption Engine] <── APP_ENCRYPTION_KEY (32-byte secret)
       │                        <── Unique 12-byte IV per record (CSPRNG)
       ▼
Storage in `ad_connections`:
• `encrypted_credentials` (Ciphertext BYTEA)
• `iv` (Initialization Vector BYTEA)
• `auth_tag` (16-byte Authentication Tag BYTEA)
```

### 5.2 Server Secret Isolation
- `NEXT_PUBLIC_*` prefix is forbidden for any secret key.
- Environment configurations are loaded and validated via `@t3-oss/env-nextjs` or Zod during server initialization. If a required secret is absent, the application process crashes immediately on startup.
- Automated log masking: Loggers automatically redact keys matching `/bearer\s+[a-z0-9._-]+/i` or `/(key|secret|token|password)=[^&\s]+/i`.

---

## 6. Webhook Security & Idempotency Pipeline

To prevent replay attacks and fraudulent billing event spoofing:

1. **HMAC-SHA256 Signature Verification**:
   ```typescript
   export function verifyRazorpayWebhook(
     rawBody: string,
     signature: string,
     secret: string
   ): boolean {
     const expectedSignature = crypto
       .createHmac('sha256', secret)
       .update(rawBody)
       .digest('hex');
     return crypto.timingSafeEqual(
       Buffer.from(signature),
       Buffer.from(expectedSignature)
     );
   }
   ```
2. **Replay Defense & Deduplication**:
   - Each incoming webhook event ID is recorded in the `webhook_events` table within a serializable database transaction.
   - If an event ID has already been recorded, the handler immediately returns `HTTP 200 OK` and aborts re-processing.
   - Webhook timestamp tolerance: Events with timestamps older than 300 seconds are rejected.

---

## 7. Application Hardening & Web Defenses

### 7.1 SSRF (Server-Side Request Forgery) Protection
When users enter brand websites or landing page URLs for competitive intelligence analysis, Visnora prevents SSRF by blocking requests to private network ranges:
- Loopback addresses (`127.0.0.0/8`, `::1`)
- RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
- Cloud instance metadata addresses (`169.254.169.254`)
- Non-standard ports (allowing only 80 and 443)

### 7.2 Content Security Policy & Security Headers
Visnora applies standard HTTP security headers via Next.js configuration:
```javascript
// next.config.js security headers
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.razorpay.com;"
},
{ key: 'X-Content-Type-Options', value: 'nosniff' },
{ key: 'X-Frame-Options', value: 'DENY' },
{ key: 'X-XSS-Protection', value: '1; mode=block' },
{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
```

### 7.3 Rate Limiting Strategy
- Public API routes: **100 requests / 15 minutes / IP**.
- On-demand prompt execution: **10 runs / minute / tenant**.
- Authentication endpoints: **5 attempts / 15 minutes / IP**.

---

## 8. Privacy, Data Retention & Compliance

### 8.1 Regulatory Alignment
- **Digital Personal Data Protection Act, 2023 (DPDP, India)**: Visnora complies with data fiduciary obligations, transparent consent notices, purpose limitation, and user-initiated erasure.
- **GDPR & CCPA**: User data deletion mechanisms, exportable CSV summaries, cookie consent banners.

### 8.2 Data Minimization & Deletion Policy
- **No Consumer AI Data Collection**: Visnora strictly dispatches programmatic, marketing-related benchmark prompts. It never collects consumer chat logs or personal PII from AI engine users.
- **Self-Service Erasure**: When a tenant deletes a project or workspace, associated prompt runs, raw AI responses, extracted mentions, and ad snapshots are hard-deleted from PostgreSQL within 7 business days.

---

## 9. Incident Response & Breach Protocol

| Severity | Event Type | Initial Response Action (< 1 Hour) |
| :--- | :--- | :--- |
| **Critical** | Database credential leak or cross-tenant exposure. | Revoke compromised database roles; rotate master secrets; isolate affected tenant; notify founder immediately. |
| **High** | Third-party OAuth token compromised. | Revoke ad network tokens via provider API; purge encrypted tokens in DB; alert affected organization owner. |
| **Medium** | Upstream AI API extended outage or 429 flood. | Pause scheduled BullMQ workers; notify users via dashboard banner; resume with exponential backoff. |

---

## 10. Cross-Reference Navigation
- **Product Requirements**: [PRD.md](file:///D:/react-native/VISNORA/docs/PRD.md)
- **Technical Blueprint**: [TECHNICAL_BLUEPRINT.md](file:///D:/react-native/VISNORA/docs/TECHNICAL_BLUEPRINT.md)
- **Architecture Specification**: [ARCHITECTURE.md](file:///D:/react-native/VISNORA/docs/ARCHITECTURE.md)
- **Database Schema**: [DATABASE_DESIGN.md](file:///D:/react-native/VISNORA/docs/DATABASE_DESIGN.md)
- **API Contracts**: [API_CONTRACT.md](file:///D:/react-native/VISNORA/docs/API_CONTRACT.md)
- **Data Provenance**: [DATA_METHODOLOGY.md](file:///D:/react-native/VISNORA/docs/DATA_METHODOLOGY.md)
- **Development Roadmap**: [ROADMAP.md](file:///D:/react-native/VISNORA/docs/ROADMAP.md)
- **Integration Feasibility**: [INTEGRATIONS.md](file:///D:/react-native/VISNORA/docs/INTEGRATIONS.md)
- **Development Guidelines**: [DEVELOPMENT_GUIDELINES.md](file:///D:/react-native/VISNORA/docs/DEVELOPMENT_GUIDELINES.md)

