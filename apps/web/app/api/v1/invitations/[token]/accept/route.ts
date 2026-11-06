// POST /api/v1/invitations/[token]/accept
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { acceptInvitation } from '@/domain/administration/invitation-service';

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

    const result = await acceptInvitation(token, user.id, user.email);
    return formatSuccessResponse(result);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
