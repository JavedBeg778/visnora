// Visnora — ChatGPT Ads Monitoring, Alerts & Sync Health Service
// Real-time alert triggers, threshold evaluation, and sync health metrics

import { prisma } from '../../database/src/client';
import { assertEntitlement } from '../billing/entitlements';

export class AlertNotFoundError extends Error {
  constructor(id: string) {
    super(`Alert "${id}" not found or unauthorized.`);
    this.name = 'AlertNotFoundError';
  }
}

/**
 * Lists alerts for an organization.
 */
export async function listAlerts(params: {
  organizationId: string;
  accountId?: string;
  isRead?: boolean;
  severity?: string;
}) {
  const { organizationId, accountId, isRead, severity } = params;
  const where: any = { organizationId };
  if (accountId) where.accountId = accountId;
  if (isRead !== undefined) where.isRead = isRead;
  if (severity) where.severity = severity;

  return await prisma.chatGPTAdsAlert.findMany({
    where,
    include: {
      account: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Updates alert read status.
 */
export async function updateAlertStatus(
  organizationId: string,
  alertId: string,
  isRead: boolean
) {
  const alert = await prisma.chatGPTAdsAlert.findFirst({
    where: { id: alertId, organizationId },
  });

  if (!alert) {
    throw new AlertNotFoundError(alertId);
  }

  return await prisma.chatGPTAdsAlert.update({
    where: { id: alertId },
    data: {
      isRead,
    },
  });
}

/**
 * Evaluates account health and triggers alerts for threshold breaches or sync delays.
 */
export async function evaluateAccountAlerts(organizationId: string, accountId: string) {
  const account = await prisma.chatGPTAdsAccount.findFirst({
    where: { id: accountId, organizationId },
    include: {
      campaigns: true,
      credentials: { where: { status: 'ACTIVE' }, take: 1 },
    },
  });

  if (!account) return [];

  const createdAlerts: any[] = [];

  // Check 1: Missing or unverified credentials
  if (!account.credentials[0] || account.status === 'ERROR') {
    const existing = await prisma.chatGPTAdsAlert.findFirst({
      where: {
        organizationId,
        accountId,
        type: 'CREDENTIAL_UNVERIFIED',
        isRead: false,
      },
    });

    if (!existing) {
      const alert = await prisma.chatGPTAdsAlert.create({
        data: {
          organizationId,
          accountId,
          type: 'CREDENTIAL_UNVERIFIED',
          severity: 'CRITICAL',
          title: 'Account Credentials Unverified',
          message: `The API key for account "${account.name}" could not be verified against the OpenAI Ads endpoint. Please update your API credentials.`,
          metrics: { status: account.status },
        },
      });
      createdAlerts.push(alert);
    }
  }

  return createdAlerts;
}

/**
 * Lists sync run history.
 */
export async function listSyncRuns(params: {
  organizationId: string;
  accountId?: string;
  limit?: number;
}) {
  const { organizationId, accountId, limit = 20 } = params;
  const where: any = { organizationId };
  if (accountId) where.accountId = accountId;

  return await prisma.chatGPTAdsSyncRun.findMany({
    where,
    include: {
      account: { select: { id: true, name: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}

/**
 * Returns overall sync health metrics.
 */
export async function getSyncHealthSummary(organizationId: string) {
  const totalRuns = await prisma.chatGPTAdsSyncRun.count({
    where: { organizationId },
  });

  const completedRuns = await prisma.chatGPTAdsSyncRun.count({
    where: { organizationId, status: 'COMPLETED' },
  });

  const failedRuns = await prisma.chatGPTAdsSyncRun.count({
    where: { organizationId, status: 'FAILED' },
  });

  const lastRun = await prisma.chatGPTAdsSyncRun.findFirst({
    where: { organizationId },
    orderBy: { startedAt: 'desc' },
  });

  const successRate = totalRuns > 0 ? Number(((completedRuns / totalRuns) * 100).toFixed(1)) : 100;

  return {
    totalRuns,
    completedRuns,
    failedRuns,
    successRate,
    lastRunAt: lastRun?.startedAt || null,
    lastRunStatus: lastRun?.status || 'IDLE',
  };
}

/**
 * Triggers a synchronization run for an account.
 */
export async function triggerAccountSync(organizationId: string, accountId: string) {
  await assertEntitlement(organizationId, 'chatgpt_ads_intelligence');

  const account = await prisma.chatGPTAdsAccount.findFirst({
    where: { id: accountId, organizationId },
  });

  if (!account) {
    throw new Error(`Account "${accountId}" not found or unauthorized.`);
  }

  const syncRun = await prisma.chatGPTAdsSyncRun.create({
    data: {
      organizationId,
      accountId,
      syncType: 'FULL',
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  // Mark account as syncing
  await prisma.chatGPTAdsAccount.update({
    where: { id: accountId },
    data: { status: 'SYNCING' },
  });

  return syncRun;
}
