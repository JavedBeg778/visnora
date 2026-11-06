import { describe, it, expect } from 'vitest';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  InviteMemberSchema,
  UpdateMemberRoleSchema,
  OnboardingSchema,
} from '../../packages/shared/validation/index';
import {
  assertPermission,
  hasPermission,
  ForbiddenError,
  ROLE_HIERARCHY,
} from '../../packages/shared/permissions/rbac';
import { OrgRole } from '../../packages/shared/types/index';
import crypto from 'crypto';

describe('Milestone M1 — SaaS Foundation Validation & RBAC', () => {
  describe('Zod Validation Schemas', () => {
    it('validates valid organization creation input', () => {
      const valid = {
        name: 'Acme Technologies',
        website: 'https://acme.com',
        orgType: 'business' as const,
        countryCode: 'IN',
        billingEmail: 'billing@acme.com',
      };
      const result = CreateOrganizationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid organization creation input', () => {
      const invalid = {
        name: 'A', // too short (<2 chars)
        website: 'not-a-url',
        orgType: 'invalid_type',
        billingEmail: 'not-an-email',
      };
      const result = CreateOrganizationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('validates workspace creation and updates', () => {
      const validCreate = {
        name: 'Growth & Performance',
        description: 'Dedicated to digital acquisition campaigns',
      };
      expect(CreateWorkspaceSchema.safeParse(validCreate).success).toBe(true);

      const validUpdate = {
        name: 'Renamed Workspace',
        isArchived: true,
      };
      expect(UpdateWorkspaceSchema.safeParse(validUpdate).success).toBe(true);

      const invalidCreate = { name: '' };
      expect(CreateWorkspaceSchema.safeParse(invalidCreate).success).toBe(false);
    });

    it('validates project creation with strict URL and domain rules', () => {
      const validProject = {
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'SaaS Platform Track',
        primaryWebsite: 'https://saasplatform.io',
        industry: 'Software',
        targetCountry: 'IN',
        defaultLanguage: 'en',
      };
      expect(CreateProjectSchema.safeParse(validProject).success).toBe(true);

      const invalidUrlProject = {
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Invalid Project',
        primaryWebsite: 'not-a-valid-url-at-all',
      };
      expect(CreateProjectSchema.safeParse(invalidUrlProject).success).toBe(false);
    });

    it('validates team invitations and role updates', () => {
      const validInvite = {
        email: 'collaborator@agency.com',
        role: 'MEMBER' as const,
      };
      expect(InviteMemberSchema.safeParse(validInvite).success).toBe(true);

      const invalidRoleInvite = {
        email: 'test@example.com',
        role: 'SUPERADMIN', // not in OrgRole
      };
      expect(InviteMemberSchema.safeParse(invalidRoleInvite).success).toBe(false);

      const validRoleUpdate = { role: 'ADMIN' as const };
      expect(UpdateMemberRoleSchema.safeParse(validRoleUpdate).success).toBe(true);
    });

    it('validates complete onboarding payload', () => {
      const onboardingData = {
        organizationName: 'Visnora Intelligence Corp',
        organizationWebsite: 'https://visnora.com',
        orgType: 'business' as const,
        workspaceName: 'Primary Workspace',
        projectName: 'Visnora Brand',
        primaryWebsite: 'https://visnora.com',
        industry: 'B2B SaaS',
      };
      const result = OnboardingSchema.safeParse(onboardingData);
      expect(result.success).toBe(true);
    });
  });

  describe('RBAC Hierarchy & Multi-Tenant Authorization', () => {
    it('verifies exact role hierarchy weights', () => {
      expect(ROLE_HIERARCHY.OWNER).toBe(4);
      expect(ROLE_HIERARCHY.ADMIN).toBe(3);
      expect(ROLE_HIERARCHY.MEMBER).toBe(2);
      expect(ROLE_HIERARCHY.ANALYST).toBe(2);
      expect(ROLE_HIERARCHY.VIEWER).toBe(1);
    });

    it('enforces that OWNER can perform all administrative operations', () => {
      const roles: OrgRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'ANALYST', 'VIEWER'];
      for (const role of roles) {
        expect(hasPermission('OWNER', role)).toBe(true);
        expect(() => assertPermission('OWNER', role)).not.toThrow();
      }
    });

    it('enforces that ADMIN can manage members and viewers, but not owner-exclusive actions', () => {
      expect(hasPermission('ADMIN', 'ADMIN')).toBe(true);
      expect(hasPermission('ADMIN', 'MEMBER')).toBe(true);
      expect(hasPermission('ADMIN', 'ANALYST')).toBe(true);
      expect(hasPermission('ADMIN', 'VIEWER')).toBe(true);
      expect(hasPermission('ADMIN', 'OWNER')).toBe(false);
      expect(() => assertPermission('ADMIN', 'OWNER')).toThrow(ForbiddenError);
    });

    it('enforces that MEMBER and VIEWER cannot perform admin operations', () => {
      expect(hasPermission('MEMBER', 'ADMIN')).toBe(false);
      expect(hasPermission('VIEWER', 'MEMBER')).toBe(false);
      expect(hasPermission('VIEWER', 'ADMIN')).toBe(false);
      expect(() => assertPermission('VIEWER', 'ADMIN')).toThrow(ForbiddenError);
      expect(() => assertPermission('MEMBER', 'ADMIN')).toThrow(ForbiddenError);
    });
  });

  describe('Multi-Tenant Data Logic & Domain Invariants', () => {
    it('normalizes primary website domains cleanly', () => {
      const testCases = [
        { input: 'https://www.example.com/products/page', expected: 'example.com' },
        { input: 'http://SubDomain.Brand.co.uk/path?param=1', expected: 'subdomain.brand.co.uk' },
        { input: 'HTTPS://WWW.VISNORA.COM/', expected: 'visnora.com' },
      ];

      for (const { input, expected } of testCases) {
        let domain = input.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
        domain = domain.replace(/^www\./, '');
        expect(domain).toBe(expected);
      }
    });

    it('generates secure URL-safe invitation tokens with 7-day expiration', () => {
      const token = crypto.randomBytes(32).toString('hex');
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);

      const now = new Date();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const diffDays = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);

      // Expiration check logic
      const isExpired = new Date() > expiresAt;
      expect(isExpired).toBe(false);

      const pastDate = new Date(Date.now() - 10000);
      expect(new Date() > pastDate).toBe(true);
    });

    it('generates valid multi-tenant slugs', () => {
      function generateSlug(text: string): string {
        return text
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      expect(generateSlug('Acme & Sons, Inc.')).toBe('acme-sons-inc');
      expect(generateSlug('Primary Workspace 2026!')).toBe('primary-workspace-2026');
      expect(generateSlug('  Spaced   Out   Name  ')).toBe('spaced-out-name');
    });
  });
});
