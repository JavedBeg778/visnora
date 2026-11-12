import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../_helper';
import { updateAlertStatus } from '@/domain/chatgpt-ads';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const { id } = await params;
    const body = await request.json();

    const isRead = body.isRead !== undefined ? !!body.isRead : true;
    const updated = await updateAlertStatus(organizationId, id, isRead);
    return formatSuccessResponse(updated);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to update alert');
  }
}

