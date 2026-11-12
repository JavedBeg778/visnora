// Visnora — GET & POST /api/v1/ads/recommendations
// Evidence-backed AI ad recommendations

import { NextRequest } from 'next/server';
import { prisma } from '@/database/src/client';
import { AdRecommendationService } from '@/domain/ad-intelligence/recommendations/ad-recommendation-service';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const orgId = request.headers.get('x-organization-id') || searchParams.get('organizationId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const where: any = { organizationId: orgId };
    if (category && category !== 'ALL') where.category = category;
    if (status && status !== 'ALL') where.status = status;

    const dbRecs = await prisma.adRecommendation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (dbRecs.length > 0) {
      return formatSuccessResponse(dbRecs);
    }

    // Default synthesized evidence-backed recommendations for initial experience
    const initial = AdRecommendationService.generateRecommendations('Zomato', [
      {
        externalAdId: 'meta_swiggy_ad_001',
        platform: 'META_ADS',
        advertiserName: 'Swiggy',
        headline: 'Craving Biryani? Get Flat ₹125 OFF on your first 3 orders on Swiggy!',
        primaryText: 'Hungry? Lightning-fast 20-min delivery from top-rated restaurants near you.',
        ctaText: 'Order Now',
        format: 'IMAGE',
        status: 'ACTIVE',
        contentHash: 'h1',
      },
      {
        externalAdId: 'tt_swiggy_hook_001',
        platform: 'TIKTOK_ADS',
        advertiserName: 'Swiggy',
        headline: 'Late night cravings hitting different? Watch this 🤤🍕',
        primaryText: 'Midnight hunger strikes? Swiggy delivers hot pizza in 20 minutes!',
        ctaText: 'Order Now',
        format: 'VIDEO',
        status: 'ACTIVE',
        contentHash: 'h2',
      },
    ]);

    return formatSuccessResponse(initial);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId;
    const projectId = body.projectId;
    const brandName = body.brandName || 'Zomato';

    if (!orgId || !projectId) {
      return formatErrorResponse(new Error('organizationId and projectId are required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    // Fetch competitors' ads for this organization
    const ads = await prisma.adRecord.findMany({
      where: { organizationId: orgId },
      take: 25,
    });

    const normalized = ads.map((a: any) => ({
      externalAdId: a.externalAdId,
      platform: a.platform as any,
      advertiserName: a.advertiserName,
      headline: a.headline || undefined,
      primaryText: a.primaryText || undefined,
      description: a.description || undefined,
      ctaText: a.ctaText || undefined,
      format: a.format as any,
      status: a.status as any,
      contentHash: a.contentHash,
    }));

    const recommendations = AdRecommendationService.generateRecommendations(brandName, normalized);

    // Save recommendations into DB
    for (const rec of recommendations) {
      await prisma.adRecommendation.create({
        data: {
          organizationId: orgId,
          projectId,
          brandId: body.brandId || null,
          category: rec.category,
          title: rec.title,
          explanation: rec.explanation,
          evidenceSummary: rec.evidenceSummary,
          expectedBenefit: rec.expectedBenefit,
          confidence: rec.confidence,
          suggestedAction: rec.suggestedAction,
          supportingAdIds: rec.supportingAdIds,
          status: 'NEW',
        },
      }).catch((e: any) => console.warn('[RecsRoute] Could not save recommendation:', e));
    }

    return formatSuccessResponse(recommendations, 201);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
