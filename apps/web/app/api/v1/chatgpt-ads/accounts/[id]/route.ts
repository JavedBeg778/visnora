import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../_helper';
import { getAccount, disconnectAccount } from '@/domain/chatgpt-ads';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const { id } = await params;
    const account = await getAccount(organizationId, id);
    return formatSuccessResponse(account);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to retrieve account');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const { id } = await params;
    await disconnectAccount(organizationId, id, user?.id);
    return formatSuccessResponse({ disconnected: true, accountId: id });
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to disconnect account');
  }
}

