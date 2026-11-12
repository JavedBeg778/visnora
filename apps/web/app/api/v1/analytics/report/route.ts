// GET /api/v1/analytics/report
// Reference: docs/API_CONTRACT.md & M3.4 Pilot UX & Reports

import { NextRequest, NextResponse } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { prisma } from '@/database/src/client';
import {
  getProjectVisibilityOverview,
  getCompetitorComparison,
  getCitationIntelligence,
} from '@/domain/ai-visibility/analytics-service';
import { getRecommendations } from '@/domain/ai-visibility/recommendation-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const orgId = request.headers.get('x-organization-id') || searchParams.get('orgId');
    const projectId = searchParams.get('projectId');
    const brandId = searchParams.get('brandId') || undefined;
    const days = parseInt(searchParams.get('days') || '30', 10);
    const format = (searchParams.get('format') || 'json').toLowerCase();

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    if (!projectId) {
      return formatErrorResponse(new Error('projectId is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    // Verify project exists in organization
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId, isArchived: false },
      include: {
        brands: { where: { isArchived: false } },
      },
    });

    if (!project) {
      return formatErrorResponse(new Error('Project not found'), 'Project not found', 'NOT_FOUND', 404);
    }

    const activeBrand = brandId
      ? project.brands.find((b: { id: string }) => b.id === brandId) ||
        (await prisma.brand.findFirst({ where: { id: brandId, organizationId: orgId } }))
      : project.brands.find((b: { isPrimary: boolean }) => b.isPrimary) || project.brands[0];

    const brandName = activeBrand?.canonicalName || 'Target Brand';

    // Parallel fetch real analytics records
    const [overview, competitorStats, citationStats, recommendations] = await Promise.all([
      getProjectVisibilityOverview(orgId, projectId, days, brandId),
      getCompetitorComparison(orgId, projectId, days, brandId),
      getCitationIntelligence(orgId, projectId, days),
      getRecommendations(orgId, projectId),
    ]);

    const reportTimestamp = new Date().toISOString();
    const methodologyNotice =
      'Visnora AI Visibility metrics are computed from empirical prompt evaluations across major LLM providers. Scores reflect observed answer presence, share of voice, citations, and sentiment in evaluated samples.';

    // 1. CSV Format Export
    if (format === 'csv') {
      const csvLines: string[] = [];

      csvLines.push(`"VISNORA PILOT INTELLIGENCE REPORT"`);
      csvLines.push(`"Report Generated","${reportTimestamp}"`);
      csvLines.push(`"Organization ID","${orgId}"`);
      csvLines.push(`"Project Name","${project.name.replace(/"/g, '""')}"`);
      csvLines.push(`"Target Brand","${brandName.replace(/"/g, '""')}"`);
      csvLines.push(`"Evaluation Window","Last ${days} Days"`);
      csvLines.push(`""`);

      // Section 1: Executive KPI Overview
      csvLines.push(`"--- SECTION 1: CORE AI VISIBILITY METRICS ---"`);
      csvLines.push(`"Metric","Value","Unit","Methodology Weight"`);
      csvLines.push(`"Overall AI Visibility Score","${overview.visibilityScore}","/100","Composite (100%)"`);
      csvLines.push(`"Observed Mention Rate (OMR)","${overview.mentionRate}","%","45%"`);
      csvLines.push(`"Sample Share of Voice (SSOV)","${overview.shareOfVoice}","%","25%"`);
      csvLines.push(`"Citation Rate","${overview.citationRate}","%","15%"`);
      csvLines.push(`"Positive Sentiment Rate","${overview.sentimentDistribution.positive}","%","15%"`);
      csvLines.push(`"Total Completed Evaluated Runs","${overview.totalCompletedRuns}","queries","N/A"`);
      csvLines.push(`"Total Brand Mentions Observed","${overview.totalBrandMentions}","mentions","N/A"`);
      csvLines.push(`"Total Competitor Mentions Observed","${overview.totalCompetitorMentions}","mentions","N/A"`);
      csvLines.push(`""`);

      // Section 2: Competitor Visibility Benchmark
      csvLines.push(`"--- SECTION 2: COMPETITOR BENCHMARK ---"`);
      csvLines.push(`"Entity Name","Domain","Total Mentions","Mention Rate (%)","Share of Voice (%)","Average Rank Position"`);
      csvLines.push(
        `"${competitorStats.primaryBrand.name.replace(/"/g, '""')} (Target)","${competitorStats.primaryBrand.domain}","${competitorStats.primaryBrand.mentionCount}","${competitorStats.primaryBrand.mentionRate}%","${competitorStats.primaryBrand.shareOfVoice}%","${competitorStats.primaryBrand.averagePosition ?? 'N/A'}"`
      );
      for (const comp of competitorStats.competitors) {
        csvLines.push(
          `"${comp.name.replace(/"/g, '""')}","${comp.domain}","${comp.mentionCount}","${comp.mentionRate}%","${comp.shareOfVoice}%","${comp.averagePosition ?? 'N/A'}"`
        );
      }
      csvLines.push(`""`);

      // Section 3: Top Citation Sources
      csvLines.push(`"--- SECTION 3: TOP GROUNDING CITATION SOURCES ---"`);
      csvLines.push(`"Domain","Citation Count","Prevalence (%)"`);
      for (const topD of citationStats.topDomains.slice(0, 15)) {
        csvLines.push(`"${topD.domain}","${topD.citationCount}","${topD.prevalencePercent}%"`);
      }
      csvLines.push(`""`);

      // Section 4: Actionable Recommendations
      csvLines.push(`"--- SECTION 4: STRATEGIC RECOMMENDATIONS ---"`);
      csvLines.push(`"Priority","Status","Title","Related Metric","Suggested Action"`);
      for (const rec of recommendations) {
        csvLines.push(
          `"${rec.priority}","${rec.status}","${rec.title.replace(/"/g, '""')}","${rec.relatedMetric}","${rec.suggestedAction.replace(/"/g, '""')}"`
        );
      }
      csvLines.push(`""`);

      // Section 5: Methodology Disclaimer
      csvLines.push(`"--- SECTION 5: METHODOLOGY & COMPLIANCE ---"`);
      csvLines.push(`"Disclaimer","${methodologyNotice.replace(/"/g, '""')}"`);

      const csvString = csvLines.join('\r\n');
      const filename = `visnora-pilot-report-${brandName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${days}d.csv`;

      return new NextResponse(csvString, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // 2. JSON Format Export (Default)
    return formatSuccessResponse({
      reportMetadata: {
        generatedAt: reportTimestamp,
        organizationId: orgId,
        projectId,
        projectName: project.name,
        targetBrand: {
          id: activeBrand?.id,
          name: brandName,
          domain: activeBrand?.domain,
        },
        evaluationPeriodDays: days,
      },
      executiveSummary: {
        visibilityScore: overview.visibilityScore,
        observedMentionRate: overview.mentionRate,
        sampleShareOfVoice: overview.shareOfVoice,
        citationRate: overview.citationRate,
        totalCompletedRuns: overview.totalCompletedRuns,
        totalBrandMentions: overview.totalBrandMentions,
        totalCompetitorMentions: overview.totalCompetitorMentions,
        scoreBreakdown: overview.scoreBreakdown,
        comparison: overview.comparison,
      },
      competitorBenchmark: competitorStats,
      citationIntelligence: {
        totalCitations: citationStats.totalCitations,
        uniqueDomainsCount: citationStats.uniqueDomainsCount,
        topDomains: citationStats.topDomains,
      },
      strategicRecommendations: recommendations.map((r) => ({
        id: r.id,
        priority: r.priority,
        status: r.status,
        title: r.title,
        explanation: r.explanation,
        evidence: r.evidence,
        relatedMetric: r.relatedMetric,
        suggestedAction: r.suggestedAction,
      })),
      methodologyNotice,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
