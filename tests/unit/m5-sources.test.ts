// Visnora — M5 Source Adapters & SSRF Protection Unit Tests
// Reference: M5.1 Source Adapter Architecture

import { describe, it, expect } from 'vitest';
import {
  MetaAdLibraryAdapter,
  GoogleTransparencyAdapter,
  TikTokCreativeCenterAdapter,
  ManualUrlSourceAdapter,
  adSourceRegistry,
} from '../../packages/domain/ad-intelligence';

describe('M5.1 Ad Source Adapters & Registry', () => {
  it('registers all 4 standard source adapters in the registry', () => {
    const allAdapters = adSourceRegistry.getAllAdapters();
    expect(allAdapters.length).toBeGreaterThanOrEqual(4);

    const meta = adSourceRegistry.getAdapter('META_AD_LIBRARY');
    expect(meta).toBeInstanceOf(MetaAdLibraryAdapter);
    expect(meta.capabilities.isPubliclyPermitted).toBe(true);

    const google = adSourceRegistry.getAdapter('GOOGLE_ADS_TRANSPARENCY');
    expect(google).toBeInstanceOf(GoogleTransparencyAdapter);
    expect(google.capabilities.hasCreativeMedia).toBe(true);

    const tiktok = adSourceRegistry.getAdapter('TIKTOK_CREATIVE_CENTER');
    expect(tiktok).toBeInstanceOf(TikTokCreativeCenterAdapter);

    const manual = adSourceRegistry.getAdapter('MANUAL_SUBMISSION');
    expect(manual).toBeInstanceOf(ManualUrlSourceAdapter);
  });

  it('maps platform types to corresponding adapters', () => {
    expect(adSourceRegistry.getAdapterForPlatform('META_ADS').sourceType).toBe('META_AD_LIBRARY');
    expect(adSourceRegistry.getAdapterForPlatform('GOOGLE_ADS').sourceType).toBe('GOOGLE_ADS_TRANSPARENCY');
    expect(adSourceRegistry.getAdapterForPlatform('TIKTOK_ADS').sourceType).toBe('TIKTOK_CREATIVE_CENTER');
    expect(adSourceRegistry.getAdapterForPlatform('MANUAL').sourceType).toBe('MANUAL_SUBMISSION');
  });

  it('documents platform access limitations and non-fabrication principles', () => {
    const meta = new MetaAdLibraryAdapter();
    const limitations = meta.getLimitations();
    expect(limitations.some(l => l.includes('impressions') || l.includes('rate limit'))).toBe(true);

    const google = new GoogleTransparencyAdapter();
    expect(google.getLimitations().some(l => l.includes('confidential') || l.includes('verified'))).toBe(true);

    const tiktok = new TikTokCreativeCenterAdapter();
    expect(tiktok.getLimitations().some(l => l.includes('TikTok') || l.includes('video'))).toBe(true);
  });

  it('discovers competitor ads and normalizes ad records', async () => {
    const meta = new MetaAdLibraryAdapter();
    const result = await meta.discoverAds({
      organizationId: 'test_org',
      projectId: 'test_proj',
      query: 'Swiggy',
      limit: 5,
    });

    expect(result.ads.length).toBeGreaterThan(0);
    const firstAd = result.ads[0];
    expect(firstAd.platform).toBe('META_ADS');
    expect(firstAd.advertiserName).toBe('Swiggy');
    expect(firstAd.contentHash).toBeDefined();
    expect(firstAd.status).toBe('ACTIVE');
  });

  it('searches verified advertisers on Google and Meta platforms', async () => {
    const meta = new MetaAdLibraryAdapter();
    const results = await meta.searchAdvertisers('Zomato');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].advertiserName).toBe('Zomato');

    const google = new GoogleTransparencyAdapter();
    const gResults = await google.searchAdvertisers('Swiggy');
    expect(gResults.length).toBeGreaterThan(0);
    expect(gResults[0].advertiserId).toBeDefined();
  });
});

describe('M5.1 Manual Ad URL Submission & SSRF Protection', () => {
  it('blocks loopback and private IP addresses from ingestion', async () => {
    const adapter = new ManualUrlSourceAdapter();

    // 127.0.0.1
    await expect(
      adapter.discoverAds({
        organizationId: 'test_org',
        projectId: 'test_proj',
        query: 'http://127.0.0.1:8080/ad',
      })
    ).rejects.toThrow();

    // localhost
    await expect(
      adapter.discoverAds({
        organizationId: 'test_org',
        projectId: 'test_proj',
        query: 'http://localhost/ad',
      })
    ).rejects.toThrow();

    // Cloud metadata 169.254.169.254
    await expect(
      adapter.discoverAds({
        organizationId: 'test_org',
        projectId: 'test_proj',
        query: 'http://169.254.169.254/latest/meta-data',
      })
    ).rejects.toThrow();

    // Private RFC 1918 (192.168.1.1)
    await expect(
      adapter.discoverAds({
        organizationId: 'test_org',
        projectId: 'test_proj',
        query: 'http://192.168.1.1/admin',
      })
    ).rejects.toThrow();
  });

  it('extracts creative metadata from a permitted public URL', async () => {
    const adapter = new ManualUrlSourceAdapter();
    const result = await adapter.discoverAds({
      organizationId: 'test_org',
      projectId: 'test_proj',
      query: 'https://example.com/promotions',
    });

    expect(result.ads.length).toBe(1);
    const ad = result.ads[0];
    expect(ad.platform).toBe('MANUAL');
    expect(ad.landingPageUrl).toBe('https://example.com/promotions');
    expect(ad.contentHash).toBeDefined();
  });
});

