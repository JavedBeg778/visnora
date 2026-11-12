// Visnora — Phase 1 Security Hardening Unit Tests
// Covers Audit Findings 1, 4, 5, 6, 11, 12

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimitStore } from '../../packages/shared/security/rate-limiter';

// Mock database client
vi.mock('../../packages/database/src/client', () => {
  return {
    prisma: {
      organizationMember: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        create: vi.fn(),
      },
      invitation: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
      },
      userProfile: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn((callback) => callback({
        invitation: {
          findUnique: vi.fn(),
          updateMany: vi.fn(),
        },
        organizationMember: {
          findUnique: vi.fn(),
          update: vi.fn(),
          create: vi.fn(),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-tx-1' }),
        },
      })),
    },
  };
});

import { prisma } from '../../packages/database/src/client';
import {
  createInvitation,
  acceptInvitation,
} from '../../packages/domain/administration/invitation-service';
import {
  updateMemberRole,
  removeMember,
} from '../../packages/domain/organizations/service';

describe('Phase 1 Security Hardening Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
  });

  describe('Finding 11: Rate Limiter', () => {
    it('allows requests within the configured limit and blocks when exceeded', async () => {
      const key = 'test-client-ip-1';
      const customConfig = { maxRequests: 3, windowSeconds: 60 };

      const res1 = await checkRateLimit(key, 'AUTH', customConfig);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = await checkRateLimit(key, 'AUTH', customConfig);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = await checkRateLimit(key, 'AUTH', customConfig);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      const res4 = await checkRateLimit(key, 'AUTH', customConfig);
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.resetSeconds).toBeGreaterThan(0);
    });

    it('isolates different clients/keys', async () => {
      const customConfig = { maxRequests: 1, windowSeconds: 60 };

      const resA = await checkRateLimit('user-a', 'API_GENERAL', customConfig);
      expect(resA.allowed).toBe(true);

      const resA2 = await checkRateLimit('user-a', 'API_GENERAL', customConfig);
      expect(resA2.allowed).toBe(false);

      // User B should still be allowed
      const resB = await checkRateLimit('user-b', 'API_GENERAL', customConfig);
      expect(resB.allowed).toBe(true);
    });
  });

  describe('Finding 6: Invitation Role Validation & OWNER Restrictions', () => {
    it('strictly forbids creating an invitation with OWNER role', async () => {
      // Mock actor as OWNER
      (prisma.organizationMember.findUnique as any).mockResolvedValueOnce({
        id: 'member-owner-1',
        organizationId: 'org-1',
        userId: 'user-owner',
        role: 'OWNER',
        status: 'ACTIVE',
      });

      await expect(
        createInvitation('org-1', 'user-owner', {
          email: 'target@example.com',
          role: 'OWNER' as any,
        })
      ).rejects.toThrow('Cannot invite a member with OWNER role');
    });

    it('forbids an ADMIN from inviting an ADMIN (only OWNER can invite ADMIN)', async () => {
      // Mock actor as ADMIN
      (prisma.organizationMember.findUnique as any).mockResolvedValueOnce({
        id: 'member-admin-1',
        organizationId: 'org-1',
        userId: 'user-admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      await expect(
        createInvitation('org-1', 'user-admin', {
          email: 'newadmin@example.com',
          role: 'ADMIN',
        })
      ).rejects.toThrow('Only the Organization Owner can invite administrators');
    });
  });

  describe('Finding 4 & 5: Invitation Acceptance Verification & Race Protection', () => {
    it('rejects invitation acceptance when authenticated email does not match recipient email', async () => {
      const mockTx = {
        invitation: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'inv-1',
            organizationId: 'org-1',
            email: 'invited@company.com',
            role: 'MEMBER',
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 86400000),
            organization: { id: 'org-1', name: 'Test Org' },
          }),
          updateMany: vi.fn(),
        },
        organizationMember: {
          findUnique: vi.fn(),
          create: vi.fn(),
        },
        auditLog: { create: vi.fn() },
      };

      (prisma.$transaction as any).mockImplementationOnce((cb: any) => cb(mockTx));

      await expect(
        acceptInvitation('token-123', 'user-attacker', 'attacker@other.com')
      ).rejects.toThrow('does not match invitation recipient');

      // Ensure invitation was NOT marked accepted
      expect(mockTx.invitation.updateMany).not.toHaveBeenCalled();
    });

    it('rejects invitation when atomic update indicates race condition or already accepted', async () => {
      const mockTx = {
        invitation: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'inv-1',
            organizationId: 'org-1',
            email: 'invited@company.com',
            role: 'MEMBER',
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 86400000),
            organization: { id: 'org-1', name: 'Test Org' },
          }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // Another request beat this one!
        },
        organizationMember: {
          findUnique: vi.fn(),
          create: vi.fn(),
        },
        auditLog: { create: vi.fn() },
      };

      (prisma.$transaction as any).mockImplementationOnce((cb: any) => cb(mockTx));

      await expect(
        acceptInvitation('token-123', 'user-valid', 'invited@company.com')
      ).rejects.toThrow('Invitation was already accepted or is no longer valid');
    });
  });

  describe('Finding 1 & 6: Member Role Modification & Single-Owner Transfer', () => {
    it('strictly forbids a user from changing their own role (self-escalation prevention)', async () => {
      (prisma.organizationMember.findUnique as any)
        .mockResolvedValueOnce({
          id: 'member-1',
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'ADMIN',
          status: 'ACTIVE',
        })
        .mockResolvedValueOnce({
          id: 'member-1',
          organizationId: 'org-1',
          userId: 'user-1',
          role: 'ADMIN',
          status: 'ACTIVE',
        });

      await expect(
        updateMemberRole('org-1', 'member-1', 'user-1', 'OWNER')
      ).rejects.toThrow('Users cannot modify their own role');
    });

    it('executes atomic ownership transfer demoting current owner to ADMIN', async () => {
      (prisma.organizationMember.findUnique as any)
        .mockResolvedValueOnce({
          id: 'member-owner',
          organizationId: 'org-1',
          userId: 'user-owner',
          role: 'OWNER',
          status: 'ACTIVE',
        })
        .mockResolvedValueOnce({
          id: 'member-target',
          organizationId: 'org-1',
          userId: 'user-target',
          role: 'ADMIN',
          status: 'ACTIVE',
        });

      const mockTx = {
        organizationMember: {
          update: vi.fn().mockImplementation(({ where, data }) => ({
            id: where.id,
            role: data.role,
          })),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-transfer' }),
        },
      };

      (prisma.$transaction as any).mockImplementationOnce((cb: any) => cb(mockTx));

      const result = await updateMemberRole('org-1', 'member-target', 'user-owner', 'OWNER');

      // Verify current owner demoted to ADMIN
      expect(mockTx.organizationMember.update).toHaveBeenCalledWith({
        where: { id: 'member-owner' },
        data: { role: 'ADMIN' },
      });

      // Verify target promoted to OWNER
      expect(mockTx.organizationMember.update).toHaveBeenCalledWith({
        where: { id: 'member-target' },
        data: { role: 'OWNER' },
      });

      expect(result.role).toBe('OWNER');
    });

    it('forbids an ADMIN from removing another ADMIN (only OWNER can remove ADMIN)', async () => {
      (prisma.organizationMember.findUnique as any)
        .mockResolvedValueOnce({
          id: 'member-admin-1',
          organizationId: 'org-1',
          userId: 'user-admin-1',
          role: 'ADMIN',
          status: 'ACTIVE',
        })
        .mockResolvedValueOnce({
          id: 'member-admin-2',
          organizationId: 'org-1',
          userId: 'user-admin-2',
          role: 'ADMIN',
          status: 'ACTIVE',
        });

      await expect(
        removeMember('org-1', 'member-admin-2', 'user-admin-1')
      ).rejects.toThrow('Administrators cannot remove other administrators');
    });
  });
});

