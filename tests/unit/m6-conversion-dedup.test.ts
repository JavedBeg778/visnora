// Visnora — M6 Conversion Deduplication & Pixel Generation Unit Tests

import { describe, it, expect } from 'vitest';
import {
  hashIdentifier,
  computeDeduplicationId,
  generatePixelSnippet,
} from '../../packages/domain/chatgpt-ads/conversion-service';

describe('M6 Conversion Tracking & Deduplication Engine', () => {
  it('correctly hashes user identifiers using lowercase trimmed SHA-256', () => {
    const rawEmail1 = 'Customer@Example.COM  ';
    const rawEmail2 = 'customer@example.com';

    const hash1 = hashIdentifier(rawEmail1);
    const hash2 = hashIdentifier(rawEmail2);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
  });

  it('guarantees identical deduplicationId for identical order and event', () => {
    const time = new Date('2026-11-12T10:00:00Z');
    const userHash = hashIdentifier('buyer@test.com');

    const dedup1 = computeDeduplicationId({
      eventName: 'PURCHASE',
      userHash,
      orderId: 'ORDER_109283',
      eventTime: time,
    });

    const dedup2 = computeDeduplicationId({
      eventName: 'PURCHASE',
      userHash,
      orderId: 'ORDER_109283',
      eventTime: time,
    });

    expect(dedup1).toBe(dedup2);
    expect(dedup1).toHaveLength(64);
  });

  it('generates distinct deduplicationId for different orders or event types', () => {
    const time = new Date('2026-11-12T10:00:00Z');
    const userHash = hashIdentifier('buyer@test.com');

    const dedupOrder1 = computeDeduplicationId({
      eventName: 'PURCHASE',
      userHash,
      orderId: 'ORDER_1',
      eventTime: time,
    });

    const dedupOrder2 = computeDeduplicationId({
      eventName: 'PURCHASE',
      userHash,
      orderId: 'ORDER_2',
      eventTime: time,
    });

    const dedupSignup = computeDeduplicationId({
      eventName: 'SIGN_UP',
      userHash,
      orderId: 'ORDER_1',
      eventTime: time,
    });

    expect(dedupOrder1).not.toBe(dedupOrder2);
    expect(dedupOrder1).not.toBe(dedupSignup);
  });

  it('generates valid Measurement Pixel snippet with initialization parameters', () => {
    const orgId = '293e8995-0113-480e-a062-26008ee8af21';
    const accountId = 'act_998877';

    const snippet = generatePixelSnippet({
      organizationId: orgId,
      accountId,
      appBaseUrl: 'https://visnora.vercel.app',
    });

    expect(snippet).toContain('Visnora ChatGPT Ads Measurement Pixel');
    expect(snippet).toContain(orgId);
    expect(snippet).toContain(accountId);
    expect(snippet).toContain("visnoraAds('track', 'PageView')");
    expect(snippet).toContain('sdk/visnora-ads-pixel.js');
  });
});

