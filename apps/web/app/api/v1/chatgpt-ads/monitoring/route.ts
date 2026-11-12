import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../_helper';
import { getSyncHealthSummary, listAlerts } from '@/domain/chatgpt-ads';

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const health = await getSyncHealthSummary(organizationId);
    const activeAlerts = await listAlerts({
      organizationId,
      isRead: false,
    });

    return formatSuccessResponse({
      health,
      activeAlerts,
      alertCount: activeAlerts.length,
    });
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch monitoring metrics');
  }
}

