// GET & POST /api/v1/prompts
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md

import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
  assertOrganizationAccess,
  assertProjectAccess,
} from '@/lib/api-handler';
import {
  getPrompts,
  createPrompt,
} from '@/domain/ai-visibility/prompt-service';
import { CreateTrackedPromptSchema } from '@/shared/validation/index';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const orgId = request.headers.get('x-organization-id') || searchParams.get('orgId');
    const projectId = searchParams.get('projectId');
    const category = searchParams.get('category') || undefined;
    const groupId = searchParams.get('groupId') || undefined;
    const stage = searchParams.get('stage') || undefined;
    const search = searchParams.get('search') || undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam !== null ? isActiveParam === 'true' : undefined;

    if (!orgId) {
      return formatErrorResponse(
        new Error('X-Organization-Id header or orgId query parameter is required'),
        'Bad request',
        'VALIDATION_ERROR',
        400
      );
    }

    if (!projectId) {
      return formatErrorResponse(
        new Error('projectId query parameter is required'),
        'Bad request',
        'VALIDATION_ERROR',
        400
      );
    }

    await assertProjectAccess(orgId, projectId, user.id);
    const prompts = await getPrompts(orgId, projectId, {
      category,
      groupId,
      stage,
      isActive,
      search,
    });

    return formatSuccessResponse(prompts);
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

    const validated = CreateTrackedPromptSchema.parse(body);
    await assertProjectAccess(orgId, projectId, user.id);
    const prompt = await createPrompt(orgId, projectId, validated);

    return formatSuccessResponse(prompt, 201);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

