import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../../_helper';
import { rotateApiKey } from '@/domain/chatgpt-ads';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const { id } = await params;
    const body = await request.json();

    if (!body.newApiKey) {
      return formatErrorResponse(new Error('newApiKey is required'), 'Validation error', 'VALIDATION_ERROR', 400);
    }

    const result = await rotateApiKey(organizationId, id, body.newApiKey, user?.id);
    return formatSuccessResponse(result);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to rotate API key');
  }
}

