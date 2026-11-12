import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../../_helper';
import { approveRecommendation } from '@/domain/chatgpt-ads';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const { id } = await params;

    const approved = await approveRecommendation(organizationId, id, user?.id);
    return formatSuccessResponse(approved);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to approve recommendation');
  }
}

