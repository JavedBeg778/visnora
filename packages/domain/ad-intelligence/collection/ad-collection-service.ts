// Visnora — Ad Collection & Discovery Pipeline Engine
// Reference: M5.2 Discovery, M5.4 Monitoring & Pipeline Orchestration

import crypto from 'crypto';
import { prisma } from '../../../database/src/client';
import { adSourceRegistry } from '../sources/adapter-registry';
import { CreativeExtractor } from '../extraction/creative-extractor';
import { AdAnalysisService } from '../analysis/ad-analysis-service';
import { AdMonitoringService, AdSnapshotData } from '../monitoring/ad-monitoring-service';
import { reserveAdQuota, recordAdUsage, releaseReservedAdQuota } from '../../billing/usage-meter';
import {
  AdSourceType,
  AdPlatformType,
  NormalizedAdRecord,
  AdFormatType,
} from '../types';

export interface StartCollectionParams {
  organizationId: string;
  projectId: string;
  competitorId?: string;
  brandId?: string;
  sourceType?: AdSourceType;
  query?: string;
  limit?: number;
  country?: string;
  autoAnalyze?: boolean;
}

export interface CollectionRunResult {
  runId: string;
  organizationId: string;
  status: 'COMPLETED' | 'RUNNING' | 'PARTIAL_SUCCESS' | 'FAILED';
  totalFound: number;
  totalIngested: number;
  newAdsCount: number;
  updatedAdsCount: number;
  failedCount: number;
  errorMessage?: string;
}

export class AdCollectionService {
  private analysisService: AdAnalysisService;

  constructor() {
    this.analysisService = new AdAnalysisService();
  }

  /**
   * Executes a complete discovery, creative extraction, snapshotting, and optional AI analysis run.
   */
  async executeCollection(params: StartCollectionParams): Promise<CollectionRunResult> {
    const {
      organizationId,
      projectId,
      competitorId,
      sourceType = 'META_AD_LIBRARY',
      query = '',
      limit = 10,
      autoAnalyze = true,
    } = params;

    // 1. Quota reservation check
    const quotaCheck = await reserveAdQuota(organizationId, limit);
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.errorDetails?.message || 'Monthly ad discovery quota exceeded.');
    }

    const runId = `run_${crypto.randomUUID()}`;

    // 2. Initialize collection run record in database
    try {
      await prisma.adCollectionRun.create({
        data: {
          id: runId,
          organizationId,
          projectId,
          competitorId: competitorId || null,
          source: sourceType,
          status: 'RUNNING',
          adsDiscovered: 0,
          adsProcessed: 0,
        },
      });
    } catch (err) {
      console.warn('[AdCollectionService] Could not persist initial run record:', err);
    }

    let totalFound = 0;
    let totalIngested = 0;
    let newAdsCount = 0;
    let updatedAdsCount = 0;
    let failedCount = 0;
    let finalErrorMessage: string | undefined;

    try {
      // 3. Discover ads via selected adapter
      const adapter = adSourceRegistry.getAdapter(sourceType);
      const discoveryResult = await adapter.discoverAds({
        organizationId,
        projectId,
        competitorId,
        query,
        limit,
      });

      const discoveredAds = discoveryResult.ads || [];
      totalFound = discoveredAds.length;

      // 4. Retrieve existing snapshots for change detection if competitor is specified
      const previousSnapshotsMap = new Map<string, AdSnapshotData>();
      if (competitorId) {
        try {
          const existingAds = await prisma.adRecord.findMany({
            where: { organizationId, competitorId },
            include: {
              snapshots: {
                orderBy: { observedAt: 'desc' },
                take: 1,
              },
            },
          });

          for (const ea of existingAds) {
            if (ea.snapshots && ea.snapshots.length > 0) {
              const snap = ea.snapshots[0];
              previousSnapshotsMap.set(ea.externalAdId, {
                adRecordId: ea.id,
                externalAdId: ea.externalAdId,
                headline: ea.headline || undefined,
                primaryText: ea.primaryText || undefined,
                ctaText: ea.ctaText || undefined,
                landingPageUrl: ea.landingPageUrl || undefined,
                contentHash: snap.contentHash,
                status: ea.status,
                capturedAt: snap.observedAt,
              });
            }
          }
        } catch {
          // ignore if DB is offline or mock
        }
      }

      // 5. Ingest and extract each discovered advertisement
      for (const rawAd of discoveredAds) {
        try {
          // Structured extraction & normalization
          const extracted = CreativeExtractor.extract(rawAd);

          let adRecordId: string;
          let isNew = false;

          // Upsert AdRecord into Prisma
          try {
            const existing = await prisma.adRecord.findUnique({
              where: {
                uq_org_platform_ext_ad: {
                  organizationId,
                  platform: rawAd.platform as any,
                  externalAdId: rawAd.externalAdId,
                },
              },
            });

            if (existing) {
              adRecordId = existing.id;
              await prisma.adRecord.update({
                where: { id: existing.id },
                data: {
                  headline: extracted.headline,
                  primaryText: extracted.primaryText,
                  description: extracted.description,
                  ctaText: extracted.ctaText,
                  format: extracted.format as any,
                  landingPageUrl: rawAd.landingPageUrl,
                  contentHash: extracted.contentHash,
                  status: rawAd.status as any,
                  lastSeenAt: new Date(),
                },
              });
              updatedAdsCount++;
            } else {
              const created = await prisma.adRecord.create({
                data: {
                  organizationId,
                  projectId,
                  competitorId: competitorId || null,
                  brandId: params.brandId || null,
                  externalAdId: rawAd.externalAdId,
                  platform: rawAd.platform as any,
                  originalUrl: rawAd.originalUrl,
                  advertiserName: rawAd.advertiserName,
                  advertiserExternalId: rawAd.advertiserExternalId,
                  headline: extracted.headline,
                  primaryText: extracted.primaryText,
                  description: extracted.description,
                  ctaText: extracted.ctaText,
                  format: extracted.format as any,
                  landingPageUrl: rawAd.landingPageUrl,
                  country: rawAd.country || 'IN',
                  language: rawAd.language || 'en',
                  firstSeenAt: rawAd.firstSeenAt || new Date(),
                  lastSeenAt: new Date(),
                  contentHash: extracted.contentHash,
                  status: rawAd.status as any,
                  rawMetadata: (rawAd.rawMetadata as any) || {},
                },
              });
              adRecordId = created.id;
              isNew = true;
              newAdsCount++;
            }

            // Save creative assets
            if (extracted.creatives && extracted.creatives.length > 0) {
              for (const cr of extracted.creatives) {
                await prisma.adCreative.create({
                  data: {
                    adRecordId,
                    mediaType: (cr.mediaType || 'IMAGE') as any,
                    mediaUrl: cr.mediaUrl,
                    thumbnailUrl: cr.thumbnailUrl,
                    caption: cr.caption,
                    width: cr.width,
                    height: cr.height,
                  },
                }).catch(() => {});
              }
            }

            // Save landing page info if present
            if (rawAd.landingPageUrl) {
              try {
                const parsedUrl = new URL(rawAd.landingPageUrl);
                await prisma.adLandingPage.create({
                  data: {
                    adRecordId,
                    url: rawAd.landingPageUrl,
                    normalizedDomain: parsedUrl.hostname.replace(/^www\./, ''),
                    extractedOffers: extracted.offers,
                    isAccessible: true,
                  },
                }).catch(() => {});
              } catch {}
            }

            // Save Snapshot
            await prisma.adSnapshot.create({
              data: {
                adRecordId,
                contentHash: extracted.contentHash,
                snapshotData: {
                  headline: extracted.headline,
                  primaryText: extracted.primaryText,
                  ctaText: extracted.ctaText,
                  offers: extracted.offers,
                  status: rawAd.status,
                },
              },
            }).catch(() => {});

            // Optional On-Demand AI Analysis
            if (autoAnalyze && (isNew || !existing)) {
              await this.analysisService.analyzeAd({
                adRecordId,
                organizationId,
                advertiserName: rawAd.advertiserName,
                headline: extracted.headline,
                primaryText: extracted.primaryText,
                description: extracted.description,
                ctaText: extracted.ctaText,
                format: extracted.format,
                landingPageUrl: rawAd.landingPageUrl,
              }).then(async (analysis) => {
                await prisma.adAnalysis.create({
                  data: {
                    adRecordId,
                    organizationId,
                    mainMessage: analysis.mainMessage,
                    valueProposition: analysis.valueProposition,
                    painPoints: analysis.painPoints,
                    audienceSignals: analysis.audienceSignals,
                    emotionalVsRational: analysis.emotionalVsRational,
                    positioning: analysis.positioning,
                    promotionalStrategy: analysis.promotionalStrategy,
                    offerStrategy: analysis.offerStrategy,
                    ctaStrategy: analysis.ctaStrategy,
                    creativeFormat: analysis.creativeFormat,
                    messagingAngle: analysis.messagingAngle,
                    landingPageRelevance: analysis.landingPageRelevance,
                    confidenceScore: analysis.confidenceScore,
                    model: analysis.model,
                    promptTokens: analysis.promptTokens,
                    completionTokens: analysis.completionTokens,
                    estimatedCostPaise: analysis.estimatedCostPaise,
                    rawAiOutput: analysis.rawAiOutput || {},
                    status: 'COMPLETED',
                  },
                }).catch(() => {});
              }).catch((e) => {
                console.warn(`[AdCollectionService] AI analysis skipped for ad ${adRecordId}:`, e?.message);
              });
            }

            totalIngested++;
          } catch (dbErr: any) {
            console.warn(`[AdCollectionService] Error saving ad ${rawAd.externalAdId}:`, dbErr?.message);
            failedCount++;
          }
        } catch (extractErr: any) {
          console.warn(`[AdCollectionService] Error extracting ad ${rawAd.externalAdId}:`, extractErr?.message);
          failedCount++;
        }
      }

      // 6. Change detection
      try {
        const changeResults = AdMonitoringService.detectChanges(
          discoveredAds,
          previousSnapshotsMap,
          query || 'Competitor'
        );

        if (competitorId && changeResults.changeEvents.length > 0) {
          for (const ev of changeResults.changeEvents) {
            await prisma.adChangeEvent.create({
              data: {
                organizationId,
                competitorId,
                adRecordId: ev.adRecordId,
                changeType: ev.changeType,
                fieldChanged: ev.fieldChanged,
                previousValue: ev.previousValue,
                newValue: ev.newValue,
              },
            }).catch(() => {});
          }
        }
      } catch (monitoringErr) {
        console.warn('[AdCollectionService] Monitoring change detection error:', monitoringErr);
      }

      // 7. Record consumed usage
      if (totalIngested > 0) {
        await recordAdUsage({
          organizationId,
          quantity: totalIngested,
          collectionRunId: runId,
        }).catch(() => {});
      }
    } catch (pipelineErr: any) {
      finalErrorMessage = pipelineErr?.message || 'Collection pipeline encountered an unexpected error.';
      console.error('[AdCollectionService] Pipeline error:', pipelineErr);
    }

    const finalStatus = finalErrorMessage
      ? (totalIngested > 0 ? 'PARTIAL_SUCCESS' : 'FAILED')
      : (failedCount > 0 ? 'PARTIAL_SUCCESS' : 'COMPLETED');

    // 8. Update collection run record
    try {
      await prisma.adCollectionRun.update({
        where: { id: runId },
        data: {
          status: finalStatus,
          adsDiscovered: totalFound,
          adsProcessed: totalIngested,
          errors: finalErrorMessage ? [{ message: finalErrorMessage }] : [],
          completedAt: new Date(),
        },
      });
    } catch {
      // ignore
    }

    return {
      runId,
      organizationId,
      status: finalStatus,
      totalFound,
      totalIngested,
      newAdsCount,
      updatedAdsCount,
      failedCount,
      errorMessage: finalErrorMessage,
    };
  }
}

export const adCollectionService = new AdCollectionService();
