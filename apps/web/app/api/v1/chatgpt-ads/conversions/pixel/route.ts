import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../_helper';
import { generatePixelSnippet } from '@/domain/chatgpt-ads';

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId') || undefined;

    const snippet = generatePixelSnippet({
      organizationId,
      accountId,
    });

    return formatSuccessResponse({ snippet });
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to generate pixel snippet');
  }
}

