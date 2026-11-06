// GET /api/v1/invitations/[token]
// Fetches invitation details by token (public/authenticated)
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
} from '@/lib/api-handler';
import { getInvitationByToken } from '@/domain/administration/invitation-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invitation = await getInvitationByToken(token);
    return formatSuccessResponse(invitation);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
