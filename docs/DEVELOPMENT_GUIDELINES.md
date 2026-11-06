# Visnora — Engineering Standards & Development Guidelines

**Document Version:** 1.0  
**Baseline Date:** 4 November 2026  
**Document Stage:** Engineering Standard & Code Quality Baseline  
**Document Owner:** Full-Stack Engineering Lead & Technical Architect  
**Repository Context:** `D:\react-native\VISNORA`  

---

## 1. Engineering Philosophy & Core Principles

Visnora is engineered to be a sustainable, scalable commercial SaaS product developed under a solo-founder model. To guarantee longevity, reliability, and ease of maintenance, code quality must be uncompromising from Day 1.

### Core Commandments:
1. **Clarity Over Cleverness**: Write readable, predictable, self-documenting TypeScript code. Avoid convoluted abstractions or premature meta-programming.
2. **Strict Static Typing**: The TypeScript compiler is our first line of defense. The `any` keyword is strictly banned in production code.
3. **Explicit Domain Boundaries**: Code within `domain/ai-visibility` must not directly mutate tables or state in `domain/billing`. All cross-domain communication must use typed domain service APIs.
4. **Data Isolation Everywhere**: Never write a database query without an explicit `organization_id` filter unless executing platform-level migrations or authorized super-admin maintenance tasks.
5. **Preserve Documentation Integrity**: Update documentation alongside code. Outdated documentation is technical debt.

---

## 2. TypeScript & Code Standards

### 2.1 Compiler Configuration
Visnora runs on TypeScript 5+ with strict mode enforced in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/app/*": ["apps/web/app/*"],
      "@/components/*": ["apps/web/components/*"],
      "@/domain/*": ["packages/domain/*"],
      "@/database/*": ["packages/database/*"],
      "@/integrations/*": ["packages/integrations/*"],
      "@/jobs/*": ["packages/jobs/*"],
      "@/shared/*": ["packages/shared/*"]
    }
  }
}
```

### 2.2 Typing Standards
- Derive data contracts from **Zod Schemas** using `z.infer<typeof Schema>` to keep validation logic and TypeScript types in lockstep.
- Use explicit return types on all exported functions, domain methods, and API route handlers.
- Handle `null` and `undefined` explicitly; do not use non-null assertions (`!`) unless proven safe by preceding runtime invariants.

---

## 3. Next.js & React Coding Conventions

### 3.1 React Server Components (RSC) by Default
- All pages and layout components in `apps/web/app` are Server Components by default.
- Data fetching occurs on the server using direct domain service calls, eliminating unnecessary REST hops within the server environment.
- Minimize client bundle footprint: push `'use client'` directives to the lowest possible leaf components in the component tree (e.g., interactive button toggles, modals, or charting wrappers).

### 3.2 Server Actions & Form Mutations
- Perform mutations using Next.js Server Actions with Zod validation:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { CreateTrackedPromptSchema } from '@/shared/validation/prompts';
import { aiVisibilityService } from '@/domain/ai-visibility/service';
import { requireTenantContext } from '@/shared/permissions/tenant';

export async function createPromptAction(formData: FormData) {
  const context = await requireTenantContext();
  const rawInput = Object.fromEntries(formData.entries());
  
  const parsed = CreateTrackedPromptSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  await aiVisibilityService.createTrackedPrompt(context, parsed.data);
  revalidatePath('/dashboard/ai-visibility/prompts');
  return { success: true };
}
```

---

## 4. Database Access & Migration Rules

1. **Single Schema Authority**: The schema is defined exclusively in `packages/database/prisma/schema.prisma`. Direct hand-edits to database schemas or live tables are forbidden.
2. **Migration Discipline**:
   - Every schema change requires a clean, tested migration generated with `npx prisma migrate dev`.
   - Never edit existing, applied migration files.
3. **Multi-Tenancy Guardrail**: Every query involving tenant entities must enforce tenant isolation:
   ```typescript
   // Correct
   const prompts = await prisma.trackedPrompt.findMany({
     where: {
       organizationId: context.organizationId,
       projectId: input.projectId,
     },
   });

   // FORBIDDEN - Security vulnerability (IDOR / cross-tenant leak)
   const prompts = await prisma.trackedPrompt.findMany({
     where: { projectId: input.projectId },
   });
   ```
4. **Transactional Atomic Writes**: Multi-table state mutations (e.g., creating a prompt run, raw response, and extracted mentions) must execute inside `prisma.$transaction([...])`.

---

## 5. Testing & Verification Standards

Visnora enforces a multi-tiered automated testing regime:

```
┌────────────────────────────────────────────────────────┐
│                   TESTING PYRAMID                      │
├─────────────────────┬──────────────────────────────────┤
│ Level               │ Tools & Scope                    │
├─────────────────────┼──────────────────────────────────┤
│ 1. Unit Tests       │ Vitest                           │
│                     │ • OMR, SSOV, Coverage formulas   │
│                     │ • Brand mention regex & parsing  │
│                     │ • RBAC assertPermission checks   │
├─────────────────────┼──────────────────────────────────┤
│ 2. Integration Tests│ Vitest + Testcontainers Postgres │
│                     │ • Prisma model constraints       │
│                     │ • Row Level Security isolation   │
│                     │ • Razorpay webhook signature/log │
├─────────────────────┼──────────────────────────────────┤
│ 3. E2E Tests        │ Playwright                       │
│                     │ • Signup -> Workspace -> Project │
│                     │ • Prompt creation -> Run -> CSV  │
└─────────────────────┴──────────────────────────────────┘
```

- **Execution Command**:
  - `npm run test` (executes Vitest unit & integration suites).
  - `npm run test:e2e` (executes Playwright end-to-end flows).
- **Target Coverage**: ≥85% code coverage for `domain/` and `shared/permissions/` packages.

---

## 6. Security, Secrets & Git Hygiene

1. **Zero Secret Leaks**:
   - The `.env` file is git-ignored.
   - Maintain `.env.example` with descriptive, sanitized placeholders.
   - Never copy or display real API keys, service role tokens, or database passwords in conversation logs, pull requests, or code comments.
2. **Git Commit Conventions**:
   Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
   - `feat(prompts): add regex word-boundary brand mention extractor`
   - `fix(auth): prevent cross-tenant workspace slug collision`
   - `docs(roadmap): update M2 milestone acceptance criteria`
   - `test(billing): verify razorpay webhook idempotency transaction`
3. **Clean Codebase Verification**:
   Before submitting code for milestone completion, run the verification pipeline:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

---

## 7. Definition of Done (DoD) for Milestones

A milestone is considered **DONE** only when:
- [ ] All specified functional requirements and database tables are implemented.
- [ ] Server-side authorization and multi-tenant isolation are verified by automated tests.
- [ ] TypeScript compiles with zero errors under strict mode.
- [ ] ESLint passes with zero warnings.
- [ ] Unit and integration tests pass with 100% success rate.
- [ ] Associated documentation in `docs/` is updated and synchronized.
- [ ] No production secrets, mock APIs, or fabricated metrics exist in the codebase.

---

## 8. Cross-Reference Navigation
- **Product Requirements**: [PRD.md](file:///D:/react-native/VISNORA/docs/PRD.md)
- **Technical Blueprint**: [TECHNICAL_BLUEPRINT.md](file:///D:/react-native/VISNORA/docs/TECHNICAL_BLUEPRINT.md)
- **Architecture Specification**: [ARCHITECTURE.md](file:///D:/react-native/VISNORA/docs/ARCHITECTURE.md)
- **Database Schema**: [DATABASE_DESIGN.md](file:///D:/react-native/VISNORA/docs/DATABASE_DESIGN.md)
- **API Contracts**: [API_CONTRACT.md](file:///D:/react-native/VISNORA/docs/API_CONTRACT.md)
- **Security Blueprint**: [SECURITY.md](file:///D:/react-native/VISNORA/docs/SECURITY.md)
- **Data Provenance**: [DATA_METHODOLOGY.md](file:///D:/react-native/VISNORA/docs/DATA_METHODOLOGY.md)
- **Development Roadmap**: [ROADMAP.md](file:///D:/react-native/VISNORA/docs/ROADMAP.md)
- **Integration Feasibility**: [INTEGRATIONS.md](file:///D:/react-native/VISNORA/docs/INTEGRATIONS.md)

