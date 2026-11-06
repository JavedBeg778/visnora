// Visnora — Team Invitation Domain Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/SECURITY.md

import crypto from 'crypto';
import { prisma } from '../../database/src/client';
import { OrgRole } from '../../shared/types';
import { assertPermission, ForbiddenError } from '../../shared/permissions/rbac';
import { NotFoundError, ValidationError } from '../organizations/service';

const INVITATION_EXPIRY_DAYS = 7;

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
  await verifyAdminOrOwner(organizationId, actorUserId);

  const cleanEmail = data.email.toLowerCase().trim();

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

  return await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'REVOKED' },
  });
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
  const invite = await getInvitationByToken(token);

  if (!invite.isValid) {
    throw new ValidationError(`Cannot accept invitation: It is ${invite.status.toLowerCase()}.`);
  }

  // Transactionally add member and update invitation status
  return await prisma.$transaction(async (tx) => {
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

    // Mark invitation accepted
    await tx.invitation.update({
      where: { token },
      data: { status: 'ACCEPTED' },
    });

    return {
      success: true,
      organizationId: invite.organizationId,
      organizationName: invite.organizationName,
      role: invite.role,
      membershipId: membership.id,
    };
  });
}
