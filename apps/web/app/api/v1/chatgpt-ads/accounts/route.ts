import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../_helper';
import { listAccounts } from '@/domain/chatgpt-ads';

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const accounts = await listAccounts(organizationId);
    return formatSuccessResponse(accounts);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch ChatGPT Ads accounts');
  }
}

