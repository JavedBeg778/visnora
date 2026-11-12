// Visnora — M5 Competitor Ad Analytics & Side-by-Side Comparison Unit Tests
// Reference: M5.3 Competitor Ad Analytics & Ad Comparison

import { describe, it, expect } from 'vitest';
import {
  CompetitorAdAnalyticsService,
  AdComparisonService,
  NormalizedAdRecord,
} from '../../packages/domain/ad-intelligence';

describe('M5.3 Competitor Ad Analytics', () => {
  const sampleAds: NormalizedAdRecord[] = [
    {
      externalAdId: 'meta_1',
      platform: 'META_ADS',
      advertiserName: 'Swiggy',
      headline: 'Craving Biryani? Get Flat ₹125 OFF on your first 3 orders on Swiggy!',
      primaryText: 'Hungry? Lightning-fast 20-min delivery from top-rated restaurants near you.',
      ctaText: 'Order Now',
      format: 'IMAGE',
      landingPageUrl: 'https://www.swiggy.com/restaurants',
      status: 'ACTIVE',
      contentHash: 'hash1',
      firstSeenAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
    {
      externalAdId: 'goog_1',
      platform: 'GOOGLE_ADS',
      advertiserName: 'Swiggy',
      headline: 'Swiggy Food Delivery — Order Food Online with Superfast Delivery',
      primaryText: 'Order food from your favorite restaurants near you. Fast doorstep delivery.',
      ctaText: 'Visit Site',
      format: 'TEXT',
      landingPageUrl: 'https://www.swiggy.com/order-online',
      status: 'ACTIVE',
      contentHash: 'hash2',
      firstSeenAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
    },
    {
      externalAdId: 'tt_1',
      platform: 'TIKTOK_ADS',
      advertiserName: 'Swiggy',
      headline: 'Late night cravings hitting different? Watch this 🤤🍕',
      primaryText: 'Midnight hunger strikes? Swiggy delivers hot pizza in 20 minutes!',
      ctaText: 'Order Now',
      format: 'VIDEO',
      landingPageUrl: 'https://www.swiggy.com/late-night',
      status: 'ACTIVE',
      contentHash: 'hash3',
      firstSeenAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    },
  ];

  it('aggregates platform and format distributions with percentages', () => {
    const summary = CompetitorAdAnalyticsService.calculateCompetitorSummary(
      'comp_swiggy',
      sampleAds,
      { name: 'Swiggy', domain: 'swiggy.com' }
    );

    expect(summary.totalAdsDiscovered).toBe(3);
    expect(summary.activeAdsCount).toBe(3);
    expect(summary.competitorName).toBe('Swiggy');

    // Platform distribution
    expect(summary.platformDistribution).toHaveLength(3);
    const metaPlatform = summary.platformDistribution.find(p => p.platform === 'META_ADS');
    expect(metaPlatform?.percentage).toBe(33);

    // Format distribution
    expect(summary.formatDistribution).toHaveLength(3);
    const videoFormat = summary.formatDistribution.find(f => f.format === 'VIDEO');
    expect(videoFormat?.percentage).toBe(33);
  });

  it('ranks top converting CTAs and extracts offers and messaging themes', () => {
    const summary = CompetitorAdAnalyticsService.calculateCompetitorSummary(
      'comp_swiggy',
      sampleAds
    );

    expect(summary.topCtas[0].cta).toBe('Order Now');
    expect(summary.topCtas[0].count).toBe(2);

    expect(summary.activeOffers).toContain('Flat ₹125 OFF');
    expect(summary.commonMessagingThemes).toContain('Speed & Rapid Delivery');
  });
});

describe('M5.3 Side-by-Side Ad Comparison Engine', () => {
  it('throws an error if fewer than 2 ads are provided for comparison', () => {
    expect(() =>
      AdComparisonService.compareAds([
        {
          id: 'ad_1',
          advertiserName: 'Swiggy',
          platform: 'META_ADS',
          format: 'IMAGE',
        },
      ])
    ).toThrow('Ad comparison requires at least 2 advertisements.');
  });

  it('generates comparative synthesis, common themes, and strategic divergences', () => {
    const comparison = AdComparisonService.compareAds([
      {
        id: 'ad_1',
        advertiserName: 'Swiggy',
        headline: 'Superfast 20-min delivery',
        platform: 'META_ADS',
        format: 'IMAGE',
        ctaText: 'Order Now',
        analysis: {
          mainMessage: 'Fast delivery',
          valueProposition: '20-min meals',
          painPoints: ['Hunger'],
          audienceSignals: ['Foodies'],
          emotionalVsRational: 'BALANCED',
          positioning: 'Ultra-fast delivery speed leader',
          promotionalStrategy: 'First order discount',
          offerStrategy: 'Flat discount',
          ctaStrategy: 'High urgency',
          creativeFormat: 'Static banner',
          messagingAngle: 'Speed',
          confidenceScore: 0.95,
        },
      },
      {
        id: 'ad_2',
        advertiserName: 'EatSure',
        headline: 'Multiple brands in 1 order',
        platform: 'META_ADS',
        format: 'CAROUSEL',
        ctaText: 'Install Now',
        analysis: {
          mainMessage: 'Assortment variety',
          valueProposition: 'Single cart checkout',
          painPoints: ['Multiple food preferences'],
          audienceSignals: ['Roommates', 'Families'],
          emotionalVsRational: 'RATIONAL',
          positioning: 'Multi-brand assortment differentiator',
          promotionalStrategy: 'Free delivery',
          offerStrategy: 'Zero delivery fee',
          ctaStrategy: 'App install',
          creativeFormat: 'Multi-slide carousel',
          messagingAngle: 'Assortment choice',
          confidenceScore: 0.92,
        },
      },
    ]);

    expect(comparison.title).toContain('Swiggy vs EatSure');
    expect(comparison.ads).toHaveLength(2);
    expect(comparison.aiSummary).toBeDefined();
    expect(comparison.aiSummary).toContain('Swiggy');
    expect(comparison.aiSummary).toContain('EatSure');
    expect(comparison.commonThemes.length).toBeGreaterThan(0);
    expect(comparison.differingThemes.length).toBeGreaterThan(0);
  });
});

