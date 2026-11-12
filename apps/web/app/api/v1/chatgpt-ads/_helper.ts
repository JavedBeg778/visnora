import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-handler';

export async function resolveOrgAndUser(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  const searchParams = request.nextUrl.searchParams;
  const organizationId =
    request.headers.get('x-organization-id') ||
    searchParams.get('organizationId') ||
    '293e8995-0113-480e-a062-26008ee8af21'; // Default Visnora Demo org

  return { user, organizationId };
}

