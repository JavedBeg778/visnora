// GET & PATCH /api/v1/users/me
// Manage current user's profile and security attributes
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import {
  getUserProfile,
  syncUserProfile,
  updateUserProfile,
} from '@/domain/administration/user-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(
        new Error('Unauthorized'),
        'Authentication required',
        'UNAUTHORIZED',
        401
      );
    }

    let profile = await getUserProfile(user.id);
    if (!profile) {
      profile = await syncUserProfile({
        id: user.id,
        email: user.email || 'user@visnora.com',
        fullName: user.email ? user.email.split('@')[0] : 'Visnora User',
      });
    }

    return formatSuccessResponse(profile);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(
        new Error('Unauthorized'),
        'Authentication required',
        'UNAUTHORIZED',
        401
      );
    }

    const body = await request.json();
    const updated = await updateUserProfile(user.id, {
      fullName: body.fullName,
      avatarUrl: body.avatarUrl,
      company: body.company,
    });

    return formatSuccessResponse(updated);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
