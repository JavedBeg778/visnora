import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../_helper';
import { listRecommendations, generateRecommendations } from '@/domain/chatgpt-ads';

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const searchParams = request.nextUrl.searchParams;

    const campaignId = searchParams.get('campaignId') || undefined;
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;

    const recommendations = await listRecommendations({
      organizationId,
      campaignId,
      status,
      category,
    });

    return formatSuccessResponse(recommendations);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to fetch recommendations');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const body = await request.json().catch(() => ({}));

    const result = await generateRecommendations({
      organizationId,
      accountId: body.accountId,
      campaignId: body.campaignId,
      actorUserId: user?.id,
    });

    return formatSuccessResponse(result, 201);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to generate recommendations');
  }
}

