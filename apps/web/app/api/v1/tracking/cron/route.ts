// GET & POST /api/v1/tracking/cron
// Automated scheduled tracking processor triggered by Vercel Cron
// Reference: docs/CRON_CONFIGURATION.md & Finding 17 Remediation

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { claimAndTriggerDueSchedules } from '@/domain/ai-visibility/schedule-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max 60s for cron claiming & enqueueing

/**
 * Timing-safe string comparison to protect against side-channel timing attacks.
 */
function timingSafeTokenCompare(provided: string, expected: string): boolean {
  const bufA = Buffer.from(provided, 'utf8');
  const bufB = Buffer.from(expected, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates the caller using CRON_SECRET.
 * Vercel Cron automatically attaches `Authorization: Bearer <CRON_SECRET>`.
 * Also supports the `x-cron-secret` header for manual or external invocations.
 */
function validateCronSecret(request: NextRequest): { authorized: boolean; error?: string; status?: number } {
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Mandatory in production: if CRON_SECRET is missing, fail closed immediately
  if (isProduction && !cronSecret) {
    return {
      authorized: false,
      error: 'CRON_SECRET is mandatory in production but is not configured on the server',
      status: 401,
    };
  }

  // 2. Extract credential from Authorization Bearer or x-cron-secret header
  const authHeader = request.headers.get('authorization');
  const xCronHeader = request.headers.get('x-cron-secret');
  let providedToken: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedToken = authHeader.slice(7).trim();
  } else if (xCronHeader) {
    providedToken = xCronHeader.trim();
  }

  // 3. Reject unauthenticated requests
  if (!providedToken) {
    // In local non-production test suites without a secret set, allow only if NODE_ENV === 'test'
    if (!cronSecret && process.env.NODE_ENV === 'test') {
      return { authorized: true };
    }

    return {
      authorized: false,
      error: 'Unauthorized: Missing required cron authentication header (Authorization: Bearer <CRON_SECRET>)',
      status: 401,
    };
  }

  // 4. Verify token match using timing-safe comparison
  if (!cronSecret || !timingSafeTokenCompare(providedToken, cronSecret)) {
    return {
      authorized: false,
      error: 'Forbidden: Invalid or unrecognized cron authentication secret',
      status: 403,
    };
  }

  return { authorized: true };
}

export async function GET(request: NextRequest) {
  return await handleCronExecution(request);
}

export async function POST(request: NextRequest) {
  return await handleCronExecution(request);
}

async function handleCronExecution(request: NextRequest) {
  const authCheck = validateCronSecret(request);
  if (!authCheck.authorized) {
    return formatErrorResponse(
      new Error(authCheck.error || 'Unauthorized cron call'),
      authCheck.error || 'Unauthorized',
      authCheck.status === 500 ? 'CRON_NOT_CONFIGURED' : 'UNAUTHORIZED',
      authCheck.status || 401
    );
  }

  try {
    const startTime = Date.now();
    console.log('[TrackingCron] Initiating automated schedule processing...');

    const result = await claimAndTriggerDueSchedules();

    const durationMs = Date.now() - startTime;
    console.log(
      `[TrackingCron] Finished schedule processing in ${durationMs}ms: Processed=${result.processedCount}, Skipped=${result.skippedCount}, Errors=${result.errors.length}`
    );

    return formatSuccessResponse(
      {
        timestamp: new Date().toISOString(),
        durationMs,
        processedCount: result.processedCount,
        enqueuedJobs: result.enqueuedJobs,
        skippedCount: result.skippedCount,
        errors: result.errors,
        message: `Successfully processed ${result.processedCount} due tracking schedules`,
      },
      200
    );
  } catch (err: any) {
    console.error('[TrackingCron] Unexpected error during schedule processing:', err);
    return formatErrorResponse(err, 'Failed to process tracking schedules', 'CRON_EXECUTION_ERROR', 500);
  }
}

