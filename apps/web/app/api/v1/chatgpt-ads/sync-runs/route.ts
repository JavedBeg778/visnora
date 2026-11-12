import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../_helper';
import { listSyncRuns } from '@/domain/chatgpt-ads';

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const searchParams = request.nextUrl.searchParams;

    const accountId = searchParams.get('accountId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const runs = await listSyncRuns({ organizationId, accountId, limit });
    return formatSuccessResponse(runs);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch sync runs');
  }
}

