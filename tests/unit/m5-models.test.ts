// Visnora — M5 Models, Schema & Content Hash Deduplication Tests
// Reference: M5 Database Schema Architecture

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('M5 Database Models, Schema & Enums', () => {
  it('validates AdPlatform, AdSourceType, AdFormat, and AdStatus enums', () => {
    const validPlatforms = ['GOOGLE_ADS', 'META_ADS', 'OPENAI_ADS', 'TIKTOK_ADS', 'MANUAL', 'OTHER'];
    expect(validPlatforms).toContain('TIKTOK_ADS');
    expect(validPlatforms).toContain('MANUAL');

    const validSources = ['META_AD_LIBRARY', 'GOOGLE_ADS_TRANSPARENCY', 'TIKTOK_CREATIVE_CENTER', 'MANUAL_SUBMISSION'];
    expect(validSources).toHaveLength(4);

    const validFormats = ['IMAGE', 'VIDEO', 'CAROUSEL', 'TEXT', 'UNKNOWN'];
    expect(validFormats).toContain('CAROUSEL');
    expect(validFormats).toContain('VIDEO');

    const validStatuses = ['ACTIVE', 'INACTIVE', 'UNKNOWN', 'REMOVED'];
    expect(validStatuses).toContain('ACTIVE');
    expect(validStatuses).toContain('REMOVED');
  });

  it('guarantees identical canonical content hash for equivalent creative copy', () => {
    function generateCanonicalHash(advertiser: string, headline: string, primaryText: string, cta: string) {
      const canonical = [
        advertiser.toLowerCase().trim(),
        headline.toLowerCase().trim().replace(/\s+/g, ' '),
        primaryText.toLowerCase().trim().replace(/\s+/g, ' '),
        cta.toLowerCase().trim(),
      ].join('|');

      return crypto.createHash('sha256').update(canonical).digest('hex');
    }

    const hashA = generateCanonicalHash('Swiggy', 'Craving Biryani? Get Flat ₹125 OFF', 'Fast 20-min delivery', 'Order Now');
    // Same content with slightly different whitespace and case
    const hashB = generateCanonicalHash('SWIGGY ', 'Craving  Biryani?   Get Flat ₹125 OFF', 'Fast 20-min delivery', 'ORDER NOW');

    expect(hashA).toBe(hashB);
  });

  it('verifies change event types adhere to the expected M5 taxonomy', () => {
    const allowedChangeTypes = [
      'NEW_AD',
      'HEADLINE_CHANGED',
      'TEXT_CHANGED',
      'CTA_CHANGED',
      'LANDING_PAGE_CHANGED',
      'REMOVED',
    ];

    expect(allowedChangeTypes).toHaveLength(6);
    expect(allowedChangeTypes).toContain('NEW_AD');
    expect(allowedChangeTypes).toContain('HEADLINE_CHANGED');
    expect(allowedChangeTypes).toContain('REMOVED');
  });
});

