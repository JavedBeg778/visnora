// Visnora — M5 Creative Extraction Unit Tests
// Reference: M5.2 Structured Creative Extraction

import { describe, it, expect } from 'vitest';
import { CreativeExtractor } from '../../packages/domain/ad-intelligence';

describe('M5.2 Structured Creative Extraction', () => {
  it('standardizes various calls to action into canonical terms', () => {
    const ext1 = CreativeExtractor.extract({
      advertiserName: 'Swiggy',
      headline: 'Quick meal',
      ctaText: 'Place Order',
    });
    expect(ext1.ctaText).toBe('Order Now');

    const ext2 = CreativeExtractor.extract({
      advertiserName: 'EatSure',
      headline: 'Get the App',
      ctaText: 'Download on App Store',
    });
    expect(ext2.ctaText).toBe('Install Now');

    const ext3 = CreativeExtractor.extract({
      advertiserName: 'Magicpin',
      headline: 'Claim savings',
      ctaText: 'Get Offer Today',
    });
    expect(ext3.ctaText).toBe('Get Offer');
  });

  it('detects discount and promotional offers from ad copy', () => {
    const extracted = CreativeExtractor.extract({
      advertiserName: 'Swiggy',
      headline: 'Get Flat ₹125 OFF on your first 3 food deliveries!',
      primaryText: 'Order now with free delivery and use code SWIGGY125 for 50% OFF up to ₹150.',
    });

    expect(extracted.offers.length).toBeGreaterThan(0);
    expect(extracted.offers.some(o => o.toLowerCase().includes('125 off') || o.toLowerCase().includes('free delivery') || o.toLowerCase().includes('50% off'))).toBe(true);
  });

  it('identifies target audience keywords and signals', () => {
    const extracted = CreativeExtractor.extract({
      advertiserName: 'Swiggy',
      headline: 'Late night cravings for urban foodies!',
      primaryText: 'Perfect for roommates and late night hunger pangs.',
    });

    expect(extracted.audienceKeywords).toContain('late night');
    expect(extracted.audienceKeywords).toContain('foodie');
    expect(extracted.audienceKeywords).toContain('roommates');
  });

  it('generates deterministic SHA-256 canonical content hashes', () => {
    const hash1 = CreativeExtractor.extract({
      advertiserName: 'Swiggy',
      headline: 'Superfast Biryani',
      primaryText: 'Delivered in 20 minutes',
      ctaText: 'Order Now',
    }).contentHash;

    const hash2 = CreativeExtractor.extract({
      advertiserName: 'Swiggy',
      headline: 'Superfast Biryani',
      primaryText: 'Delivered in 20 minutes',
      ctaText: 'Order Now',
    }).contentHash;

    const hashDifferent = CreativeExtractor.extract({
      advertiserName: 'Swiggy',
      headline: 'Superfast Biryani — Discounted',
      primaryText: 'Delivered in 20 minutes',
      ctaText: 'Order Now',
    }).contentHash;

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDifferent);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
  });
});

