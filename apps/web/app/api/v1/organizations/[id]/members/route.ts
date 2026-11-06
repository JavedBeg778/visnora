// GET & POST /api/v1/organizations/[id]/members
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { getOrganizationMembers } from '@/domain/organizations/service';
import { createInvitation } from '@/domain/administration/invitation-service';

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

    const members = await getOrganizationMembers(id, user.id);
    return formatSuccessResponse(members);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function POST(
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

    if (!body.email || typeof body.email !== 'string') {
      return formatErrorResponse(new Error('Email is required'), 'Validation failed', 'VALIDATION_ERROR', 400);
    }

    const invitation = await createInvitation(id, user.id, {
      email: body.email.trim(),
      role: body.role || 'MEMBER',
    });

    return formatSuccessResponse(invitation, 201);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
