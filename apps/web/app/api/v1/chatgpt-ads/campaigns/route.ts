import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../_helper';
import { listCampaigns, createCampaign } from '@/domain/chatgpt-ads';

function serializeCampaign(c: any) {
  return {
    ...c,
    budgetAmountPaise: c.budgetAmountPaise?.toString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const searchParams = request.nextUrl.searchParams;

    const accountId = searchParams.get('accountId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const campaigns = await listCampaigns({
      organizationId,
      accountId,
      status,
      search,
    });

    return formatSuccessResponse(campaigns.map(serializeCampaign));
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch campaigns');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const body = await request.json();

    const {
      accountId,
      name,
      objective,
      budgetAmountPaise,
      budgetType,
      currency,
      startTime,
      endTime,
      contextTargeting,
      negativeContexts,
      financialConfirmation,
    } = body;

    if (!accountId || !name || !objective || !budgetAmountPaise) {
      return formatErrorResponse(
        new Error('Missing required fields: accountId, name, objective, and budgetAmountPaise are mandatory.'),
        'Validation error',
        'VALIDATION_ERROR',
        400
      );
    }

    const campaign = await createCampaign({
      organizationId,
      accountId,
      name,
      objective,
      budgetAmountPaise,
      budgetType,
      currency,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      contextTargeting,
      negativeContexts,
      actorUserId: user?.id,
      financialConfirmation,
    });

    return formatSuccessResponse(serializeCampaign(campaign), 201);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to create campaign');
  }
}

