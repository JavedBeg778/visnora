// Visnora — Competitor Ad Monitoring & Change Detection Service
// Reference: M5.4 Competitor Ad Monitoring & Snapshot Creation

import {
  AdChangeEventView,
  AdMonitoringJobView,
  NormalizedAdRecord,
} from '../types';

export interface AdSnapshotData {
  adRecordId: string;
  externalAdId: string;
  headline?: string;
  primaryText?: string;
  ctaText?: string;
  landingPageUrl?: string;
  contentHash: string;
  status: string;
  capturedAt: Date;
}

export class AdMonitoringService {
  /**
   * Compares fresh ad discoveries against previous snapshots and identifies changes.
   */
  public static detectChanges(
    freshAds: NormalizedAdRecord[],
    previousSnapshots: Map<string, AdSnapshotData>,
    competitorName?: string
  ): {
    changeEvents: AdChangeEventView[];
    newSnapshots: AdSnapshotData[];
  } {
    const changeEvents: AdChangeEventView[] = [];
    const newSnapshots: AdSnapshotData[] = [];
    const freshAdIds = new Set<string>();

    for (const ad of freshAds) {
      freshAdIds.add(ad.externalAdId);
      const prev = previousSnapshots.get(ad.externalAdId);

      // Snapshot record for this ad
      const currentSnapshot: AdSnapshotData = {
        adRecordId: ad.externalAdId,
        externalAdId: ad.externalAdId,
        headline: ad.headline,
        primaryText: ad.primaryText,
        ctaText: ad.ctaText,
        landingPageUrl: ad.landingPageUrl,
        contentHash: ad.contentHash,
        status: ad.status,
        capturedAt: new Date(),
      };
      newSnapshots.push(currentSnapshot);

      if (!prev) {
        // Brand new ad discovered
        changeEvents.push({
          id: `evt_new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          adRecordId: ad.externalAdId,
          competitorName,
          changeType: 'NEW_AD',
          newValue: ad.headline || ad.primaryText || 'New ad creative',
          detectedAt: new Date(),
        });
      } else {
        // Check for specific field modifications if content hash differs
        if (prev.contentHash !== ad.contentHash) {
          if (prev.headline !== ad.headline) {
            changeEvents.push({
              id: `evt_hl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              adRecordId: ad.externalAdId,
              competitorName,
              changeType: 'HEADLINE_CHANGED',
              fieldChanged: 'headline',
              previousValue: prev.headline,
              newValue: ad.headline,
              detectedAt: new Date(),
            });
          }
          if (prev.primaryText !== ad.primaryText) {
            changeEvents.push({
              id: `evt_txt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              adRecordId: ad.externalAdId,
              competitorName,
              changeType: 'TEXT_CHANGED',
              fieldChanged: 'primaryText',
              previousValue: prev.primaryText,
              newValue: ad.primaryText,
              detectedAt: new Date(),
            });
          }
          if (prev.ctaText !== ad.ctaText) {
            changeEvents.push({
              id: `evt_cta_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              adRecordId: ad.externalAdId,
              competitorName,
              changeType: 'CTA_CHANGED',
              fieldChanged: 'ctaText',
              previousValue: prev.ctaText,
              newValue: ad.ctaText,
              detectedAt: new Date(),
            });
          }
          if (prev.landingPageUrl !== ad.landingPageUrl) {
            changeEvents.push({
              id: `evt_lp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              adRecordId: ad.externalAdId,
              competitorName,
              changeType: 'LANDING_PAGE_CHANGED',
              fieldChanged: 'landingPageUrl',
              previousValue: prev.landingPageUrl,
              newValue: ad.landingPageUrl,
              detectedAt: new Date(),
            });
          }
        }
      }
    }

    // Detect removed / inactive ads
    for (const [extId, prev] of previousSnapshots.entries()) {
      if (!freshAdIds.has(extId) && prev.status === 'ACTIVE') {
        changeEvents.push({
          id: `evt_rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          adRecordId: extId,
          competitorName,
          changeType: 'REMOVED',
          previousValue: prev.headline || 'Active Ad',
          newValue: 'INACTIVE',
          detectedAt: new Date(),
        });
      }
    }

    return { changeEvents, newSnapshots };
  }
}

