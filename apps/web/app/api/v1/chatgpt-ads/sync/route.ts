import { NextRequest } from 'next/server';
import { formatSuccessResponse, formatErrorResponse } from '@/lib/api-handler';
import { resolveOrgAndUser } from '../_helper';
import { triggerAccountSync } from '@/domain/chatgpt-ads';
import { enqueueAccountSyncJob } from '@/jobs/queues/chatgpt-ads-queue';

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await resolveOrgAndUser(request);
    const body = await request.json();

    const { accountId } = body;
    if (!accountId) {
      return formatErrorResponse(new Error('accountId is required'), 'Validation error', 'VALIDATION_ERROR', 400);
    }

    // Create sync run record
    const syncRun = await triggerAccountSync(organizationId, accountId);

    // Enqueue background worker job
    await enqueueAccountSyncJob({
      organizationId,
      accountId,
      syncRunId: syncRun.id,
      syncType: 'FULL',
    });

    return formatSuccessResponse({
      syncRunId: syncRun.id,
      status: syncRun.status,
      message: 'Synchronization started in background.',
    }, 202);
  } catch (err: any) {
    return formatErrorResponse(err, 'Failed to trigger account sync');
  }
}

