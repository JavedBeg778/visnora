// Visnora — AI Visibility Analytics & Mathematical Metrics Engine
// Reference: docs/DATA_METHODOLOGY.md & docs/TECHNICAL_BLUEPRINT.md

import { prisma } from '../../database/src/client';
import {
  calculateObservedMentionRate,
  calculateCompetitorMentionRate,
  calculateSampleShareOfVoice,
  calculateAveragePosition,
} from './metrics';
import { SentimentType } from '../../shared/types/index';

export interface VisibilityScoreBreakdown {
  score: number; // 0 - 100
  omrComponent: number; // out of 45
  ssovComponent: number; // out of 25
  citationComponent: number; // out of 15
  sentimentComponent: number; // out of 15
  formulaNotice: string;
}

/**
 * Calculates the normalized 0-100 AI Visibility Score
 * Formula: 45% Mention Rate (OMR) + 25% Share of Voice (SSOV) + 15% Citation Rate + 15% Positive Sentiment Rate
 */
export function calculateAiVisibilityScore(params: {
  observedMentionRate: number; // 0-100
  sampleShareOfVoice: number; // 0-100
  citationRate: number; // 0-100
  positiveSentimentRate: number; // 0-100
}): VisibilityScoreBreakdown {
  const omrComponent = Number(((params.observedMentionRate * 0.45)).toFixed(2));
  const ssovComponent = Number(((params.sampleShareOfVoice * 0.25)).toFixed(2));
  const citationComponent = Number(((params.citationRate * 0.15)).toFixed(2));
  const sentimentComponent = Number(((params.positiveSentimentRate * 0.15)).toFixed(2));

  const rawScore = omrComponent + ssovComponent + citationComponent + sentimentComponent;
  const score = Math.max(0, Math.min(100, Number(rawScore.toFixed(1))));

  const formulaNotice =
    'AI Visibility Score (0-100) is calculated as: 45% Mention Rate + 25% Share of Voice + 15% Citation Rate + 15% Positive Sentiment Rate across eligible completed responses.';

  return {
    score,
    omrComponent,
    ssovComponent,
    citationComponent,
    sentimentComponent,
    formulaNotice,
  };
}

/**
 * Retrieves comprehensive AI Visibility Overview metrics for a project
 */
export async function getProjectVisibilityOverview(
  organizationId: string,
  projectId: string,
  dateRangeDays = 30,
  brandId?: string
) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - dateRangeDays);

  const configuredCompetitors = await prisma.competitor.findMany({
    where: { organizationId, projectId, isArchived: false },
    select: { id: true },
  });
  const configuredCompetitorIds = new Set(configuredCompetitors.map((competitor) => competitor.id));

  // 1. Fetch completed prompt runs with AI response, mentions, and citations
  const runs = await prisma.promptRun.findMany({
    where: {
      organizationId,
      projectId,
      status: 'COMPLETED',
      createdAt: { gte: sinceDate },
    },
    include: {
      aiResponse: {
        include: {
          mentions: true,
          citations: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalCompletedRuns = runs.length;

  if (totalCompletedRuns === 0) {
    return {
      hasData: false,
      totalCompletedRuns: 0,
      totalBrandMentions: 0,
      totalCompetitorMentions: 0,
      totalCitations: 0,
      visibilityScore: 0,
      mentionRate: 0,
      citationRate: 0,
      shareOfVoice: 0,
      averagePosition: null,
      sentimentDistribution: {
        positive: 0,
        neutral: 0,
        negative: 0,
        mixed: 0,
        unknown: 0,
      },
      topCitedDomains: [],
      scoreBreakdown: calculateAiVisibilityScore({
        observedMentionRate: 0,
        sampleShareOfVoice: 0,
        citationRate: 0,
        positiveSentimentRate: 0,
      }),
      samplingDisclaimer:
        'These metrics are based on sampled prompt observations. They reflect observed presence in evaluated AI answers rather than global search volume or impressions.',
    };
  }

  // 2. Count responses with target brand mentions
  let runsWithBrand = 0;
  let runsWithCitations = 0;
  let totalBrandMentions = 0;
  let totalCompetitorMentions = 0;
  let totalCitations = 0;
  const positions: number[] = [];

  const sentimentCounts: Record<string, number> = {
    POSITIVE: 0,
    NEUTRAL: 0,
    NEGATIVE: 0,
    MIXED: 0,
    UNKNOWN: 0,
  };

  const domainCounts = new Map<string, number>();

  for (const run of runs) {
    if (!run.aiResponse) continue;

    const brandMentions = brandId
      ? run.aiResponse.mentions.filter((m) => m.matchedEntityId === brandId || (m.mentionType === 'PRIMARY_BRAND' && !m.matchedEntityId))
      : run.aiResponse.mentions.filter((m) => m.mentionType === 'PRIMARY_BRAND');
    const compMentions = run.aiResponse.mentions.filter(
      (mention) => mention.mentionType === 'COMPETITOR' &&
        mention.matchedEntityId !== null &&
        configuredCompetitorIds.has(mention.matchedEntityId) &&
        mention.matchedEntityId !== brandId
    );
    const citations = run.aiResponse.citations;

    if (brandMentions.length > 0) {
      runsWithBrand++;
      totalBrandMentions += brandMentions.length;

      for (const m of brandMentions) {
        if (m.listPosition !== null) positions.push(m.listPosition);
        const s = m.sentiment.toString();
        sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
      }
    }

    if (compMentions.length > 0) {
      totalCompetitorMentions += compMentions.length;
    }

    if (citations.length > 0) {
      runsWithCitations++;
      totalCitations += citations.length;

      for (const c of citations) {
        domainCounts.set(c.domain, (domainCounts.get(c.domain) || 0) + 1);
      }
    }
  }

  // 3. Mathematical ratios
  const mentionRate = calculateObservedMentionRate(runsWithBrand, totalCompletedRuns);
  const citationRate = Number(((runsWithCitations / totalCompletedRuns) * 100).toFixed(1));
  const { ssov } = calculateSampleShareOfVoice(totalBrandMentions, totalCompetitorMentions);
  const averagePosition = calculateAveragePosition(positions);

  const totalBrandSentimentCount = Math.max(1, totalBrandMentions);
  const positiveSentimentRate = Number(
    (((sentimentCounts.POSITIVE || 0) / totalBrandSentimentCount) * 100).toFixed(1)
  );

  const scoreBreakdown = calculateAiVisibilityScore({
    observedMentionRate: mentionRate,
    sampleShareOfVoice: ssov,
    citationRate,
    positiveSentimentRate,
  });

  // Top cited domains
  const topCitedDomains = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({
      domain,
      count,
      percentage: Number(((count / totalCitations) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    hasData: true,
    totalCompletedRuns,
    totalBrandMentions,
    totalCompetitorMentions,
    totalCitations,
    visibilityScore: scoreBreakdown.score,
    mentionRate,
    citationRate,
    shareOfVoice: ssov,
    averagePosition,
    sentimentDistribution: {
      positive: Number((((sentimentCounts.POSITIVE || 0) / totalBrandSentimentCount) * 100).toFixed(1)),
      neutral: Number((((sentimentCounts.NEUTRAL || 0) / totalBrandSentimentCount) * 100).toFixed(1)),
      negative: Number((((sentimentCounts.NEGATIVE || 0) / totalBrandSentimentCount) * 100).toFixed(1)),
      mixed: Number((((sentimentCounts.MIXED || 0) / totalBrandSentimentCount) * 100).toFixed(1)),
      unknown: Number((((sentimentCounts.UNKNOWN || 0) / totalBrandSentimentCount) * 100).toFixed(1)),
    },
    topCitedDomains,
    scoreBreakdown,
    samplingDisclaimer:
      'These metrics are based on sampled prompt observations. They reflect observed presence in evaluated AI answers rather than global search volume or impressions.',
  };
}

/**
 * Retrieves Competitor Comparison statistics
 */
export async function getCompetitorComparison(
  organizationId: string,
  projectId: string,
  dateRangeDays = 30,
  brandId?: string
) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - dateRangeDays);

  const brand = brandId
    ? await prisma.brand.findFirst({ where: { id: brandId, organizationId } })
    : (await prisma.brand.findFirst({ where: { projectId, organizationId, isPrimary: true } })) ||
      (await prisma.brand.findFirst({ where: { projectId, organizationId } }));

  const competitors = await prisma.competitor.findMany({
    where: { projectId, organizationId, isArchived: false },
  });

  const runs = await prisma.promptRun.findMany({
    where: {
      organizationId,
      projectId,
      status: 'COMPLETED',
      createdAt: { gte: sinceDate },
    },
    include: {
      aiResponse: {
        include: {
          mentions: true,
          citations: true,
        },
      },
    },
  });

  const totalRuns = runs.length;
  if (totalRuns === 0) {
    return {
      totalRuns: 0,
      primaryBrand: {
        name: brand?.canonicalName || 'Primary Brand',
        domain: brand?.domain || '',
        mentionCount: 0,
        mentionRate: 0,
        shareOfVoice: 0,
        averagePosition: null,
      },
      competitors: competitors.map((c) => ({
        id: c.id,
        name: c.canonicalName,
        domain: c.domain,
        mentionCount: 0,
        mentionRate: 0,
        shareOfVoice: 0,
        averagePosition: null,
      })),
    };
  }

  // Count primary brand occurrences
  let primaryRunsCount = 0;
  let primaryTotalMentions = 0;
  const primaryPositions: number[] = [];

  // Competitor occurrence tracker
  const compStats = new Map<
    string,
    { id: string; name: string; domain: string; runsCount: number; mentionsCount: number; positions: number[] }
  >();

  for (const c of competitors) {
    compStats.set(c.id, {
      id: c.id,
      name: c.canonicalName,
      domain: c.domain,
      runsCount: 0,
      mentionsCount: 0,
      positions: [],
    });
  }

  for (const run of runs) {
    if (!run.aiResponse) continue;

    let runHasPrimary = false;
    const compsSeenInRun = new Set<string>();

    for (const mention of run.aiResponse.mentions) {
      const isTarget = brandId
        ? mention.matchedEntityId === brandId || (mention.mentionType === 'PRIMARY_BRAND' && !mention.matchedEntityId)
        : mention.mentionType === 'PRIMARY_BRAND';

      if (isTarget) {
        runHasPrimary = true;
        primaryTotalMentions++;
        if (mention.listPosition !== null) primaryPositions.push(mention.listPosition);
      } else if (mention.mentionType === 'COMPETITOR' || (brandId && mention.matchedEntityId !== brandId)) {
        const stat = compStats.get(mention.matchedEntityId);
        if (stat) {
          stat.mentionsCount++;
          compsSeenInRun.add(mention.matchedEntityId);
          if (mention.listPosition !== null) stat.positions.push(mention.listPosition);
        }
      }
    }

    if (runHasPrimary) primaryRunsCount++;
    for (const compId of compsSeenInRun) {
      const stat = compStats.get(compId);
      if (stat) stat.runsCount++;
    }
  }

  const allMentionsCount =
    primaryTotalMentions +
    Array.from(compStats.values()).reduce((acc, c) => acc + c.mentionsCount, 0);

  const safeDenominator = Math.max(1, allMentionsCount);

  return {
    totalRuns,
    primaryBrand: {
      name: brand?.canonicalName || 'Primary Brand',
      domain: brand?.domain || '',
      mentionCount: primaryTotalMentions,
      mentionRate: Number(((primaryRunsCount / totalRuns) * 100).toFixed(1)),
      shareOfVoice: Number(((primaryTotalMentions / safeDenominator) * 100).toFixed(1)),
      averagePosition: calculateAveragePosition(primaryPositions),
    },
    competitors: Array.from(compStats.values()).map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      mentionCount: c.mentionsCount,
      mentionRate: Number(((c.runsCount / totalRuns) * 100).toFixed(1)),
      shareOfVoice: Number(((c.mentionsCount / safeDenominator) * 100).toFixed(1)),
      averagePosition: calculateAveragePosition(c.positions),
    })),
  };
}

/**
 * Retrieves Citation Intelligence details (top sources, frequency, distribution)
 */
export async function getCitationIntelligence(
  organizationId: string,
  projectId: string,
  dateRangeDays = 30
) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - dateRangeDays);

  const citations = await prisma.citation.findMany({
    where: {
      organizationId,
      aiResponse: {
        promptRun: {
          projectId,
          status: 'COMPLETED',
          createdAt: { gte: sinceDate },
        },
      },
    },
    include: {
      aiResponse: {
        include: {
          promptRun: {
            select: {
              prompt: { select: { promptText: true, category: true } },
              executedAt: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const domainMap = new Map<string, { count: number; urls: Set<string>; recentAnchor?: string }>();

  for (const c of citations) {
    const existing = domainMap.get(c.domain) || { count: 0, urls: new Set<string>() };
    existing.count++;
    existing.urls.add(c.url);
    if (c.anchorText) existing.recentAnchor = c.anchorText;
    domainMap.set(c.domain, existing);
  }

  const totalCitations = citations.length;
  const sortedDomains = Array.from(domainMap.entries())
    .map(([domain, data]) => ({
      domain,
      citationCount: data.count,
      uniqueUrlsCount: data.urls.size,
      prevalencePercent: totalCitations > 0 ? Number(((data.count / totalCitations) * 100).toFixed(1)) : 0,
      sampleAnchor: data.recentAnchor,
    }))
    .sort((a, b) => b.citationCount - a.citationCount);

  return {
    totalCitations,
    uniqueDomainsCount: sortedDomains.length,
    topDomains: sortedDomains.slice(0, 20),
    recentCitations: citations.slice(0, 30).map((c) => ({
      id: c.id,
      url: c.url,
      domain: c.domain,
      anchorText: c.anchorText,
      promptText: c.aiResponse.promptRun.prompt.promptText,
      category: c.aiResponse.promptRun.prompt.category,
      executedAt: c.aiResponse.promptRun.executedAt,
    })),
  };
}

/**
 * Calculates one daily trend bucket using the same canonical score as the overview.
 * Mention rate is response coverage (responses containing the brand), not raw mention count.
 */
export function calculateDailyVisibilityMetrics(input: {
  runsCount: number;
  runsWithBrand: number;
  brandMentions: number;
  competitorMentions: number;
  runsWithCitations: number;
  positiveBrandMentions: number;
  brandSentimentCount: number;
}) {
  const totalMentions = input.brandMentions + input.competitorMentions;
  const mentionRate = input.runsCount > 0
    ? Number(((input.runsWithBrand / input.runsCount) * 100).toFixed(1))
    : 0;
  const shareOfVoice = totalMentions > 0
    ? Number(((input.brandMentions / totalMentions) * 100).toFixed(1))
    : 0;
  const citationRate = input.runsCount > 0
    ? Number(((input.runsWithCitations / input.runsCount) * 100).toFixed(1))
    : 0;
  const positiveSentimentRate = input.brandSentimentCount > 0
    ? Number(((input.positiveBrandMentions / input.brandSentimentCount) * 100).toFixed(1))
    : 0;

  return {
    mentionRate,
    shareOfVoice,
    citationRate,
    positiveSentimentRate,
    visibilityScore: calculateAiVisibilityScore({
      observedMentionRate: mentionRate,
      sampleShareOfVoice: shareOfVoice,
      citationRate,
      positiveSentimentRate,
    }).score,
  };
}

/**
 * Historical time-series trends grouped by daily buckets
 */
export async function getHistoricalTrends(
  organizationId: string,
  projectId: string,
  dateRangeDays = 30,
  brandId?: string
) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - dateRangeDays);

  const [runs, competitors] = await Promise.all([
    prisma.promptRun.findMany({
      where: {
        organizationId,
        projectId,
        status: 'COMPLETED',
        createdAt: { gte: sinceDate },
      },
      include: {
        aiResponse: {
          include: { mentions: true, citations: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.competitor.findMany({
      where: { organizationId, projectId, isArchived: false },
      select: { id: true },
    }),
  ]);

  const competitorIds = new Set(competitors.map((competitor) => competitor.id));
  const dailyMap = new Map<string, {
    date: string;
    runsCount: number;
    runsWithBrand: number;
    runsWithCitations: number;
    brandMentions: number;
    compMentions: number;
    positiveBrandMentions: number;
    brandSentimentCount: number;
    citationsCount: number;
  }>();

  for (const run of runs) {
    // UTC date buckets keep the trend chart stable across server regions.
    const day = run.createdAt.toISOString().slice(0, 10);
    const existing = dailyMap.get(day) || {
      date: day,
      runsCount: 0,
      runsWithBrand: 0,
      runsWithCitations: 0,
      brandMentions: 0,
      compMentions: 0,
      positiveBrandMentions: 0,
      brandSentimentCount: 0,
      citationsCount: 0,
    };

    existing.runsCount++;

    if (run.aiResponse) {
      const brandMentions = run.aiResponse.mentions.filter((mention) =>
        brandId
          ? mention.matchedEntityId === brandId ||
            (mention.mentionType === 'PRIMARY_BRAND' && !mention.matchedEntityId)
          : mention.mentionType === 'PRIMARY_BRAND'
      );
      const competitorMentions = run.aiResponse.mentions.filter(
        (mention) =>
          mention.mentionType === 'COMPETITOR' &&
          mention.matchedEntityId !== null &&
          competitorIds.has(mention.matchedEntityId) &&
          mention.matchedEntityId !== brandId
      );

      existing.brandMentions += brandMentions.length;
      existing.compMentions += competitorMentions.length;
      if (brandMentions.length > 0) existing.runsWithBrand++;
      existing.brandSentimentCount += brandMentions.length;
      existing.positiveBrandMentions += brandMentions.filter(
        (mention) => mention.sentiment.toString() === 'POSITIVE'
      ).length;
      existing.citationsCount += run.aiResponse.citations.length;
      if (run.aiResponse.citations.length > 0) existing.runsWithCitations++;
    }

    dailyMap.set(day, existing);
  }

  return Array.from(dailyMap.values()).map((day) => ({
    date: day.date,
    runsCount: day.runsCount,
    ...calculateDailyVisibilityMetrics({
      runsCount: day.runsCount,
      runsWithBrand: day.runsWithBrand,
      brandMentions: day.brandMentions,
      competitorMentions: day.compMentions,
      runsWithCitations: day.runsWithCitations,
      positiveBrandMentions: day.positiveBrandMentions,
      brandSentimentCount: day.brandSentimentCount,
    }),
    citationsCount: day.citationsCount,
  }));
}
