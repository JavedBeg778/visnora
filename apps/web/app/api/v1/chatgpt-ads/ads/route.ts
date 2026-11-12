import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../_helper';
import { listAds, createAd } from '@/domain/chatgpt-ads';

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const searchParams = request.nextUrl.searchParams;

    const adGroupId = searchParams.get('adGroupId') || undefined;
    const status = searchParams.get('status') || undefined;

    const ads = await listAds({
      organizationId,
      adGroupId,
      status,
    });

    return formatSuccessResponse(ads);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch ads');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const body = await request.json();

    const { adGroupId, accountId, name, headline, adCopy, advertiserName, destinationUrl, landingPageUrl, imageUrl } = body;
    if (!adGroupId || !accountId || !name || !headline || !adCopy || !advertiserName || !destinationUrl) {
      return formatErrorResponse(
        new Error('Missing required fields: adGroupId, accountId, name, headline, adCopy, advertiserName, and destinationUrl are mandatory.'),
        'Validation error',
        'VALIDATION_ERROR',
        400
      );
    }

    const ad = await createAd({
      organizationId,
      adGroupId,
      accountId,
      name,
      headline,
      adCopy,
      advertiserName,
      destinationUrl,
      landingPageUrl,
      imageUrl,
      actorUserId: user?.id,
    });

    return formatSuccessResponse(ad, 201);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to create ad');
  }
}

