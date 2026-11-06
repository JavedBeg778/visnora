// POST /api/v1/invitations/[token]/revoke
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { revokeInvitation } from '@/domain/administration/invitation-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const orgId = request.headers.get('x-organization-id') || searchParams.get('orgId');

    if (!orgId) {
      return formatErrorResponse(new Error('Organization ID is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const revoked = await revokeInvitation(token, orgId, user.id);
    return formatSuccessResponse(revoked);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

