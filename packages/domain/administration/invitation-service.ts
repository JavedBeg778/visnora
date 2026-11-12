// Visnora — Team Invitation Domain Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/SECURITY.md
// Hardened against Audit Findings 4, 5, 6, 12

import crypto from 'crypto';
import { prisma } from '../../database/src/client';
import { OrgRole } from '../../shared/types';
import { assertPermission, ForbiddenError } from '../../shared/permissions/rbac';
import { NotFoundError, ValidationError } from '../organizations/service';
import { recordAuditEvent } from '../security/audit-logger';

const INVITATION_EXPIRY_DAYS = 7;
const ALLOWED_INVITE_ROLES: OrgRole[] = ['ADMIN', 'MEMBER', 'VIEWER'];

async function verifyAdminOrOwner(organizationId: string, userId: string) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      uq_org_user: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    throw new ForbiddenError('Unauthorized: Access denied.');
  }

  assertPermission(membership.role as OrgRole, 'ADMIN');
  return membership;
}

export async function createInvitation(
  organizationId: string,
  actorUserId: string,
  data: { email: string; role: OrgRole }
) {
  const actorMembership = await verifyAdminOrOwner(organizationId, actorUserId);

  const cleanEmail = data.email.toLowerCase().trim();

  // Audit Finding 6: Restrict OWNER invitation and enforce role hierarchy
  if ((data.role as string) === 'OWNER') {
    throw new ValidationError('Cannot invite a member with OWNER role. Ownership must be transferred by an existing owner.');
  }

  if (!ALLOWED_INVITE_ROLES.includes(data.role)) {
    throw new ValidationError(`Invalid invitation role "${data.role}". Allowed roles are: ${ALLOWED_INVITE_ROLES.join(', ')}.`);
  }

  // Only the current OWNER can invite an ADMIN
  if (data.role === 'ADMIN' && actorMembership.role !== 'OWNER') {
    throw new ForbiddenError('Only the Organization Owner can invite administrators.');
  }

  // Check if email already belongs to an active member
  const existingProfiles = await prisma.userProfile.findMany({
    where: { email: cleanEmail },
  });

  if (existingProfiles.length > 0) {
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: existingProfiles[0].id,
        status: 'ACTIVE',
      },
    });

    if (existingMember) {
      throw new ValidationError(`User with email "${cleanEmail}" is already an active member of this organization.`);
    }
  }

  // Revoke any existing pending invitations for this email in this org
  await prisma.invitation.updateMany({
    where: {
      organizationId,
      email: cleanEmail,
      status: 'PENDING',
    },
    data: {
      status: 'REVOKED',
    },
  });

  // Secure random cryptographic token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      organizationId,
      email: cleanEmail,
      role: data.role as any,
      token,
      invitedBy: actorUserId,
      status: 'PENDING',
      expiresAt,
    },
    include: {
      organization: {
        select: { name: true },
      },
    },
  });

  // Record audit log entry
  await recordAuditEvent(prisma, {
    organizationId,
    actorUserId,
    action: 'INVITATION_CREATED',
    targetEntity: 'INVITATION',
    targetId: invitation.id,
    metadata: {
      email: cleanEmail,
      role: data.role,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return {
    id: invitation.id,
    organizationId: invitation.organizationId,
    organizationName: invitation.organization.name,
    email: invitation.email,
    role: invitation.role as OrgRole,
    token: invitation.token,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  };
}

export async function getInvitations(organizationId: string, actorUserId: string) {
  await verifyAdminOrOwner(organizationId, actorUserId);

  const invitations = await prisma.invitation.findMany({
    where: {
      organizationId,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  return invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as OrgRole,
    token: inv.token,
    status: inv.status,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }));
}

export async function revokeInvitation(
  invitationId: string,
  organizationId: string,
  actorUserId: string
) {
  await verifyAdminOrOwner(organizationId, actorUserId);

  const invitation = await prisma.invitation.findFirst({
    where: {
      organizationId,
      OR: [
        { id: invitationId },
        { token: invitationId },
      ],
    },
  });

  if (!invitation) {
    throw new NotFoundError('Invitation not found.');
  }

  const updated = await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'REVOKED' },
  });

  // Record audit log entry
  await recordAuditEvent(prisma, {
    organizationId,
    actorUserId,
    action: 'INVITATION_REVOKED',
    targetEntity: 'INVITATION',
    targetId: invitation.id,
    metadata: {
      email: invitation.email,
      role: invitation.role,
    },
  });

  return updated;
}

export async function getInvitationByToken(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!invitation) {
    throw new NotFoundError('Invalid invitation link.');
  }

  const isExpired = new Date() > invitation.expiresAt;
  const isValid = invitation.status === 'PENDING' && !isExpired;

  return {
    id: invitation.id,
    organizationId: invitation.organizationId,
    organizationName: invitation.organization.name,
    email: invitation.email,
    role: invitation.role as OrgRole,
    status: isExpired ? 'EXPIRED' : invitation.status,
    isValid,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

export async function acceptInvitation(
  token: string,
  userId: string,
  userEmail: string
) {
  const cleanUserEmail = userEmail.toLowerCase().trim();

  // Audit Finding 4 & 5: Atomic, race-condition protected transaction with email identity verification
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch invitation within transaction
    const invite = await tx.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (!invite) {
      throw new NotFoundError('Invalid invitation link.');
    }

    if (new Date() > invite.expiresAt) {
      throw new ValidationError('Cannot accept invitation: It is expired.');
    }

    if (invite.status !== 'PENDING') {
      throw new ValidationError(`Cannot accept invitation: It is ${invite.status.toLowerCase()}.`);
    }

    // Audit Finding 4: Verify email matches authenticated user
    const cleanInviteEmail = invite.email.toLowerCase().trim();
    if (cleanUserEmail !== cleanInviteEmail) {
      throw new ForbiddenError(
        `Cannot accept invitation: Authenticated user email (${cleanUserEmail}) does not match invitation recipient (${cleanInviteEmail}).`
      );
    }

    // Audit Finding 5: Atomically acquire and update status to prevent concurrent double-acceptance
    const updateResult = await tx.invitation.updateMany({
      where: {
        token,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      data: { status: 'ACCEPTED' },
    });

    if (updateResult.count === 0) {
      throw new ValidationError('Invitation was already accepted or is no longer valid.');
    }

    // Check if already a member
    const existing = await tx.organizationMember.findUnique({
      where: {
        uq_org_user: {
          organizationId: invite.organizationId,
          userId,
        },
      },
    });

    let membership;
    if (existing) {
      membership = await tx.organizationMember.update({
        where: { id: existing.id },
        data: {
          role: invite.role as any,
          status: 'ACTIVE',
        },
      });
    } else {
      membership = await tx.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId,
          role: invite.role as any,
          status: 'ACTIVE',
        },
      });
    }

    // Record immutable audit event
    await recordAuditEvent(tx, {
      organizationId: invite.organizationId,
      actorUserId: userId,
      action: 'INVITATION_ACCEPTED',
      targetEntity: 'MEMBERSHIP',
      targetId: membership.id,
      metadata: {
        invitationId: invite.id,
        email: cleanUserEmail,
        role: invite.role,
      },
    });

    return {
      success: true,
      organizationId: invite.organizationId,
      organizationName: invite.organization.name,
      role: invite.role,
      membershipId: membership.id,
    };
  });
}
