// Visnora — Prompt Management & Suggestion Domain Service
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/PRD.md

import fs from 'fs';
import path from 'path';
import { prisma } from '../../database/src/client';
import { NotFoundError, ValidationError } from '../organizations/service';
import { CreateTrackedPromptInput, UpdateTrackedPromptInput } from '../../shared/validation/index';
import { BuyingStage } from '../../shared/types/index';

// -----------------------------------------------------------------------------
// PROMPT CRUD
// -----------------------------------------------------------------------------

export async function getPrompts(
  organizationId: string,
  projectId: string,
  filters?: {
    category?: string;
    groupId?: string;
    stage?: string;
    isActive?: boolean;
    search?: string;
  }
) {
  return await prisma.trackedPrompt.findMany({
    where: {
      organizationId,
      projectId,
      isArchived: false,
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.groupId ? { groupId: filters.groupId } : {}),
      ...(filters?.stage ? { stage: filters.stage as BuyingStage } : {}),
      ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters?.search
        ? {
            promptText: {
              contains: filters.search,
              mode: 'insensitive',
            },
          }
        : {}),
    },
    include: {
      group: {
        select: { id: true, name: true },
      },
      runs: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          executedAt: true,
          latencyMs: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPromptById(promptId: string, organizationId: string) {
  const prompt = await prisma.trackedPrompt.findFirst({
    where: { id: promptId, organizationId },
    include: {
      group: true,
      runs: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          aiResponse: {
            include: {
              mentions: true,
              citations: true,
            },
          },
        },
      },
    },
  });

  if (!prompt) {
    throw new NotFoundError('Prompt not found');
  }

  return prompt;
}

export async function createPrompt(
  organizationId: string,
  projectId: string,
  data: CreateTrackedPromptInput
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  return await prisma.trackedPrompt.create({
    data: {
      organizationId,
      projectId,
      promptText: data.promptText.trim(),
      category: data.category || 'General Discovery',
      stage: data.stage || 'CONSIDERATION',
      groupId: data.groupId || null,
      topicTags: data.topicTags || [],
      targetProvider: data.targetProvider || 'google-gemini',
      targetModel: data.targetModel || 'gemini-3.8-flash',
      targetLocale: data.targetLocale || 'en-IN',
      cadence: data.cadence || 'DAILY',
      isActive: data.isActive ?? true,
    },
  });
}

export async function updatePrompt(
  promptId: string,
  organizationId: string,
  data: UpdateTrackedPromptInput
) {
  const prompt = await prisma.trackedPrompt.findFirst({
    where: { id: promptId, organizationId },
  });

  if (!prompt) {
    throw new NotFoundError('Prompt not found');
  }

  return await prisma.trackedPrompt.update({
    where: { id: promptId },
    data: {
      ...(data.promptText ? { promptText: data.promptText.trim() } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.stage !== undefined ? { stage: data.stage } : {}),
      ...(data.groupId !== undefined ? { groupId: data.groupId } : {}),
      ...(data.topicTags !== undefined ? { topicTags: data.topicTags } : {}),
      ...(data.targetProvider !== undefined ? { targetProvider: data.targetProvider } : {}),
      ...(data.targetModel !== undefined ? { targetModel: data.targetModel } : {}),
      ...(data.targetLocale !== undefined ? { targetLocale: data.targetLocale } : {}),
      ...(data.cadence !== undefined ? { cadence: data.cadence } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
    },
  });
}

export async function deletePrompt(promptId: string, organizationId: string) {
  const prompt = await prisma.trackedPrompt.findFirst({
    where: { id: promptId, organizationId },
  });

  if (!prompt) {
    throw new NotFoundError('Prompt not found');
  }

  // Soft delete / archive
  return await prisma.trackedPrompt.update({
    where: { id: promptId },
    data: { isArchived: true, isActive: false },
  });
}

export const archivePrompt = deletePrompt;

// -----------------------------------------------------------------------------
// PROMPT GROUPS
// -----------------------------------------------------------------------------

export async function getPromptGroups(organizationId: string, projectId: string) {
  return await prisma.promptGroup.findMany({
    where: { organizationId, projectId },
    include: {
      _count: {
        select: { prompts: { where: { isArchived: false } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createPromptGroup(
  organizationId: string,
  projectId: string,
  data: { name: string; description?: string }
) {
  return await prisma.promptGroup.create({
    data: {
      organizationId,
      projectId,
      name: data.name.trim(),
      description: data.description?.trim(),
    },
  });
}

export async function deletePromptGroup(groupId: string, organizationId: string) {
  const group = await prisma.promptGroup.findFirst({
    where: { id: groupId, organizationId },
  });

  if (!group) {
    throw new NotFoundError('Prompt group not found');
  }

  // Unlink prompts from group
  await prisma.trackedPrompt.updateMany({
    where: { groupId },
    data: { groupId: null },
  });

  return await prisma.promptGroup.delete({
    where: { id: groupId },
  });
}

// -----------------------------------------------------------------------------
// AI PROMPT SUGGESTION ENGINE
// -----------------------------------------------------------------------------

export interface GeneratePromptParams {
  brandName: string;
  industry?: string;
  productsServices?: string[];
  targetAudience?: string;
  competitors?: string[];
  country?: string;
  count?: number;
}

export interface SuggestedPromptItem {
  promptText: string;
  category: string;
  stage: BuyingStage;
  topicTags: string[];
}

/**
 * Deterministically generates relevant, realistic search-style questions
 * across the 9 core buying categories using the brand's identity and context.
 */
export function generatePromptSuggestions(params: GeneratePromptParams): SuggestedPromptItem[] {
  const brand = params.brandName.trim();
  const ind = params.industry?.trim() || 'Software & Services';
  const prods = params.productsServices && params.productsServices.length > 0
    ? params.productsServices.join(', ')
    : 'digital marketing & AI intelligence';
  const aud = params.targetAudience?.trim() || 'businesses, marketing leaders, and agencies';
  const country = params.country || 'India';
  const comps = params.competitors && params.competitors.length > 0
    ? params.competitors.slice(0, 2).join(' and ')
    : 'leading market alternatives';

  const templates: SuggestedPromptItem[] = [
    {
      category: 'Brand Discovery',
      stage: 'AWARENESS',
      promptText: `What are the emerging platforms in ${ind} for ${aud} in ${country}?`,
      topicTags: ['discovery', ind.toLowerCase(), 'market-overview'],
    },
    {
      category: 'Product Discovery',
      stage: 'CONSIDERATION',
      promptText: `Which solutions offer ${prods} with transparent pricing in ${country}?`,
      topicTags: ['products', 'features', 'solutions'],
    },
    {
      category: 'Service Discovery',
      stage: 'CONSIDERATION',
      promptText: `Where can ${aud} find reliable ${ind} tools designed for high performance?`,
      topicTags: ['services', 'tools', 'performance'],
    },
    {
      category: 'Recommendation Queries',
      stage: 'CONSIDERATION',
      promptText: `Recommend top-rated ${ind} software for growing teams like ${brand}.`,
      topicTags: ['recommendations', 'software', 'top-rated'],
    },
    {
      category: 'Comparison Queries',
      stage: 'DECISION',
      promptText: `How does ${brand} compare against ${comps} in features, accuracy, and pricing?`,
      topicTags: ['comparison', 'alternatives', 'pricing'],
    },
    {
      category: 'Informational Queries',
      stage: 'AWARENESS',
      promptText: `What are the best practices for adopting ${prods} in modern businesses?`,
      topicTags: ['best-practices', 'guide', 'information'],
    },
    {
      category: 'Local/Regional Queries',
      stage: 'CONSIDERATION',
      promptText: `Who are the best ${ind} providers located in or serving ${country}?`,
      topicTags: ['regional', country.toLowerCase(), 'local'],
    },
    {
      category: 'Purchase Intent',
      stage: 'DECISION',
      promptText: `Is ${brand} worth the investment for teams needing ${prods}?`,
      topicTags: ['purchase-intent', 'roi', 'reviews'],
    },
    {
      category: 'Competitor Discovery',
      stage: 'AWARENESS',
      promptText: `Who are the main competitors and market leaders in ${ind} besides ${comps}?`,
      topicTags: ['competitors', 'market-leaders', 'alternatives'],
    },
  ];

  const count = params.count || 5;
  return templates.slice(0, Math.min(count, templates.length));
}

/**
 * Generates prompt suggestions for a given project based on configured brand and competitors.
 */
export async function generatePromptSuggestionsForProject(
  organizationId: string,
  projectId: string,
  options?: { count?: number; categories?: string[] }
): Promise<SuggestedPromptItem[]> {
  const brand =
    (await prisma.brand.findFirst({
      where: { organizationId, projectId, isArchived: false, isPrimary: true },
    })) ||
    (await prisma.brand.findFirst({
      where: { organizationId, projectId, isArchived: false },
    }));

  const competitors = await prisma.competitor.findMany({
    where: { organizationId, projectId, isArchived: false },
    take: 5,
  });

  const brandName = brand?.canonicalName || 'Visnora';
  const industry = brand?.industry || undefined;
  const productsServices = brand?.productsServices || undefined;
  const targetAudience = brand?.targetAudience || undefined;
  const competitorNames = competitors.map((c) => c.canonicalName);

  let suggestions = generatePromptSuggestions({
    brandName,
    industry,
    productsServices,
    targetAudience,
    competitors: competitorNames,
    count: options?.count || 10,
  });

  if (options?.categories && options.categories.length > 0) {
    const cats = new Set(options.categories.map((c) => c.toLowerCase()));
    suggestions = suggestions.filter((s) => cats.has(s.category.toLowerCase()));
  }

  return suggestions;
}

/**
 * Seeds initial benchmark prompts from the M0 dataset for a brand
 */
export async function seedDefaultPromptsFromDataset(
  organizationId: string,
  projectId: string,
  brandName: string
) {
  try {
    const datasetPath = path.resolve(__dirname, '../../integrations/ai-providers/datasets/prompts-50.json');
    if (!fs.existsSync(datasetPath)) {
      return { seeded: 0 };
    }

    const raw = fs.readFileSync(datasetPath, 'utf8');
    const items = JSON.parse(raw);

    let count = 0;
    for (const item of items.slice(0, 10)) {
      await prisma.trackedPrompt.create({
        data: {
          organizationId,
          projectId,
          promptText: item.promptText,
          category: item.category || 'General Discovery',
          stage: item.buyingStage || 'CONSIDERATION',
          topicTags: item.topicTags || [item.targetIndustry || 'SaaS'],
          targetProvider: 'google-gemini',
          targetModel: 'gemini-3.8-flash',
          targetLocale: item.targetLocale || 'en-IN',
          cadence: 'DAILY',
          isActive: true,
        },
      });
      count++;
    }

    return { seeded: count };
  } catch {
    return { seeded: 0 };
  }
}

