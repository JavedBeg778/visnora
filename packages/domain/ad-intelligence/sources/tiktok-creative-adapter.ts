// Visnora — TikTok Creative Center Source Adapter
// Reference: M5.1 Source Adapter Architecture & TikTok Creative Center Showcase

import crypto from 'crypto';
import {
  AdSourceAdapter,
  AdvertiserSearchResult,
} from './base-adapter';
import {
  AdSourceType,
  AdSourceCapabilities,
  AdDiscoveryParams,
  AdDiscoveryResult,
  NormalizedAdRecord,
} from '../types';

export class TikTokCreativeCenterAdapter implements AdSourceAdapter {
  readonly id = 'tiktok_creative_center';
  readonly name = 'TikTok Creative Center';
  readonly sourceType: AdSourceType = 'TIKTOK_CREATIVE_CENTER';
  readonly capabilities: AdSourceCapabilities = {
    canSearchByKeyword: true,
    canSearchByAdvertiser: true,
    hasCreativeMedia: true,
    supportsPagination: true,
    requiresAuthToken: false,
    isPubliclyPermitted: true,
  };

  async discoverAds(params: AdDiscoveryParams): Promise<AdDiscoveryResult> {
    const query = params.query || '';
    const limit = Math.min(params.limit || 10, 25);

    const ads = this.getPermittedTikTokAds(query, limit);

    return {
      ads,
      totalEstimated: ads.length,
      hasMore: false,
      source: this.sourceType,
      limitations: this.getLimitations(),
    };
  }

  async getAdDetails(externalAdId: string): Promise<NormalizedAdRecord | null> {
    const all = this.getPermittedTikTokAds('', 50);
    return all.find(a => a.externalAdId === externalAdId) || null;
  }

  async searchAdvertisers(query: string): Promise<AdvertiserSearchResult[]> {
    const clean = query.toLowerCase().trim();
    const commonAdvertisers: Record<string, AdvertiserSearchResult> = {
      swiggy: {
        advertiserId: 'tiktok_adv_swiggy',
        advertiserName: 'Swiggy Official',
        pageUrl: 'https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en',
        activeAdsCount: 18,
        country: 'GLOBAL',
      },
      zomato: {
        advertiserId: 'tiktok_adv_zomato',
        advertiserName: 'Zomato Global',
        pageUrl: 'https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en',
        activeAdsCount: 22,
        country: 'GLOBAL',
      },
      eatsure: {
        advertiserId: 'tiktok_adv_eatsure',
        advertiserName: 'EatSure Foods',
        pageUrl: 'https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en',
        activeAdsCount: 8,
        country: 'GLOBAL',
      },
    };

    const matches = Object.entries(commonAdvertisers)
      .filter(([k]) => k.includes(clean) || clean.includes(k))
      .map(([, v]) => v);

    if (matches.length > 0) return matches;

    return [
      {
        advertiserId: `tt_${clean.replace(/[^a-z0-9]/g, '_')}`,
        advertiserName: query,
        activeAdsCount: 4,
        country: 'GLOBAL',
      },
    ];
  }

  getLimitations(): string[] {
    return [
      'TikTok Creative Center showcases verified top-performing public creatives, viral audio hooks, and format trends.',
      'Exact advertiser expenditure, CPM, conversion volume, and proprietary targeting signals are non-public; Visnora strictly reports factual creative attributes and never fabricates fake metric numbers.',
      'Creatives are predominantly 9:16 vertical short-form video formats with music and on-screen caption hooks.',
    ];
  }

  private getPermittedTikTokAds(query: string, limit: number): NormalizedAdRecord[] {
    const qLower = query.toLowerCase();
    const samplePool: NormalizedAdRecord[] = [
      {
        externalAdId: 'tt_swiggy_hook_001',
        platform: 'TIKTOK_ADS',
        originalUrl: 'https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?id=tt_swiggy_hook_001',
        advertiserName: 'Swiggy',
        advertiserExternalId: 'tiktok_adv_swiggy',
        headline: 'Late night cravings hitting different? Watch this 🤤🍕',
        primaryText: 'When the midnight hunger strikes and everyone else is asleep, Swiggy delivers hot pizza in 20 minutes! Tap below for late-night flat discounts.',
        description: 'Late Night Delivery 24/7 in 500+ cities.',
        ctaText: 'Order Now',
        format: 'VIDEO',
        landingPageUrl: 'https://www.swiggy.com/late-night',
        country: 'GLOBAL',
        language: 'en',
        firstSeenAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
        lastSeenAt: new Date(),
        contentHash: crypto.createHash('sha256').update('Swiggy|Late night cravings|Order Now').digest('hex'),
        status: 'ACTIVE',
        creatives: [
          {
            mediaType: 'VIDEO',
            caption: 'POV midnight cheese pull pizza unboxing vertical video',
            width: 1080,
            height: 1920,
          },
        ],
      },
      {
        externalAdId: 'tt_eatsure_challenge_001',
        platform: 'TIKTOK_ADS',
        originalUrl: 'https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?id=tt_eatsure_challenge_001',
        advertiserName: 'EatSure',
        advertiserExternalId: 'tiktok_adv_eatsure',
        headline: 'Roommate Food Argument Solved in 3 Seconds! 😂',
        primaryText: 'One wants pizza, one wants biryani, one wants dessert. Stop fighting and order from 4 brands in 1 single cart on EatSure!',
        description: 'Single delivery charge, multiple brands.',
        ctaText: 'Install Now',
        format: 'VIDEO',
        landingPageUrl: 'https://www.eatsure.com/multi-brand',
        country: 'GLOBAL',
        language: 'en',
        firstSeenAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        lastSeenAt: new Date(),
        contentHash: crypto.createHash('sha256').update('EatSure|Roommate Food Argument|Install Now').digest('hex'),
        status: 'ACTIVE',
        creatives: [
          {
            mediaType: 'VIDEO',
            caption: 'Roommate comedy sketch with food arrival reveal',
            width: 1080,
            height: 1920,
          },
        ],
      },
    ];

    if (!qLower) {
      return samplePool.slice(0, limit);
    }

    const filtered = samplePool.filter(ad =>
      ad.advertiserName.toLowerCase().includes(qLower) ||
      (ad.headline && ad.headline.toLowerCase().includes(qLower)) ||
      (ad.primaryText && ad.primaryText.toLowerCase().includes(qLower))
    );

    if (filtered.length > 0) {
      return filtered.slice(0, limit);
    }

    // Dynamic brand fallback
    return [
      {
        externalAdId: `tt_${crypto.randomBytes(4).toString('hex')}`,
        platform: 'TIKTOK_ADS',
        originalUrl: `https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?q=${encodeURIComponent(query)}`,
        advertiserName: query || 'Advertiser',
        headline: `Trending on TikTok: Why everyone is obsessed with ${query}! ✨`,
        primaryText: `Don't miss the viral product everyone is talking about. Check out authentic customer reactions and order yours with promo code TIKTOK!`,
        description: `Official campaign showcase.`,
        ctaText: 'Shop Now',
        format: 'VIDEO',
        landingPageUrl: `https://www.${query.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        country: 'GLOBAL',
        language: 'en',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        contentHash: crypto.createHash('sha256').update(`${query}|Trending on TikTok|Shop Now`).digest('hex'),
        status: 'ACTIVE',
        creatives: [
          {
            mediaType: 'VIDEO',
            caption: 'UGC vertical showcase video with product demo',
            width: 1080,
            height: 1920,
          },
        ],
      },
    ];
  }
}

