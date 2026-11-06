// Visnora — Brand & Competitor Domain Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/PRD.md

import { prisma } from '../../database/src/client';
import { NotFoundError, ForbiddenError, ValidationError } from '../organizations/service';
import { CreateBrandInput, UpdateBrandInput, CreateCompetitorInput, UpdateCompetitorInput } from '../../shared/validation/index';

/**
 * Normalizes a website or domain string to a clean lowercase hostname
 */
export function normalizeDomain(input: string): string {
  if (!input) return '';
  let cleaned = input.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  cleaned = cleaned.replace(/^www\./i, '');
  return cleaned;
}

// -----------------------------------------------------------------------------
// BRAND MANAGEMENT
// -----------------------------------------------------------------------------

export async function getBrands(organizationId: string, projectId?: string) {
  const brands = await prisma.brand.findMany({
    where: {
      organizationId,
      ...(projectId ? { projectId } : {}),
      isArchived: false,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          workspaceId: true,
          workspace: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
  });

  return brands;
}

export async function getBrandById(brandId: string, organizationId: string) {
  const brand = await prisma.brand.findFirst({
    where: {
      id: brandId,
      organizationId,
    },
    include: {
      project: {
        include: {
          workspace: true,
          competitors: { where: { isArchived: false } },
        },
      },
    },
  });

  if (!brand) {
    throw new NotFoundError('Brand not found');
  }

  return brand;
}

export async function createBrand(
  organizationId: string,
  projectId: string,
  data: CreateBrandInput
) {
  // Verify project belongs to organization
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });

  if (!project) {
    throw new NotFoundError('Project container not found');
  }

  const domain = normalizeDomain(data.domain || project.primaryWebsite);
  if (!domain) {
    throw new ValidationError('A valid brand domain is required');
  }

  // If this brand is marked as primary, unmark other primary brands for this project
  if (data.isPrimary) {
    await prisma.brand.updateMany({
      where: { projectId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const brand = await prisma.brand.create({
    data: {
      organizationId,
      projectId,
      canonicalName: data.canonicalName.trim(),
      domain,
      aliases: data.aliases || [],
      description: data.description?.trim(),
      industry: data.industry?.trim() || project.industry,
      country: data.country || project.targetCountry || 'IN',
      primaryLanguage: data.primaryLanguage || project.defaultLanguage || 'en',
      additionalLanguages: data.additionalLanguages || [],
      productsServices: data.productsServices || [],
      brandKeywords: data.brandKeywords || [],
      targetAudience: data.targetAudience?.trim(),
      brandContext: data.brandContext?.trim(),
      isPrimary: data.isPrimary ?? false,
    },
  });

  return brand;
}

export async function updateBrand(
  brandId: string,
  organizationId: string,
  data: UpdateBrandInput
) {
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, organizationId },
  });

  if (!brand) {
    throw new NotFoundError('Brand not found');
  }

  if (data.isPrimary && !brand.isPrimary) {
    await prisma.brand.updateMany({
      where: { projectId: brand.projectId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const domain = data.domain ? normalizeDomain(data.domain) : undefined;

  return await prisma.brand.update({
    where: { id: brandId },
    data: {
      ...(data.canonicalName ? { canonicalName: data.canonicalName.trim() } : {}),
      ...(domain ? { domain } : {}),
      ...(data.aliases !== undefined ? { aliases: data.aliases } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.industry !== undefined ? { industry: data.industry } : {}),
      ...(data.country !== undefined ? { country: data.country } : {}),
      ...(data.primaryLanguage !== undefined ? { primaryLanguage: data.primaryLanguage } : {}),
      ...(data.additionalLanguages !== undefined ? { additionalLanguages: data.additionalLanguages } : {}),
      ...(data.productsServices !== undefined ? { productsServices: data.productsServices } : {}),
      ...(data.brandKeywords !== undefined ? { brandKeywords: data.brandKeywords } : {}),
      ...(data.targetAudience !== undefined ? { targetAudience: data.targetAudience } : {}),
      ...(data.brandContext !== undefined ? { brandContext: data.brandContext } : {}),
      ...(data.isPrimary !== undefined ? { isPrimary: data.isPrimary } : {}),
      ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
    },
  });
}

export async function archiveBrand(brandId: string, organizationId: string) {
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, organizationId },
  });

  if (!brand) {
    throw new NotFoundError('Brand not found');
  }

  return await prisma.brand.update({
    where: { id: brandId },
    data: { isArchived: true, isPrimary: false },
  });
}

// -----------------------------------------------------------------------------
// COMPETITOR MANAGEMENT
// -----------------------------------------------------------------------------

export async function getCompetitors(organizationId: string, projectId: string) {
  return await prisma.competitor.findMany({
    where: {
      organizationId,
      projectId,
      isArchived: false,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCompetitorById(competitorId: string, organizationId: string) {
  const competitor = await prisma.competitor.findFirst({
    where: { id: competitorId, organizationId },
  });

  if (!competitor) {
    throw new NotFoundError('Competitor not found');
  }

  return competitor;
}

export async function createCompetitor(
  organizationId: string,
  projectId: string,
  data: CreateCompetitorInput
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });

  if (!project) {
    throw new NotFoundError('Project container not found');
  }

  const domain = normalizeDomain(data.domain || data.website || '');
  if (!domain) {
    throw new ValidationError('A valid domain or website is required for the competitor');
  }

  return await prisma.competitor.create({
    data: {
      organizationId,
      projectId,
      canonicalName: data.canonicalName.trim(),
      domain,
      website: data.website?.trim() || `https://${domain}`,
      description: data.description?.trim(),
      productsServices: data.productsServices || [],
      keywords: data.keywords || [],
      aliases: data.aliases || [],
    },
  });
}

export async function updateCompetitor(
  competitorId: string,
  organizationId: string,
  data: UpdateCompetitorInput
) {
  const competitor = await prisma.competitor.findFirst({
    where: { id: competitorId, organizationId },
  });

  if (!competitor) {
    throw new NotFoundError('Competitor not found');
  }

  const domain = data.domain ? normalizeDomain(data.domain) : undefined;

  return await prisma.competitor.update({
    where: { id: competitorId },
    data: {
      ...(data.canonicalName ? { canonicalName: data.canonicalName.trim() } : {}),
      ...(domain ? { domain } : {}),
      ...(data.website !== undefined ? { website: data.website } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.productsServices !== undefined ? { productsServices: data.productsServices } : {}),
      ...(data.keywords !== undefined ? { keywords: data.keywords } : {}),
      ...(data.aliases !== undefined ? { aliases: data.aliases } : {}),
      ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
    },
  });
}

export async function archiveCompetitor(competitorId: string, organizationId: string) {
  const competitor = await prisma.competitor.findFirst({
    where: { id: competitorId, organizationId },
  });

  if (!competitor) {
    throw new NotFoundError('Competitor not found');
  }

  return await prisma.competitor.update({
    where: { id: competitorId },
    data: { isArchived: true },
  });
}

