// POST /api/v1/billing/dev/simulate-payment
import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { getPaymentProvider } from '@/domain/billing/payment-provider';
import { ForbiddenError } from '@/shared/permissions/rbac';

export async function POST(request: NextRequest) {
  try {
    // Production Safety Guard: Strictly block mock simulation in live production
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MOCK_BILLING !== 'true') {
      throw new ForbiddenError('Mock payment simulation is strictly prohibited in production.');
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const sessionId = body.sessionId;
    const orgId = request.headers.get('x-organization-id') || body.organizationId;
    const simulateFailure = Boolean(body.simulateFailure);
    const failureReason = body.failureReason;

    if (!sessionId) {
      return formatErrorResponse(new Error('sessionId is required'), 'Bad request', 'VALIDATION_ERROR', 400);
    }

    const provider = getPaymentProvider();
    const result = await provider.verifyPayment({
      organizationId: orgId || '',
      sessionId,
      simulateFailure,
      failureReason,
    });

    return formatSuccessResponse(result);
  } catch (err) {
    return formatErrorResponse(err);
  }
}
