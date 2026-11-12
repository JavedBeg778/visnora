import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../_helper';
import { generateCreativeSuggestions } from '@/domain/chatgpt-ads';

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const body = await request.json();

    const { brandName, productDescription, targetAudience, objective } = body;
    if (!brandName || !productDescription) {
      return formatErrorResponse(
        new Error('Missing required fields: brandName and productDescription are mandatory.'),
        'Validation error',
        'VALIDATION_ERROR',
        400
      );
    }

    const suggestions = await generateCreativeSuggestions({
      organizationId,
      brandName,
      productDescription,
      targetAudience,
      objective,
      actorUserId: user?.id,
    });

    return formatSuccessResponse(suggestions);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to generate creative suggestions');
  }
}

