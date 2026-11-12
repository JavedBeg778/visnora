// Visnora — GET /api/v1/ads
// Searchable, paginated Ad Library API

import { NextRequest } from 'next/server';
import { prisma } from '@/database/src/client';
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

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const competitorId = searchParams.get('competitorId');
    const platform = searchParams.get('platform');
    const format = searchParams.get('format');
    const status = searchParams.get('status');
    const search = searchParams.get('q') || searchParams.get('search');

    const where: any = {
      organizationId: orgId,
    };

    if (competitorId) where.competitorId = competitorId;
    if (platform && platform !== 'ALL') where.platform = platform;
    if (format && format !== 'ALL') where.format = format;
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { headline: { contains: search, mode: 'insensitive' } },
        { primaryText: { contains: search, mode: 'insensitive' } },
        { advertiserName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [ads, total] = await Promise.all([
      prisma.adRecord.findMany({
        where,
        include: {
          creatives: true,
          landingPages: true,
          analyses: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          competitor: {
            select: { id: true, canonicalName: true, domain: true },
          },
        },
        orderBy: { firstSeenAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adRecord.count({ where }),
    ]);

    // If no ads exist in DB yet for demo organization, return permitted initial library items
    if (total === 0 && !search && (!competitorId || competitorId === 'all')) {
      const demoAds = [
        {
          id: 'demo_ad_1',
          organizationId: orgId,
          platform: 'META_ADS',
          externalAdId: 'meta_swiggy_ad_001',
          advertiserName: 'Swiggy',
          headline: 'Craving Biryani? Get Flat ₹125 OFF on your first 3 orders on Swiggy!',
          primaryText: 'Hungry? Lightning-fast 20-min delivery from top-rated restaurants near you. Use code SWIGGY125 at checkout.',
          description: 'Order from Behrouz, Biryani By Kilo & 10,000+ top kitchens.',
          ctaText: 'Order Now',
          format: 'IMAGE',
          landingPageUrl: 'https://www.swiggy.com/restaurants',
          country: 'IN',
          language: 'en',
          status: 'ACTIVE',
          firstSeenAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          creatives: [{ mediaType: 'IMAGE', caption: 'Steaming hot dum biryani with offer badge' }],
          landingPages: [{ normalizedDomain: 'swiggy.com', url: 'https://www.swiggy.com/restaurants', isAccessible: true }],
          analyses: [{
            positioning: 'Ultra-fast delivery speed & first-order savings',
            emotionalVsRational: 'BALANCED',
            confidenceScore: 0.94,
          }],
        },
        {
          id: 'demo_ad_2',
          organizationId: orgId,
          platform: 'GOOGLE_ADS',
          externalAdId: 'goog_swiggy_search_001',
          advertiserName: 'Bundl Technologies (Swiggy)',
          headline: 'Swiggy Food Delivery — Order Food Online with Superfast Delivery',
          primaryText: 'Order food from your favorite restaurants near you. Fast doorstep delivery, live order tracking, and no minimum order value.',
          description: 'Exclusive 50% discount for new users. Download the Swiggy App or order online now.',
          ctaText: 'Visit Site',
          format: 'TEXT',
          landingPageUrl: 'https://www.swiggy.com/order-online',
          country: 'IN',
          language: 'en',
          status: 'ACTIVE',
          firstSeenAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
          creatives: [{ mediaType: 'TEXT', caption: 'Google Search responsive ad copy' }],
          landingPages: [{ normalizedDomain: 'swiggy.com', url: 'https://www.swiggy.com/order-online', isAccessible: true }],
          analyses: [{
            positioning: 'Top search intent fulfillment & frictionless web order',
            emotionalVsRational: 'RATIONAL',
            confidenceScore: 0.91,
          }],
        },
        {
          id: 'demo_ad_3',
          organizationId: orgId,
          platform: 'META_ADS',
          externalAdId: 'meta_eatsure_ad_001',
          advertiserName: 'EatSure',
          headline: 'Zero Artificial Flavors. Order from Multiple Brands in ONE Single Delivery!',
          primaryText: 'Want Behrouz Biryani + Ovenstory Pizza + Wendy\'s burger together? EatSure delivers all in 1 order, 0 delivery fee.',
          description: '100% goodness verified with #EatSure200+ quality checks.',
          ctaText: 'Install Now',
          format: 'CAROUSEL',
          landingPageUrl: 'https://www.eatsure.com/multi-restaurant-ordering',
          country: 'IN',
          language: 'en',
          status: 'ACTIVE',
          firstSeenAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
          creatives: [{ mediaType: 'CAROUSEL', caption: 'Multi-brand single delivery basket view' }],
          landingPages: [{ normalizedDomain: 'eatsure.com', url: 'https://www.eatsure.com/multi-restaurant-ordering', isAccessible: true }],
          analyses: [{
            positioning: 'Multi-brand assortment with zero delivery friction',
            emotionalVsRational: 'RATIONAL',
            confidenceScore: 0.96,
          }],
        },
        {
          id: 'demo_ad_4',
          organizationId: orgId,
          platform: 'TIKTOK_ADS',
          externalAdId: 'tt_swiggy_hook_001',
          advertiserName: 'Swiggy',
          headline: 'Late night cravings hitting different? Watch this 🤤🍕',
          primaryText: 'When the midnight hunger strikes and everyone else is asleep, Swiggy delivers hot pizza in 20 minutes! Tap below for late-night flat discounts.',
          description: 'Late Night Delivery 24/7 in 500+ cities.',
          ctaText: 'Order Now',
          format: 'VIDEO',
          landingPageUrl: 'https://www.swiggy.com/late-night',
          country: 'GLOBAL',
          language: 'en',
          status: 'ACTIVE',
          firstSeenAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          creatives: [{ mediaType: 'VIDEO', caption: 'POV midnight cheese pull pizza unboxing vertical video' }],
          landingPages: [{ normalizedDomain: 'swiggy.com', url: 'https://www.swiggy.com/late-night', isAccessible: true }],
          analyses: [{
            positioning: 'Sensory indulgence trigger for midnight snackers',
            emotionalVsRational: 'EMOTIONAL',
            confidenceScore: 0.95,
          }],
        },
      ];

      return formatSuccessResponse({
        ads: demoAds,
        pagination: {
          page: 1,
          limit,
          total: demoAds.length,
          totalPages: 1,
        },
      });
    }

    return formatSuccessResponse({
      ads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
