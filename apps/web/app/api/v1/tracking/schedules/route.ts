// GET & POST /api/v1/tracking/schedules
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md

import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
  assertProjectAccess,
} from '@/lib/api-handler';
import {
  getTrackingSchedule,
  saveTrackingSchedule,
} from '@/domain/ai-visibility/schedule-service';
import { SaveTrackingScheduleSchema } from '@/shared/validation/index';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const orgId = request.headers.get('x-organization-id') || searchParams.get('orgId');
    const projectId = searchParams.get('projectId');

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    if (!projectId) {
      return formatErrorResponse(new Error('projectId is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    await assertProjectAccess(orgId, projectId, user.id);
    const schedule = await getTrackingSchedule(orgId, projectId);
    return formatSuccessResponse(schedule);
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
    const projectId = body.projectId;

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    if (!projectId) {
      return formatErrorResponse(new Error('projectId is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const validated = SaveTrackingScheduleSchema.parse(body);
    await assertProjectAccess(orgId, projectId, user.id, undefined, 'ANALYST');
    const schedule = await saveTrackingSchedule(orgId, projectId, validated);

    return formatSuccessResponse(schedule);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

