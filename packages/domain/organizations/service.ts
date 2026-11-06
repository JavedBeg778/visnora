// Visnora — Organization Domain Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/DATABASE_DESIGN.md

import { prisma } from '../../database/src/client';
import { OrgRole } from '../../shared/types';
import { assertPermission, hasPermission, ForbiddenError } from '../../shared/permissions/rbac';

export { ForbiddenError };

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base || 'org'}-${suffix}`;
}

export async function getOrganizationsForUser(userId: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      organization: {
        include: {
          workspaces: {
            where: { isArchived: false },
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: {
              members: { where: { status: 'ACTIVE' } },
              projects: { where: { isArchived: false } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    website: m.organization.website,
    orgType: m.organization.orgType,
    logoUrl: m.organization.logoUrl,
    billingEmail: m.organization.billingEmail,
    countryCode: m.organization.countryCode,
    role: m.role as OrgRole,
    memberCount: m.organization._count.members,
    projectCount: m.organization._count.projects,
    workspaces: m.organization.workspaces,
    createdAt: m.organization.createdAt.toISOString(),
  }));
}

export async function getOrganizationById(organizationId: string, userId: string) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      uq_org_user: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    throw new ForbiddenError('You are not an active member of this organization.');
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      workspaces: {
        where: { isArchived: false },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: {
          members: { where: { status: 'ACTIVE' } },
          projects: { where: { isArchived: false } },
        },
      },
    },
  });

  if (!org) {
    throw new NotFoundError('Organization not found.');
  }

  return {
    ...org,
    role: membership.role as OrgRole,
    memberCount: org._count.members,
    projectCount: org._count.projects,
  };
}

export async function createOrganizationWithDefaults(data: {
  name: string;
  website?: string;
  orgType?: string;
  countryCode?: string;
  billingEmail: string;
  userId: string;
  workspaceName?: string;
  projectName?: string;
  primaryWebsite?: string;
  industry?: string;
}) {
  const slug = generateSlug(data.name);

  // Safe transactional provisioning: Organization -> Owner Member -> Default Workspace -> Initial Project (if specified)
  return await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: data.name,
        slug,
        website: data.website,
        orgType: data.orgType || 'business',
        countryCode: data.countryCode || 'IN',
        billingEmail: data.billingEmail,
      },
    });

    // Assign creating user as OWNER
    await tx.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: data.userId,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });

    // Create default workspace
    const workspaceName = data.workspaceName || 'Primary Workspace';
    const workspaceSlug = generateSlug(workspaceName);
    const workspace = await tx.workspace.create({
      data: {
        organizationId: org.id,
        name: workspaceName,
        slug: workspaceSlug,
        description: 'Default primary workspace',
      },
    });

    // Create initial project if provided
    let project = null;
    if (data.projectName && data.primaryWebsite) {
      project = await tx.project.create({
        data: {
          organizationId: org.id,
          workspaceId: workspace.id,
          name: data.projectName,
          primaryWebsite: data.primaryWebsite,
          industry: data.industry,
          targetCountry: data.countryCode || 'IN',
        },
      });

      // Initialize default brand entity
      let domain = data.primaryWebsite.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
      domain = domain.toLowerCase().replace(/^www\./, '');

      await tx.brand.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          canonicalName: data.projectName,
          domain: domain || 'brand.com',
          isPrimary: true,
        },
      });
    }

    return {
      organization: org,
      workspace,
      project,
    };
  });
}

export async function updateOrganization(
  organizationId: string,
  userId: string,
  data: {
    name?: string;
    website?: string;
    orgType?: string;
    billingEmail?: string;
    countryCode?: string;
  }
) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      uq_org_user: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    throw new ForbiddenError('Unauthorized: Not a member of this organization.');
  }

  // Only OWNER and ADMIN can update organization settings
  assertPermission(membership.role as OrgRole, 'ADMIN');

  return await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.website !== undefined ? { website: data.website } : {}),
      ...(data.orgType ? { orgType: data.orgType } : {}),
      ...(data.billingEmail ? { billingEmail: data.billingEmail } : {}),
      ...(data.countryCode ? { countryCode: data.countryCode } : {}),
    },
  });
}

export async function getOrganizationMembers(organizationId: string, userId: string) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      uq_org_user: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    throw new ForbiddenError('Unauthorized: Not a member of this organization.');
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch user profiles for display
  const userIds = members.map((m) => m.userId);
  const profiles = await prisma.userProfile.findMany({
    where: { id: { in: userIds } },
  });

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return members.map((m) => {
    const profile = profileMap.get(m.userId);
    return {
      id: m.id,
      userId: m.userId,
      role: m.role as OrgRole,
      status: m.status,
      email: profile?.email || 'user@visnora.local',
      fullName: profile?.fullName || 'Visnora User',
      avatarUrl: profile?.avatarUrl || null,
      createdAt: m.createdAt.toISOString(),
    };
  });
}

export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  actorUserId: string,
  newRole: OrgRole
) {
  const actorMembership = await prisma.organizationMember.findUnique({
    where: {
      uq_org_user: {
        organizationId,
        userId: actorUserId,
      },
    },
  });

  if (!actorMembership || actorMembership.status !== 'ACTIVE') {
    throw new ForbiddenError('Unauthorized: Not an active member.');
  }

  // Must be at least ADMIN to change roles
  assertPermission(actorMembership.role as OrgRole, 'ADMIN');

  const targetMember = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.organizationId !== organizationId) {
    throw new NotFoundError('Member record not found in this organization.');
  }

  // Admins cannot change Owner's role, and cannot promote to Owner (only Owner can transfer ownership)
  if (targetMember.role === 'OWNER') {
    throw new ForbiddenError('Owner role cannot be modified. Ownership transfer required.');
  }

  if (newRole === 'OWNER' && actorMembership.role !== 'OWNER') {
    throw new ForbiddenError('Only the Organization Owner can grant Owner privileges.');
  }

  return await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role: newRole as any },
  });
}

export async function removeMember(
  organizationId: string,
  memberId: string,
  actorUserId: string
) {
  const actorMembership = await prisma.organizationMember.findUnique({
    where: {
      uq_org_user: {
        organizationId,
        userId: actorUserId,
      },
    },
  });

  if (!actorMembership || actorMembership.status !== 'ACTIVE') {
    throw new ForbiddenError('Unauthorized: Not an active member.');
  }

  const targetMember = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.organizationId !== organizationId) {
    throw new NotFoundError('Member record not found in this organization.');
  }

  if (targetMember.role === 'OWNER') {
    throw new ForbiddenError('The Organization Owner cannot be removed.');
  }

  // Allow members to remove themselves (leave), or Admins/Owners to remove members
  if (targetMember.userId !== actorUserId) {
    assertPermission(actorMembership.role as OrgRole, 'ADMIN');
  }

  return await prisma.organizationMember.delete({
    where: { id: memberId },
  });
}

