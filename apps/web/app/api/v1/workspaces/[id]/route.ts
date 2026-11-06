// GET & PATCH /api/v1/workspaces/[id]
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import {
  getWorkspaceById,
  updateWorkspace,
} from '@/domain/workspaces/service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const orgId = request.headers.get('x-organization-id') || searchParams.get('orgId');

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const workspace = await getWorkspaceById(id, orgId, user.id);
    return formatSuccessResponse(workspace);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId;

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const updated = await updateWorkspace(id, orgId, user.id, body);
    return formatSuccessResponse(updated);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
