import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../_helper';
import { listAdGroups, createAdGroup } from '@/domain/chatgpt-ads';

function serializeAdGroup(ag: any) {
  return {
    ...ag,
    bidAmountPaise: ag.bidAmountPaise?.toString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const searchParams = request.nextUrl.searchParams;

    const campaignId = searchParams.get('campaignId') || undefined;
    const status = searchParams.get('status') || undefined;

    const adGroups = await listAdGroups({
      organizationId,
      campaignId,
      status,
    });

    return formatSuccessResponse(adGroups.map(serializeAdGroup));
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch ad groups');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const body = await request.json();

    const { campaignId, accountId, name, bidAmountPaise, contextHints, audienceConfig, bidStrategy } = body;
    if (!campaignId || !accountId || !name) {
      return formatErrorResponse(
        new Error('Missing required fields: campaignId, accountId, and name are mandatory.'),
        'Validation error',
        'VALIDATION_ERROR',
        400
      );
    }

    const adGroup = await createAdGroup({
      organizationId,
      campaignId,
      accountId,
      name,
      bidAmountPaise,
      contextHints,
      audienceConfig,
      bidStrategy,
      actorUserId: user?.id,
    });

    return formatSuccessResponse(serializeAdGroup(adGroup), 201);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to create ad group');
  }
}

