// Visnora — POST /api/v1/ads/discover
// Ad discovery API across permitted source adapters

import { NextRequest } from 'next/server';
import { adSourceRegistry } from '@/domain/ad-intelligence/sources/adapter-registry';
import { AdSourceType } from '@/domain/ad-intelligence/types';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId;
    const projectId = body.projectId || 'default-project';

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const query = body.query || body.search || '';
    const sourceType: AdSourceType = body.sourceType || 'META_AD_LIBRARY';
    const limit = Math.min(body.limit || 10, 25);
    const country = body.country || 'IN';

    const adapter = adSourceRegistry.getAdapter(sourceType);
    const result = await adapter.discoverAds({
      organizationId: orgId,
      projectId,
      competitorId: body.competitorId,
      brandId: body.brandId,
      query,
      country,
      limit,
    });

    return formatSuccessResponse(result);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

