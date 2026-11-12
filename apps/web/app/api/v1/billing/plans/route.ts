// GET /api/v1/billing/plans
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { getAllPlans } from '@/domain/billing/plan-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const plans = await getAllPlans();
    return formatSuccessResponse(plans);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

