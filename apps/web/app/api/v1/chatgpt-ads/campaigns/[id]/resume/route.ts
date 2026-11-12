import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../../_helper';
import { resumeCampaign } from '@/domain/chatgpt-ads';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (!body.financialConfirmation) {
      return formatErrorResponse(
        new Error('Activating a campaign requires explicit financial confirmation (financialConfirmation: true).'),
        'Financial confirmation required',
        'FINANCIAL_CONFIRMATION_REQUIRED',
        400
      );
    }

    const resumed = await resumeCampaign(organizationId, id, true, user?.id);
    return formatSuccessResponse({
      id: resumed.id,
      status: resumed.status,
      message: 'Campaign activated successfully.',
    });
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to resume campaign');
  }
}

