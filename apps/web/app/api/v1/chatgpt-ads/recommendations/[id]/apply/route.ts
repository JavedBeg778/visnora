import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../../../_helper';
import { applyRecommendation } from '@/domain/chatgpt-ads';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, organizationId } = await resolveOrgAndUser(request);
    const { id } = await params;

    const applied = await applyRecommendation(organizationId, id, user?.id);
    return formatSuccessResponse(applied);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to apply recommendation');
  }
}

