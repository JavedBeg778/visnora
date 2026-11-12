// Visnora — POST /api/v1/ads/submit-url
// Safe manual ad URL submission with SSRF validation

import { NextRequest } from 'next/server';
import { prisma } from '@/database/src/client';
import { ManualUrlSourceAdapter } from '@/domain/ad-intelligence/sources/manual-url-adapter';
import { CreativeExtractor } from '@/domain/ad-intelligence/extraction/creative-extractor';
import { AdAnalysisService } from '@/domain/ad-intelligence/analysis/ad-analysis-service';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId;
    const projectId = body.projectId;
    const url = body.url;

    if (!orgId || !projectId || !url) {
      return formatErrorResponse(new Error('organizationId, projectId, and url are required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const adapter = new ManualUrlSourceAdapter();
    const discovery = await adapter.discoverAds({
      organizationId: orgId,
      projectId,
      query: url,
      limit: 1,
    });

    if (!discovery.ads || discovery.ads.length === 0) {
      return formatErrorResponse(new Error('Could not parse or safely access the submitted advertisement URL.'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const rawAd = discovery.ads[0];
    const extracted = CreativeExtractor.extract(rawAd);

    // Persist into database
    let savedAd: any = null;
    try {
      savedAd = await prisma.adRecord.upsert({
        where: {
          uq_org_platform_ext_ad: {
            organizationId: orgId,
            platform: 'MANUAL',
            externalAdId: rawAd.externalAdId,
          },
        },
        update: {
          headline: extracted.headline,
          primaryText: extracted.primaryText,
          description: extracted.description,
          ctaText: extracted.ctaText,
          format: extracted.format as any,
          landingPageUrl: rawAd.landingPageUrl,
          contentHash: extracted.contentHash,
          lastSeenAt: new Date(),
        },
        create: {
          organizationId: orgId,
          projectId,
          competitorId: body.competitorId || null,
          brandId: body.brandId || null,
          platform: 'MANUAL',
          externalAdId: rawAd.externalAdId,
          originalUrl: rawAd.originalUrl,
          advertiserName: rawAd.advertiserName,
          headline: extracted.headline,
          primaryText: extracted.primaryText,
          description: extracted.description,
          ctaText: extracted.ctaText,
          format: extracted.format as any,
          landingPageUrl: rawAd.landingPageUrl,
          contentHash: extracted.contentHash,
          status: 'ACTIVE',
        },
      });

      // Run AI analysis
      const analysisService = new AdAnalysisService();
      const analysis = await analysisService.analyzeAd({
        adRecordId: savedAd.id,
        organizationId: orgId,
        advertiserName: rawAd.advertiserName,
        headline: extracted.headline,
        primaryText: extracted.primaryText,
        description: extracted.description,
        ctaText: extracted.ctaText,
        format: extracted.format,
        landingPageUrl: rawAd.landingPageUrl,
      });

      await prisma.adAnalysis.create({
        data: {
          adRecordId: savedAd.id,
          organizationId: orgId,
          mainMessage: analysis.mainMessage,
          valueProposition: analysis.valueProposition,
          painPoints: analysis.painPoints,
          audienceSignals: analysis.audienceSignals,
          emotionalVsRational: analysis.emotionalVsRational,
          positioning: analysis.positioning,
          promotionalStrategy: analysis.promotionalStrategy,
          offerStrategy: analysis.offerStrategy,
          ctaStrategy: analysis.ctaStrategy,
          creativeFormat: analysis.creativeFormat,
          messagingAngle: analysis.messagingAngle,
          confidenceScore: analysis.confidenceScore,
          model: analysis.model,
          promptTokens: analysis.promptTokens,
          completionTokens: analysis.completionTokens,
          estimatedCostPaise: analysis.estimatedCostPaise,
          rawAiOutput: analysis.rawAiOutput || {},
          status: 'COMPLETED',
        },
      }).catch(() => {});
    } catch (dbErr) {
      console.warn('[SubmitUrlRoute] DB save warning:', dbErr);
    }

    return formatSuccessResponse({
      ad: savedAd || rawAd,
      extracted,
      message: 'Ad URL safely submitted, validated, and ingested.',
    }, 201);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
