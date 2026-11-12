import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../_helper';
import { listAlerts } from '@/domain/chatgpt-ads';

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const searchParams = request.nextUrl.searchParams;

    const accountId = searchParams.get('accountId') || undefined;
    const isReadParam = searchParams.get('isRead');
    const isRead = isReadParam !== null ? isReadParam === 'true' : undefined;
    const severity = searchParams.get('severity') || undefined;

    const alerts = await listAlerts({
      organizationId,
      accountId,
      isRead,
      severity,
    });

    return formatSuccessResponse(alerts);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch alerts');
  }
}

