import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../_helper';
import { connectAccount } from '@/domain/chatgpt-ads';

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const body = await request.json();

    const { name, openaiAccountId, apiKey, currency, timezone } = body;
    if (!name || !openaiAccountId || !apiKey) {
      return formatErrorResponse(
        new Error('Missing required fields: name, openaiAccountId, and apiKey are mandatory.'),
        'Validation error',
        'VALIDATION_ERROR',
        400
      );
    }

    const account = await connectAccount(
      {
        organizationId,
        name,
        openaiAccountId,
        apiKey,
        currency,
        timezone,
      },
      user?.id
    );

    return formatSuccessResponse(account, 201);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to connect ChatGPT Ads account');
  }
}

