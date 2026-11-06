// Visnora — Project & Brand Domain Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/DATABASE_DESIGN.md

import { prisma } from '../../database/src/client';
import { OrgRole } from '../../shared/types';
import { assertPermission, ForbiddenError } from '../../shared/permissions/rbac';
import { NotFoundError, ValidationError } from '../organizations/service';

function extractDomain(url: string): string {
  try {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    const parsed = new URL(clean);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    throw new ValidationError(`Invalid website URL format: ${url}`);
  }
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

export async function getProjects(
  organizationId: string,
  workspaceId: string | undefined,
  userId: string
) {
  await verifyOrgMembership(organizationId, userId);

  const whereClause: any = {
    organizationId,
    isArchived: false,
  };

  if (workspaceId) {
    whereClause.workspaceId = workspaceId;
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      workspace: {
        select: { id: true, name: true, slug: true },
      },
      brands: {
        where: { isPrimary: true },
        select: { id: true, canonicalName: true, domain: true },
      },
      _count: {
        select: {
          trackedPrompts: { where: { isActive: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return projects.map((p) => ({
    id: p.id,
    organizationId: p.organizationId,
    workspaceId: p.workspaceId,
    workspaceName: p.workspace.name,
    name: p.name,
    description: p.description,
    primaryWebsite: p.primaryWebsite,
    domain: p.brands[0]?.domain || extractDomain(p.primaryWebsite),
    industry: p.industry,
    targetCountry: p.targetCountry,
    defaultLanguage: p.defaultLanguage,
    trackedPromptsCount: p._count.trackedPrompts,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function getProjectById(
  projectId: string,
  organizationId: string,
  userId: string
) {
  await verifyOrgMembership(organizationId, userId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        select: { id: true, name: true, slug: true },
      },
      brands: true,
      competitors: true,
      _count: {
        select: {
          trackedPrompts: true,
          promptRuns: true,
        },
      },
    },
  });

  if (!project || project.organizationId !== organizationId) {
    throw new NotFoundError('Project not found in this organization.');
  }

  return project;
}

export async function createProject(
  organizationId: string,
  userId: string,
  data: {
    workspaceId: string;
    name: string;
    primaryWebsite: string;
    description?: string;
    industry?: string;
    targetCountry?: string;
    defaultLanguage?: string;
    brand?: {
      canonicalName?: string;
      domain?: string;
      aliases?: string[];
    };
  }
) {
  const membership = await verifyOrgMembership(organizationId, userId);

  // Viewers cannot create projects
  assertPermission(membership.role as OrgRole, 'ANALYST');

  // Verify workspace exists in same organization
  const workspace = await prisma.workspace.findUnique({
    where: { id: data.workspaceId },
  });

  if (!workspace || workspace.organizationId !== organizationId || workspace.isArchived) {
    throw new ValidationError('Selected workspace does not exist or has been archived.');
  }

  const domain = extractDomain(data.primaryWebsite);

  return await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        organizationId,
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        primaryWebsite: data.primaryWebsite,
        industry: data.industry,
        targetCountry: data.targetCountry || 'IN',
        defaultLanguage: data.defaultLanguage || 'en',
      },
    });

    // Create primary brand entity
    await tx.brand.create({
      data: {
        organizationId,
        projectId: project.id,
        canonicalName: data.brand?.canonicalName || data.name,
        domain: data.brand?.domain || domain,
        aliases: data.brand?.aliases || [],
        isPrimary: true,
      },
    });

    return project;
  });
}

export async function updateProject(
  projectId: string,
  organizationId: string,
  userId: string,
  data: {
    name?: string;
    primaryWebsite?: string;
    description?: string;
    industry?: string;
    targetCountry?: string;
    defaultLanguage?: string;
    isArchived?: boolean;
  }
) {
  const membership = await verifyOrgMembership(organizationId, userId);

  // Viewers cannot update projects
  assertPermission(membership.role as OrgRole, 'ANALYST');

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.organizationId !== organizationId) {
    throw new NotFoundError('Project not found in this organization.');
  }

  return await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.primaryWebsite ? { primaryWebsite: data.primaryWebsite } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.industry !== undefined ? { industry: data.industry } : {}),
      ...(data.targetCountry ? { targetCountry: data.targetCountry } : {}),
      ...(data.defaultLanguage ? { defaultLanguage: data.defaultLanguage } : {}),
      ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
    },
  });
}

export async function archiveProject(
  projectId: string,
  organizationId: string,
  userId: string
) {
  return await updateProject(projectId, organizationId, userId, { isArchived: true });
}

