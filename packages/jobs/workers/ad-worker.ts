// Visnora — M5 Background Ad Worker (BullMQ Ad Intelligence Runner)
// Reference: M5 Competitor Ad Intelligence & Monitoring

import { Worker, Job } from 'bullmq';
import { prisma } from '../../database/src/client';
import {
  AD_QUEUE_NAME,
  AdJobData,
  AdCollectionJobData,
  AdMonitoringJobData,
} from '../queues/ad-queue';
import { getRedisClient } from '../queues/tracking-queue';
import { adCollectionService } from '../../domain/ad-intelligence/collection/ad-collection-service';
import { AdMonitoringService, AdSnapshotData } from '../../domain/ad-intelligence/monitoring/ad-monitoring-service';

export async function processAdJob(job: Job<AdJobData>): Promise<any> {
  const data = job.data;
  console.log(`[AdWorker] Processing job ${job.id} of type ${data.jobType}`);

  if (data.jobType === 'COLLECTION') {
    const colData = data as AdCollectionJobData;
    await job.updateProgress(10);
    const result = await adCollectionService.executeCollection({
      organizationId: colData.organizationId,
      projectId: colData.projectId,
      competitorId: colData.competitorId,
      brandId: colData.brandId,
      sourceType: colData.sourceType,
      query: colData.query,
      limit: colData.limit,
      country: colData.country,
      autoAnalyze: colData.autoAnalyze,
    });
    await job.updateProgress(100);
    return {
      runId: result.runId,
      status: result.status,
      totalFound: result.totalFound,
      totalIngested: result.totalIngested,
      newAdsCount: result.newAdsCount,
    };
  }

  if (data.jobType === 'MONITORING') {
    const monData = data as AdMonitoringJobData;
    await job.updateProgress(15);

    // Fetch competitors to monitor
    const competitors = await prisma.competitor.findMany({
      where: {
        organizationId: monData.organizationId,
        projectId: monData.projectId,
        isArchived: false,
        ...(monData.competitorId ? { id: monData.competitorId } : {}),
      },
    });

    let totalChangesDetected = 0;

    for (let i = 0; i < competitors.length; i++) {
      const comp = competitors[i];
      // Fetch latest stored snapshots
      const existingSnapshots = await prisma.adSnapshot.findMany({
        where: {
          adRecord: {
            organizationId: monData.organizationId,
            competitorId: comp.id,
          },
        },
        include: { adRecord: true },
      });

      const snapshotMap = new Map<string, AdSnapshotData>();
      for (const snap of existingSnapshots) {
        const snapPayload = (snap.snapshotData as any) || {};
        snapshotMap.set(snap.adRecord.externalAdId, {
          adRecordId: snap.adRecordId,
          externalAdId: snap.adRecord.externalAdId,
          headline: snapPayload.headline || snap.adRecord.headline || undefined,
          primaryText: snapPayload.primaryText || snap.adRecord.primaryText || undefined,
          ctaText: snapPayload.ctaText || snap.adRecord.ctaText || undefined,
          landingPageUrl: snapPayload.landingPageUrl || snap.adRecord.landingPageUrl || undefined,
          contentHash: snap.contentHash,
          status: snap.adRecord.status,
          capturedAt: snap.observedAt,
        });
      }

      // Collect fresh ads for this competitor
      await adCollectionService.executeCollection({
        organizationId: monData.organizationId,
        projectId: monData.projectId,
        competitorId: comp.id,
        sourceType: 'META_AD_LIBRARY',
        query: comp.canonicalName,
        limit: 10,
        country: monData.country || 'IN',
        autoAnalyze: true,
      });

      // Fetch newly stored records for this competitor
      const freshRecords = await prisma.adRecord.findMany({
        where: {
          organizationId: monData.organizationId,
          competitorId: comp.id,
        },
        orderBy: { lastSeenAt: 'desc' },
        take: 20,
      });

      // Detect differences
      const normalizedFresh = freshRecords.map((ad) => ({
        externalAdId: ad.externalAdId,
        platform: ad.platform as any,
        advertiserName: ad.advertiserName,
        headline: ad.headline || '',
        primaryText: ad.primaryText || '',
        ctaText: ad.ctaText || '',
        landingPageUrl: ad.landingPageUrl || '',
        contentHash: ad.contentHash,
        status: ad.status as any,
        format: ad.format as any,
        mediaUrls: [],
        displayFormat: 'SINGLE_IMAGE' as const,
        firstSeenAt: ad.firstSeenAt,
        lastSeenAt: ad.lastSeenAt,
        rawPayload: (ad.rawMetadata as any) || {},
      }));

      const { changeEvents } = AdMonitoringService.detectChanges(
        normalizedFresh,
        snapshotMap,
        comp.canonicalName
      );

      // Record any detected changes in DB
      for (const evt of changeEvents) {
        const adRecord = await prisma.adRecord.findFirst({
          where: {
            organizationId: monData.organizationId,
            externalAdId: evt.adRecordId,
          },
        });
        if (adRecord) {
          await prisma.adChangeEvent.create({
            data: {
              organizationId: monData.organizationId,
              adRecordId: adRecord.id,
              competitorId: comp.id,
              changeType: evt.changeType,
              fieldChanged: evt.fieldChanged,
              previousValue: evt.previousValue,
              newValue: evt.newValue,
            },
          });
          totalChangesDetected++;
        }
      }

      const progress = Math.round(15 + ((i + 1) / competitors.length) * 85);
      await job.updateProgress(progress);
    }

    return {
      monitoredCompetitors: competitors.length,
      totalChangesDetected,
    };
  }

  throw new Error(`Unsupported job type: ${(data as any).jobType}`);
}

let adWorkerInstance: Worker<AdJobData> | null = null;

export function startAdWorker(concurrency = 2): Worker<AdJobData> | null {
  if (adWorkerInstance) return adWorkerInstance;

  const redis = getRedisClient();
  if (!redis) {
    console.warn('[AdWorker] Cannot start worker: Redis connection unavailable');
    return null;
  }

  adWorkerInstance = new Worker<AdJobData>(
    AD_QUEUE_NAME,
    async (job) => {
      return await processAdJob(job);
    },
    {
      connection: redis,
      concurrency,
      lockDuration: 300000,
    }
  );

  adWorkerInstance.on('completed', (job, returnvalue) => {
    console.log(`[AdWorker] Job ${job.id} completed:`, returnvalue);
  });

  adWorkerInstance.on('failed', (job, err) => {
    console.error(`[AdWorker] Job ${job?.id} failed:`, err.message);
  });

  adWorkerInstance.on('error', (err) => {
    console.error('[AdWorker] Encountered error:', err.message);
  });

  console.log(`[AdWorker] Background worker started for queue "${AD_QUEUE_NAME}" (concurrency=${concurrency})`);
  return adWorkerInstance;
}

export async function stopAdWorker(): Promise<void> {
  if (adWorkerInstance) {
    await adWorkerInstance.close();
    adWorkerInstance = null;
  }
}
