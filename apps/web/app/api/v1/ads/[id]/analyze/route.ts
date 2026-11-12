// Visnora — POST /api/v1/ads/[id]/analyze
// Trigger on-demand 12-dimension AI Creative & Positioning analysis

import { NextRequest } from 'next/server';
import { prisma } from '@/database/src/client';
import { AdAnalysisService } from '@/domain/ad-intelligence/analysis/ad-analysis-service';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const orgId = request.headers.get('x-organization-id') || body.organizationId;

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const ad = await prisma.adRecord.findUnique({
      where: { id },
    });

    const analysisService = new AdAnalysisService();

    const analysisResult = await analysisService.analyzeAd({
      adRecordId: id,
      organizationId: orgId,
      advertiserName: ad?.advertiserName || body.advertiserName || 'Competitor Brand',
      headline: ad?.headline || body.headline,
      primaryText: ad?.primaryText || body.primaryText,
      description: ad?.description || body.description,
      ctaText: ad?.ctaText || body.ctaText,
      format: ad?.format || body.format,
      landingPageUrl: ad?.landingPageUrl || body.landingPageUrl,
      model: body.model,
    });

    // Save into database if ad exists
    if (ad) {
      await prisma.adAnalysis.create({
        data: {
          adRecordId: id,
          organizationId: orgId,
          mainMessage: analysisResult.mainMessage,
          valueProposition: analysisResult.valueProposition,
          painPoints: analysisResult.painPoints,
          audienceSignals: analysisResult.audienceSignals,
          emotionalVsRational: analysisResult.emotionalVsRational,
          positioning: analysisResult.positioning,
          promotionalStrategy: analysisResult.promotionalStrategy,
          offerStrategy: analysisResult.offerStrategy,
          ctaStrategy: analysisResult.ctaStrategy,
          creativeFormat: analysisResult.creativeFormat,
          messagingAngle: analysisResult.messagingAngle,
          landingPageRelevance: analysisResult.landingPageRelevance,
          confidenceScore: analysisResult.confidenceScore,
          model: analysisResult.model,
          promptTokens: analysisResult.promptTokens,
          completionTokens: analysisResult.completionTokens,
          estimatedCostPaise: analysisResult.estimatedCostPaise,
          rawAiOutput: analysisResult.rawAiOutput || {},
          status: 'COMPLETED',
        },
      }).catch((e: any) => console.warn('[AnalyzeRoute] Could not save analysis to DB:', e));
    }

    return formatSuccessResponse(analysisResult, 201);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
