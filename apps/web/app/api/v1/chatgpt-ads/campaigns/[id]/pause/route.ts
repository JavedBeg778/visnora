import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../../_helper';
import { pauseCampaign } from '@/domain/chatgpt-ads';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const { id } = await params;

    const paused = await pauseCampaign(organizationId, id, user?.id);
    return formatSuccessResponse({
      id: paused.id,
      status: paused.status,
      message: 'Campaign paused successfully.',
    });
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to pause campaign');
  }
}

