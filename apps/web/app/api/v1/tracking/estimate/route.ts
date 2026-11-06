// GET & POST /api/v1/tracking/estimate
// Reference: docs/API_CONTRACT.md & docs/TECHNICAL_BLUEPRINT.md

import { NextRequest } from 'next/server';
import {
  formatSuccessResponse,
  formatErrorResponse,
  getAuthenticatedUser,
} from '@/lib/api-handler';
import { estimateTrackingRunCost } from '@/domain/ai-visibility/collection-engine';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const promptCount = parseInt(searchParams.get('promptCount') || '1', 10);
    const model = searchParams.get('model') || 'gemini-3.8-flash';
    const enableGrounding = searchParams.get('enableGrounding') === 'true';

    const estimate = estimateTrackingRunCost(promptCount, model, enableGrounding);
    return formatSuccessResponse(estimate);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return formatErrorResponse(new Error('Unauthorized'), 'Authentication required', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const promptCount = typeof body.promptCount === 'number' ? body.promptCount : 1;
    const model = body.model || 'gemini-3.8-flash';
    const enableGrounding = Boolean(body.enableGrounding);

    const estimate = estimateTrackingRunCost(promptCount, model, enableGrounding);
    return formatSuccessResponse(estimate);
  } catch (err) {
    return formatErrorResponse(err);
  }
}

