// Visnora — POST /api/v1/ads/collect
// Trigger ad collection and ingestion pipeline

import { NextRequest } from 'next/server';
import { adCollectionService } from '@/domain/ad-intelligence/collection/ad-collection-service';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { enqueueAdCollectionJob } from '@/jobs/queues/ad-queue';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId;
    const projectId = body.projectId;

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }
    if (!projectId) {
      return formatErrorResponse(new Error('projectId is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const collectionParams = {
      organizationId: orgId,
      projectId,
      competitorId: body.competitorId,
      brandId: body.brandId,
      sourceType: body.sourceType || 'META_AD_LIBRARY',
      query: body.query || body.search || '',
      limit: Math.min(body.limit || 10, 25),
      country: body.country || 'IN',
      autoAnalyze: body.autoAnalyze !== false,
    };

    // If caller explicitly requested async or queueing
    if (body.async) {
      const queueRes = await enqueueAdCollectionJob(collectionParams);
      if (queueRes.queued) {
        return formatSuccessResponse(
          {
            queued: true,
            jobId: queueRes.jobId,
            message: 'Ad collection job enqueued for background worker processing.',
          },
          202
        );
      }
    }

    // Execute via collection service
    const result = await adCollectionService.executeCollection(collectionParams);

    return formatSuccessResponse(
      {
        ...result,
        message: 'Ad collection and analysis pipeline completed successfully.',
      },
      201
    );
  } catch (err) {
    return formatErrorResponse(err);
  }
}

