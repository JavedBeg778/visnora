// Visnora — M6 ChatGPT Ads Background Sync Worker (BullMQ + Redis)
// Processes account data sync, metric ingestion, and automated recommendation generation

import { Worker, Job } from 'bullmq';
import { prisma } from '../../database/src/client';
import { getRedisClient } from '../queues/tracking-queue';
import { CHATGPT_ADS_QUEUE_NAME, ChatGPTAdsJobData } from '../queues/chatgpt-ads-queue';
import { getClientForAccount } from '../../domain/chatgpt-ads/account-service';
import { generateRecommendations } from '../../domain/chatgpt-ads/optimization-service';
import { evaluateAccountAlerts } from '../../domain/chatgpt-ads/monitoring-service';

let adsWorker: Worker<ChatGPTAdsJobData> | null = null;

export function startChatGPTAdsWorker(concurrency = 2): Worker<ChatGPTAdsJobData> | null {
  if (adsWorker) return adsWorker;

  const client = getRedisClient();
  if (!client) {
    console.warn('[ChatGPTAdsWorker] Redis client not available. Worker startup deferred.');
    return null;
  }

  adsWorker = new Worker<ChatGPTAdsJobData>(
    CHATGPT_ADS_QUEUE_NAME,
    async (job: Job<ChatGPTAdsJobData>) => {
      console.log(`[ChatGPTAdsWorker] Starting job ${job.id} (${job.data.jobType})`);

      if (job.data.jobType === 'ACCOUNT_SYNC') {
        return await processAccountSync(job.data);
      } else if (job.data.jobType === 'GENERATE_RECOMMENDATIONS') {
        return await processRecommendations(job.data);
      }

      throw new Error(`Unknown job type: ${(job.data as any).jobType}`);
    },
    {
      connection: client,
      concurrency,
    }
  );

  adsWorker.on('completed', (job) => {
    console.log(`[ChatGPTAdsWorker] Job ${job.id} completed successfully.`);
  });

  adsWorker.on('failed', (job, err) => {
    console.error(`[ChatGPTAdsWorker] Job ${job?.id} failed:`, err.message);
  });

  return adsWorker;
}

export async function stopChatGPTAdsWorker(): Promise<void> {
  if (adsWorker) {
    await adsWorker.close();
    adsWorker = null;
  }
}

async function processAccountSync(data: {
  organizationId: string;
  accountId: string;
  syncRunId?: string;
  syncType?: string;
}) {
  const { organizationId, accountId, syncRunId, syncType = 'FULL' } = data;

  // 1. Resolve or create SyncRun record
  let syncRun = syncRunId
    ? await prisma.chatGPTAdsSyncRun.findUnique({ where: { id: syncRunId } })
    : null;

  if (!syncRun) {
    syncRun = await prisma.chatGPTAdsSyncRun.create({
      data: {
        organizationId,
        accountId,
        syncType,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });
  }

  try {
    const client = await getClientForAccount(organizationId, accountId);
    let recordsSynced = 0;

    // Fetch remote campaigns
    try {
      const remoteCampaigns = await client.listCampaigns({ limit: 50 });
      if (remoteCampaigns?.data) {
        for (const rc of remoteCampaigns.data) {
          await prisma.chatGPTAdsCampaign.upsert({
            where: {
              organizationId_openaiCampaignId: {
                organizationId,
                openaiCampaignId: rc.id,
              },
            },
            create: {
              organizationId,
              accountId,
              name: rc.name,
              openaiCampaignId: rc.id,
              status: rc.status || 'PAUSED',
              objective: rc.objective || 'TRAFFIC',
              budgetAmountPaise: BigInt(Math.round((rc.budget?.amount || 0) * 100)),
              budgetType: rc.budget?.type || 'DAILY',
              currency: rc.budget?.currency || 'USD',
            },
            update: {
              name: rc.name,
              status: rc.status,
              deliveryStatus: rc.delivery_status,
            },
          });
          recordsSynced++;
        }
      }
    } catch (err: any) {
      console.warn(`[ChatGPTAdsWorker] Remote campaigns fetch note: ${err.message}`);
    }

    // Fetch remote daily metrics / insights
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    try {
      const insightsRes = await client.getInsights({
        level: 'account',
        date_start: thirtyDaysAgo,
        date_end: today,
      });

      if (insightsRes?.data) {
        for (const metric of insightsRes.data) {
          const metricDate = new Date(metric.date);
          const spendPaise = metric.spend ? BigInt(Math.round(metric.spend * 100)) : BigInt(0);

          await prisma.chatGPTAdsInsight.create({
            data: {
              organizationId,
              accountId,
              date: metricDate,
              impressions: metric.impressions,
              clicks: metric.clicks,
              ctr: metric.ctr,
              spendPaise,
              conversions: metric.conversions,
              cpaPaise: metric.cpa ? BigInt(Math.round(metric.cpa * 100)) : null,
              roas: metric.roas,
              isFinal: metric.is_final ?? false,
            },
          });
          recordsSynced++;
        }
      }
    } catch (err: any) {
      console.warn(`[ChatGPTAdsWorker] Remote insights fetch note: ${err.message}`);
    }

    // Evaluate alerts
    await evaluateAccountAlerts(organizationId, accountId);

    // Complete SyncRun
    await prisma.chatGPTAdsSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'COMPLETED',
        recordsSynced,
        completedAt: new Date(),
      },
    });

    // Update Account Sync status
    await prisma.chatGPTAdsAccount.update({
      where: { id: accountId },
      data: {
        status: 'CONNECTED',
        lastSyncAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
        syncError: null,
      },
    });

    return { success: true, recordsSynced };
  } catch (err: any) {
    await prisma.chatGPTAdsSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'FAILED',
        errorMessage: err.message,
        completedAt: new Date(),
      },
    });

    await prisma.chatGPTAdsAccount.update({
      where: { id: accountId },
      data: {
        status: 'ERROR',
        syncError: err.message,
      },
    });

    throw err;
  }
}

async function processRecommendations(data: {
  organizationId: string;
  accountId?: string;
  campaignId?: string;
}) {
  return await generateRecommendations({
    organizationId: data.organizationId,
    accountId: data.accountId,
    campaignId: data.campaignId,
  });
}
