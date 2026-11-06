// Visnora — Workspace Domain Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/DATABASE_DESIGN.md

import { prisma } from '../../database/src/client';
import { OrgRole } from '../../shared/types';
import { assertPermission, hasPermission, ForbiddenError } from '../../shared/permissions/rbac';
import { NotFoundError } from '../organizations/service';

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base || 'ws'}-${suffix}`;
}

async function verifyOrgMembership(organizationId: string, userId: string) {
  const membership = await prisma.organizationMember.findUnique({
    where: {
      uq_org_user: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership || membership.status !== 'ACTIVE') {
    throw new ForbiddenError('Unauthorized: Access denied to this organization.');
  }

  return membership;
}

export async function getWorkspaces(organizationId: string, userId: string) {
  await verifyOrgMembership(organizationId, userId);

  const workspaces = await prisma.workspace.findMany({
    where: {
      organizationId,
      isArchived: false,
    },
    include: {
      _count: {
        select: {
          projects: { where: { isArchived: false } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return workspaces.map((w) => ({
    id: w.id,
    organizationId: w.organizationId,
    name: w.name,
    slug: w.slug,
    description: w.description,
    projectCount: w._count.projects,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }));
}

export async function getWorkspaceById(workspaceId: string, organizationId: string, userId: string) {
  await verifyOrgMembership(organizationId, userId);

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      projects: {
        where: { isArchived: false },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          projects: { where: { isArchived: false } },
        },
      },
    },
  });

  if (!workspace || workspace.organizationId !== organizationId) {
    throw new NotFoundError('Workspace not found in this organization.');
  }

  return {
    ...workspace,
    projectCount: workspace._count.projects,
  };
}

export async function createWorkspace(
  organizationId: string,
  userId: string,
  data: { name: string; description?: string }
) {
  const membership = await verifyOrgMembership(organizationId, userId);

  // Viewers cannot create workspaces
  assertPermission(membership.role as OrgRole, 'ANALYST');

  const slug = generateSlug(data.name);

  return await prisma.workspace.create({
    data: {
      organizationId,
      name: data.name,
      slug,
      description: data.description,
    },
  });
}

export async function updateWorkspace(
  workspaceId: string,
  organizationId: string,
  userId: string,
  data: { name?: string; description?: string; isArchived?: boolean }
) {
  const membership = await verifyOrgMembership(organizationId, userId);

  // Only Admin or Owner can update workspace settings or archive
  assertPermission(membership.role as OrgRole, 'ADMIN');

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace || workspace.organizationId !== organizationId) {
    throw new NotFoundError('Workspace not found in this organization.');
  }

  return await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
    },
  });
}

export async function archiveWorkspace(workspaceId: string, organizationId: string, userId: string) {
  return await updateWorkspace(workspaceId, organizationId, userId, { isArchived: true });
}

