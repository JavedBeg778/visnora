// Visnora — Actionable Recommendations Domain Service
// Evidence-based recommendations derived from observed AI visibility runs
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/PRD.md

import { prisma } from '../../database/src/client';
import { NotFoundError, ValidationError } from '../organizations/service';

export async function getRecommendations(
  organizationId: string,
  projectId: string,
  status?: string
) {
  return await prisma.recommendation.findMany({
    where: {
      organizationId,
      projectId,
      ...(status ? { status } : {}),
    },
    orderBy: [
      { priority: 'asc' }, // HIGH -> MEDIUM -> LOW
      { createdAt: 'desc' },
    ],
  });
}

export async function updateRecommendationStatus(
  recommendationId: string,
  organizationId: string,
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED'
) {
  const rec = await prisma.recommendation.findFirst({
    where: { id: recommendationId, organizationId },
  });

  if (!rec) {
    throw new NotFoundError('Recommendation not found');
  }

  return await prisma.recommendation.update({
    where: { id: recommendationId },
    data: { status },
  });
}

/**
 * Automatically derives evidence-based recommendations for a project following a tracking run
 */
export async function generateRecommendationsForRun(
  organizationId: string,
  projectId: string,
  trackingRunId: string
) {
  const run = await prisma.trackingRun.findUnique({
    where: { id: trackingRunId },
    include: {
      promptRuns: {
        include: {
          prompt: true,
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

  if (!run || run.promptRuns.length === 0) return [];

  const createdRecommendations = [];

  // 1. Check for recommendation queries where brand is missing
  const recommendationRuns = run.promptRuns.filter((pr) =>
    pr.prompt.category?.toLowerCase().includes('recommendation')
  );

  const missingRecRuns = recommendationRuns.filter((pr) => {
    const hasBrand = pr.aiResponse?.mentions.some((m) => m.mentionType === 'PRIMARY_BRAND');
    return !hasBrand;
  });

  if (missingRecRuns.length > 0) {
    const samplePrompt = missingRecRuns[0].prompt.promptText;
    const existing = await prisma.recommendation.findFirst({
      where: {
        projectId,
        title: 'Optimize Presence for Recommendation Queries',
      },
    });

    if (!existing) {
      const rec = await prisma.recommendation.create({
        data: {
          organizationId,
          projectId,
          title: 'Optimize Presence for Recommendation Queries',
          explanation: `Your brand was not recommended in ${missingRecRuns.length} direct recommendation search queries where AI models offered alternatives.`,
          evidence: `Failed to appear in query: "${samplePrompt}". Models cited competitor alternatives instead.`,
          relatedMetric: 'Mention Rate',
          priority: 'HIGH',
          suggestedAction:
            'Publish authoritative comparison guides and customer reviews addressing specific use-cases to build topical authority for AI search grounding.',
          status: 'NEW',
        },
      });
      createdRecommendations.push(rec);
    }
  }

  // 2. Check for Competitor Dominance
  let brandMentionsCount = 0;
  let compMentionsCount = 0;
  const competitorNames = new Set<string>();

  for (const pr of run.promptRuns) {
    if (!pr.aiResponse) continue;
    for (const m of pr.aiResponse.mentions) {
      if (m.mentionType === 'PRIMARY_BRAND') brandMentionsCount++;
      if (m.mentionType === 'COMPETITOR') {
        compMentionsCount++;
        competitorNames.add(m.entityName);
      }
    }
  }

  if (compMentionsCount > brandMentionsCount * 1.5 && competitorNames.size > 0) {
    const compsStr = Array.from(competitorNames).slice(0, 2).join(' and ');
    const existing = await prisma.recommendation.findFirst({
      where: {
        projectId,
        title: 'Competitor Share of Voice Outpacing Brand',
      },
    });

    if (!existing) {
      const rec = await prisma.recommendation.create({
        data: {
          organizationId,
          projectId,
          title: 'Competitor Share of Voice Outpacing Brand',
          explanation: `Competitors (${compsStr}) accounted for ${compMentionsCount} total mentions compared to ${brandMentionsCount} mentions for your brand.`,
          evidence: `Sample Share of Voice is currently under 40% across evaluated search prompts.`,
          relatedMetric: 'Share of Voice',
          priority: 'MEDIUM',
          suggestedAction:
            'Audit competitor landing pages and digital PR citations to identify authoritative referring publications currently linking to them.',
          status: 'NEW',
        },
      });
      createdRecommendations.push(rec);
    }
  }

  // 3. Check for Frequently Cited Third-Party Domains
  const domainCounts = new Map<string, number>();
  for (const pr of run.promptRuns) {
    if (!pr.aiResponse) continue;
    for (const c of pr.aiResponse.citations) {
      domainCounts.set(c.domain, (domainCounts.get(c.domain) || 0) + 1);
    }
  }

  const topDomain = Array.from(domainCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topDomain && topDomain[1] >= 2) {
    const existing = await prisma.recommendation.findFirst({
      where: {
        projectId,
        title: `Establish Citation Presence on ${topDomain[0]}`,
      },
    });

    if (!existing) {
      const rec = await prisma.recommendation.create({
        data: {
          organizationId,
          projectId,
          title: `Establish Citation Presence on ${topDomain[0]}`,
          explanation: `AI models frequently cite ${topDomain[0]} (${topDomain[1]} citations observed in this run) when grounding responses.`,
          evidence: `Domain "${topDomain[0]}" appeared in multiple answer citations across informational and product discovery queries.`,
          relatedMetric: 'Citation Rate',
          priority: 'HIGH',
          suggestedAction:
            `Target ${topDomain[0]} for digital PR outreach, product listings, or guest editorial coverage to increase AI grounding probability.`,
          status: 'NEW',
        },
      });
      createdRecommendations.push(rec);
    }
  }

  return createdRecommendations;
}

