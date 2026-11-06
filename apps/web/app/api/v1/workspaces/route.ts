// GET & POST /api/v1/workspaces
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import {
  getWorkspaces,
  createWorkspace,
} from '@/domain/workspaces/service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const orgId = request.headers.get('x-organization-id') || searchParams.get('orgId');

    if (!orgId) {
      return formatErrorResponse(new Error('X-Organization-Id header or orgId query parameter is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const workspaces = await getWorkspaces(orgId, user.id);
    return formatSuccessResponse(workspaces);
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

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
      return formatErrorResponse(new Error('Workspace name must be at least 2 characters'), 'Validation failed', 'VALIDATION_ERROR', 400);
    }

    const workspace = await createWorkspace(orgId, user.id, {
      name: body.name.trim(),
      description: body.description?.trim(),
    });

    return formatSuccessResponse(workspace, 201);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
