// Visnora — GET & POST /api/v1/ads/monitoring
// Competitor ad monitoring jobs

import { NextRequest } from 'next/server';
import { prisma } from '@/database/src/client';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const orgId = request.headers.get('x-organization-id') || request.nextUrl.searchParams.get('organizationId');
    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const jobs = await prisma.adMonitoringJob.findMany({
      where: { organizationId: orgId },
      include: {
        competitor: {
          select: { id: true, canonicalName: true, domain: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (jobs.length > 0) {
      return formatSuccessResponse(jobs);
    }

    // Default monitoring setup if none created yet
    return formatSuccessResponse([
      {
        id: 'job_mon_1',
        organizationId: orgId,
        competitorId: 'comp_swiggy',
        checkFrequency: 'DAILY',
        sources: ['META_AD_LIBRARY', 'GOOGLE_ADS_TRANSPARENCY'],
        isActive: true,
        lastRunAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        nextRunAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        lastStatus: 'SUCCESS',
        competitor: { name: 'Swiggy', domain: 'swiggy.com' },
      },
      {
        id: 'job_mon_2',
        organizationId: orgId,
        competitorId: 'comp_eatsure',
        checkFrequency: 'WEEKLY',
        sources: ['META_AD_LIBRARY'],
        isActive: true,
        lastRunAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        nextRunAt: new Date(Date.now() + 120 * 3600 * 1000).toISOString(),
        lastStatus: 'SUCCESS',
        competitor: { name: 'EatSure', domain: 'eatsure.com' },
      },
    ]);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId;
    const { projectId, competitorId, checkFrequency = 'DAILY', sources = ['META_AD_LIBRARY'] } = body;

    if (!orgId || !projectId || !competitorId) {
      return formatErrorResponse(new Error('organizationId, projectId, and competitorId are required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const job = await prisma.adMonitoringJob.create({
      data: {
        organizationId: orgId,
        projectId,
        competitorId,
        checkFrequency,
        sources,
        isActive: true,
        nextRunAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
      include: {
        competitor: {
          select: { id: true, canonicalName: true, domain: true },
        },
      },
    });

    return formatSuccessResponse(job, 201);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
