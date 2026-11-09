// GET /api/v1/analytics/trends
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md

import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
  assertProjectAccess,
  parseDateRangeDays,
} from '@/lib/api-handler';
import { getHistoricalTrends } from '@/domain/ai-visibility/analytics-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const orgId = request.headers.get('x-organization-id') || searchParams.get('orgId');
    const projectId = searchParams.get('projectId');
    const brandId = searchParams.get('brandId') || undefined;
    const days = parseDateRangeDays(searchParams.get('days'));

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    if (!projectId) {
      return formatErrorResponse(new Error('projectId is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    await assertProjectAccess(orgId, projectId, user.id , brandId);

    const trends = await getHistoricalTrends(orgId, projectId, days, brandId);
    return formatSuccessResponse(trends);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

