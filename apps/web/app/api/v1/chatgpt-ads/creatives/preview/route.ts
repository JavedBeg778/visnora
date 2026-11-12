import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { generateChatGPTConversationalPreview } from '@/domain/chatgpt-ads';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { headline, adCopy, callToAction, advertiserName, destinationUrl, landingPageUrl } = body;

    if (!headline || !adCopy || !advertiserName || !destinationUrl) {
      return formatErrorResponse(
        new Error('Missing required fields: headline, adCopy, advertiserName, and destinationUrl are mandatory.'),
        'Validation error',
        'VALIDATION_ERROR',
        400
      );
    }

    const preview = generateChatGPTConversationalPreview({
      headline,
      adCopy,
      callToAction,
      advertiserName,
      destinationUrl,
      landingPageUrl,
    });

    return formatSuccessResponse(preview);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to generate preview');
  }
}

