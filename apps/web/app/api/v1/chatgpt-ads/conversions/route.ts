import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../_helper';
import { listConversions, ingestConversionEvent } from '@/domain/chatgpt-ads';

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const conversions = await listConversions({ organizationId, limit });
    return formatSuccessResponse(conversions);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch conversion events');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const body = await request.json();

    const {
      accountId,
      eventName,
      eventTimestamp,
      userEmail,
      userPhone,
      userExternalId,
      eventSource,
      currency,
      valuePaise,
      metadata,
      deduplicationId,
    } = body;

    if (!eventName) {
      return formatErrorResponse(
        new Error('eventName is required'),
        'Validation error',
        'VALIDATION_ERROR',
        400
      );
    }

    const result = await ingestConversionEvent({
      organizationId,
      accountId,
      eventName,
      eventTimestamp,
      userEmail,
      userPhone,
      userExternalId,
      eventSource,
      currency,
      valuePaise,
      metadata,
      deduplicationId,
    });

    return formatSuccessResponse(result, 201);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to ingest conversion event');
  }
}

