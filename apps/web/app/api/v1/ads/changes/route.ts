// Visnora — GET /api/v1/ads/changes
// Competitor ad change event logs

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
    const competitorId = searchParams.get('competitorId');
    const changeType = searchParams.get('changeType');

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const where: any = { organizationId: orgId };
    if (competitorId && competitorId !== 'all') where.competitorId = competitorId;
    if (changeType && changeType !== 'ALL') where.changeType = changeType;

    const events = await prisma.adChangeEvent.findMany({
      where,
      include: {
        competitor: {
          select: { id: true, canonicalName: true, domain: true },
        },
        adRecord: {
          select: { id: true, headline: true, platform: true, format: true },
        },
      },
      orderBy: { detectedAt: 'desc' },
      take: 50,
    });

    if (events.length > 0) {
      return formatSuccessResponse(events);
    }

    // Default sample change events for baseline UI demonstration
    return formatSuccessResponse([
      {
        id: 'evt_sample_1',
        changeType: 'NEW_AD',
        fieldChanged: null,
        previousValue: null,
        newValue: 'Craving Biryani? Get Flat ₹125 OFF on your first 3 orders on Swiggy!',
        detectedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        competitor: { name: 'Swiggy', domain: 'swiggy.com' },
        adRecord: { id: 'ad_1', headline: 'Craving Biryani? Flat ₹125 OFF', platform: 'META_ADS', format: 'IMAGE' },
      },
      {
        id: 'evt_sample_2',
        changeType: 'HEADLINE_CHANGED',
        fieldChanged: 'headline',
        previousValue: 'Order Food Online with Fast Delivery',
        newValue: 'Swiggy Food Delivery — Order Online with Superfast 20-min Delivery',
        detectedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        competitor: { name: 'Swiggy', domain: 'swiggy.com' },
        adRecord: { id: 'ad_2', headline: 'Swiggy Food Delivery — Superfast', platform: 'GOOGLE_ADS', format: 'TEXT' },
      },
      {
        id: 'evt_sample_3',
        changeType: 'CTA_CHANGED',
        fieldChanged: 'ctaText',
        previousValue: 'Learn More',
        newValue: 'Install Now',
        detectedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        competitor: { name: 'EatSure', domain: 'eatsure.com' },
        adRecord: { id: 'ad_3', headline: 'Zero Artificial Flavors', platform: 'META_ADS', format: 'CAROUSEL' },
      },
    ]);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
