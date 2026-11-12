import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../_helper';
import { getCampaignBreakdown } from '@/domain/chatgpt-ads';

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const searchParams = request.nextUrl.searchParams;

    const accountId = searchParams.get('accountId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const breakdown = await getCampaignBreakdown({
      organizationId,
      accountId,
      startDate,
      endDate,
    });

    return formatSuccessResponse(breakdown);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch campaign breakdown');
  }
}

