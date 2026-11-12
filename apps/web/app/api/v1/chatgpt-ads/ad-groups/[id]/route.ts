import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../_helper';
import { getAdGroup, updateAdGroup } from '@/domain/chatgpt-ads';

function serializeAdGroup(ag: any) {
  return {
    ...ag,
    bidAmountPaise: ag.bidAmountPaise?.toString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const { id } = await params;
    const adGroup = await getAdGroup(organizationId, id);
    return formatSuccessResponse(serializeAdGroup(adGroup));
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch ad group');
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

    const updated = await updateAdGroup(organizationId, id, body, user?.id);
    return formatSuccessResponse(serializeAdGroup(updated));
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to update ad group');
  }
}

