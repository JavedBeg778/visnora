import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../_helper';
import { getPerformanceOverview } from '@/domain/chatgpt-ads';

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const searchParams = request.nextUrl.searchParams;

    const accountId = searchParams.get('accountId') || undefined;
    const campaignId = searchParams.get('campaignId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const overview = await getPerformanceOverview({
      organizationId,
      accountId,
      campaignId,
      startDate,
      endDate,
    });

    return formatSuccessResponse(overview);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch performance overview');
  }
}

