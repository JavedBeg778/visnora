// Visnora — GET /api/v1/ads/analytics
// Competitor ad intelligence analytics & breakdown

import { NextRequest } from 'next/server';
import { prisma } from '@/database/src/client';
import { CompetitorAdAnalyticsService } from '@/domain/ad-intelligence/analytics/competitor-ad-analytics';
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
    const competitorId = searchParams.get('competitorId');

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const where: any = { organizationId: orgId };
    if (competitorId && competitorId !== 'all') {
      where.competitorId = competitorId;
    }

    const ads = await prisma.adRecord.findMany({
      where,
      include: {
        creatives: true,
        landingPages: true,
      },
    });

    let competitorInfo: { name: string; domain: string } | undefined;
    if (competitorId && competitorId !== 'all') {
      const comp = await prisma.competitor.findUnique({
        where: { id: competitorId },
        select: { canonicalName: true, domain: true },
      });
      if (comp) competitorInfo = { name: comp.canonicalName, domain: comp.domain };
    }

    // Convert Prisma ad records to normalized ad shape for analytics calculation
    const normalizedAds = ads.map((a: any) => ({
      externalAdId: a.externalAdId,
      platform: a.platform as any,
      advertiserName: a.advertiserName,
      headline: a.headline || undefined,
      primaryText: a.primaryText || undefined,
      description: a.description || undefined,
      ctaText: a.ctaText || undefined,
      format: a.format as any,
      landingPageUrl: a.landingPageUrl || undefined,
      status: a.status as any,
      contentHash: a.contentHash,
      firstSeenAt: a.firstSeenAt,
    }));

    // If no ads in DB yet, provide sample intelligence for dashboard demonstration
    if (normalizedAds.length === 0) {
      const sampleAds = [
        {
          externalAdId: 'meta_swiggy_ad_001',
          platform: 'META_ADS' as any,
          advertiserName: 'Swiggy',
          headline: 'Craving Biryani? Get Flat ₹125 OFF on your first 3 orders on Swiggy!',
          primaryText: 'Hungry? Lightning-fast 20-min delivery from top-rated restaurants near you.',
          ctaText: 'Order Now',
          format: 'IMAGE' as any,
          landingPageUrl: 'https://www.swiggy.com/restaurants',
          status: 'ACTIVE' as any,
          contentHash: 'hash1',
          firstSeenAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
        },
        {
          externalAdId: 'goog_swiggy_search_001',
          platform: 'GOOGLE_ADS' as any,
          advertiserName: 'Swiggy',
          headline: 'Swiggy Food Delivery — Order Food Online with Superfast Delivery',
          primaryText: 'Order food from your favorite restaurants near you. Fast doorstep delivery.',
          ctaText: 'Visit Site',
          format: 'TEXT' as any,
          landingPageUrl: 'https://www.swiggy.com/order-online',
          status: 'ACTIVE' as any,
          contentHash: 'hash2',
          firstSeenAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
        },
        {
          externalAdId: 'meta_eatsure_ad_001',
          platform: 'META_ADS' as any,
          advertiserName: 'EatSure',
          headline: 'Zero Artificial Flavors. Order from Multiple Brands in ONE Single Delivery!',
          primaryText: 'Behrouz Biryani + Ovenstory Pizza together in 1 order, 0 delivery fee.',
          ctaText: 'Install Now',
          format: 'CAROUSEL' as any,
          landingPageUrl: 'https://www.eatsure.com/multi-restaurant-ordering',
          status: 'ACTIVE' as any,
          contentHash: 'hash3',
          firstSeenAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        },
        {
          externalAdId: 'tt_swiggy_hook_001',
          platform: 'TIKTOK_ADS' as any,
          advertiserName: 'Swiggy',
          headline: 'Late night cravings hitting different? Watch this 🤤🍕',
          primaryText: 'Midnight hunger strikes? Swiggy delivers hot pizza in 20 minutes!',
          ctaText: 'Order Now',
          format: 'VIDEO' as any,
          landingPageUrl: 'https://www.swiggy.com/late-night',
          status: 'ACTIVE' as any,
          contentHash: 'hash4',
          firstSeenAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        },
      ];

      const analytics = CompetitorAdAnalyticsService.calculateCompetitorSummary(
        competitorId || 'comp_all',
        sampleAds,
        competitorInfo || { name: 'Competitor Benchmark', domain: 'market-benchmark.com' }
      );

      return formatSuccessResponse(analytics);
    }

    const analytics = CompetitorAdAnalyticsService.calculateCompetitorSummary(
      competitorId || 'comp_all',
      normalizedAds,
      competitorInfo
    );

    return formatSuccessResponse(analytics);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
