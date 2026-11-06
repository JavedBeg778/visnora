// PATCH & DELETE /api/v1/organizations/[id]/members/[memberId]
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import {
  updateMemberRole,
  removeMember,
} from '@/domain/organizations/service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    if (!body.role) {
      return formatErrorResponse(new Error('Role is required'), 'Validation failed', 'VALIDATION_ERROR', 400);
    }

    const updated = await updateMemberRole(id, memberId, user.id, body.role);
    return formatSuccessResponse(updated);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const result = await removeMember(id, memberId, user.id);
    return formatSuccessResponse({ deleted: true, id: result.id });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
