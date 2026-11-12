import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../_helper';
import { getCampaign, updateCampaign } from '@/domain/chatgpt-ads';

function serializeCampaign(c: any) {
  return {
    ...c,
    budgetAmountPaise: c.budgetAmountPaise?.toString(),
    adGroups: c.adGroups?.map((ag: any) => ({
      ...ag,
      bidAmountPaise: ag.bidAmountPaise?.toString(),
    })),
    insights: c.insights?.map((ins: any) => ({
      ...ins,
      spendPaise: ins.spendPaise?.toString(),
      cpcPaise: ins.cpcPaise?.toString(),
      cpaPaise: ins.cpaPaise?.toString(),
    })),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const { id } = await params;
    const campaign = await getCampaign(organizationId, id);
    return formatSuccessResponse(serializeCampaign(campaign));
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch campaign details');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const { id } = await params;
    const body = await request.json();

    const updated = await updateCampaign(organizationId, id, {
      ...body,
      actorUserId: user?.id,
    });

    return formatSuccessResponse(serializeCampaign(updated));
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to update campaign');
  }
}

