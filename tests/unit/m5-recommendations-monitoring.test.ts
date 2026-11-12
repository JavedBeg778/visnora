// Visnora — M5 Recommendations & Monitoring Unit Tests
// Reference: M5.4 Evidence-Backed AI Recommendations & Monitoring

import { describe, it, expect } from 'vitest';
import {
  AdRecommendationService,
  AdMonitoringService,
  NormalizedAdRecord,
} from '../../packages/domain/ad-intelligence';

describe('M5.4 Evidence-Backed AI Recommendations', () => {
  const competitorAds: NormalizedAdRecord[] = [
    {
      externalAdId: 'meta_swiggy_1',
      platform: 'META_ADS',
      advertiserName: 'Swiggy',
      headline: 'Flat ₹125 OFF on food delivery in 20 minutes',
      primaryText: 'Hungry? Lightning-fast 20-min delivery from top-rated restaurants near you.',
      ctaText: 'Order Now',
      format: 'VIDEO',
      status: 'ACTIVE',
      contentHash: 'hash1',
    },
    {
      externalAdId: 'meta_eatsure_1',
      platform: 'META_ADS',
      advertiserName: 'EatSure',
      headline: 'Multiple brands in 1 single order, 0 delivery fee',
      primaryText: 'Mix and match Behrouz Biryani, Faasos Wraps, and Ovenstory Pizza in one checkout.',
      ctaText: 'Order Now',
      format: 'CAROUSEL',
      status: 'ACTIVE',
      contentHash: 'hash2',
    },
  ];

  it('generates evidence-backed recommendations based on competitor ad patterns', () => {
    const recs = AdRecommendationService.generateRecommendations('Zomato', competitorAds);

    expect(recs.length).toBeGreaterThanOrEqual(3);

    // Categories present
    const categories = recs.map(r => r.category);
    expect(categories).toContain('CTA');
    expect(categories).toContain('OFFER');
    expect(categories).toContain('POSITIONING');

    // Evidence checks
    for (const r of recs) {
      expect(r.title).toBeDefined();
      expect(r.explanation).toBeDefined();
      expect(r.evidenceSummary).toBeDefined();
      expect(r.expectedBenefit).toBeDefined();
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(r.confidence);
      expect(r.suggestedAction).toBeDefined();
      expect(r.status).toBe('NEW');
    }
  });
});

describe('M5.4 Competitor Ad Monitoring & Change Detection', () => {
  it('detects NEW_AD events when unseen ad records appear', () => {
    const freshAds: NormalizedAdRecord[] = [
      {
        externalAdId: 'new_ad_999',
        platform: 'META_ADS',
        advertiserName: 'Swiggy',
        headline: 'New Weekend Promo',
        ctaText: 'Order Now',
        format: 'IMAGE',
        status: 'ACTIVE',
        contentHash: 'hash_fresh',
      },
    ];

    const previousSnapshots = new Map();

    const { changeEvents, newSnapshots } = AdMonitoringService.detectChanges(
      freshAds,
      previousSnapshots,
      'Swiggy'
    );

    expect(changeEvents).toHaveLength(1);
    expect(changeEvents[0].changeType).toBe('NEW_AD');
    expect(changeEvents[0].adRecordId).toBe('new_ad_999');
    expect(newSnapshots).toHaveLength(1);
  });

  it('detects HEADLINE_CHANGED, CTA_CHANGED, and REMOVED events', () => {
    const previousSnapshots = new Map([
      [
        'ad_101',
        {
          adRecordId: 'ad_101',
          externalAdId: 'ad_101',
          headline: 'Original Headline',
          primaryText: 'Same copy',
          ctaText: 'Learn More',
          contentHash: 'hash_old',
          status: 'ACTIVE',
          capturedAt: new Date(),
        },
      ],
      [
        'ad_removed',
        {
          adRecordId: 'ad_removed',
          externalAdId: 'ad_removed',
          headline: 'Old Expired Ad',
          contentHash: 'hash_expired',
          status: 'ACTIVE',
          capturedAt: new Date(),
        },
      ],
    ]);

    const freshAds: NormalizedAdRecord[] = [
      {
        externalAdId: 'ad_101',
        platform: 'META_ADS',
        advertiserName: 'Swiggy',
        headline: 'Revised High Converting Headline',
        primaryText: 'Same copy',
        ctaText: 'Order Now', // changed CTA
        format: 'IMAGE',
        status: 'ACTIVE',
        contentHash: 'hash_new', // modified hash
      },
    ];

    const { changeEvents } = AdMonitoringService.detectChanges(
      freshAds,
      previousSnapshots,
      'Swiggy'
    );

    const changeTypes = changeEvents.map(e => e.changeType);
    expect(changeTypes).toContain('HEADLINE_CHANGED');
    expect(changeTypes).toContain('CTA_CHANGED');
    expect(changeTypes).toContain('REMOVED');
  });
});

