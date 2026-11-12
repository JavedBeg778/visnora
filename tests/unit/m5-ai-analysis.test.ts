// Visnora — M5 12-Dimension AI Creative & Positioning Analysis Unit Tests
// Reference: M5.3 AI Creative & Positioning Analysis

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdAnalysisService } from '../../packages/domain/ad-intelligence';

describe('M5.3 12-Dimension AI Creative Analysis', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    // Isolate unit tests from live external network calls
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (originalKey) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it('analyzes an advertisement across all 12 dimensions', async () => {
    const service = new AdAnalysisService();

    const analysis = await service.analyzeAd({
      adRecordId: 'ad_test_123',
      organizationId: 'org_test_456',
      advertiserName: 'Swiggy',
      headline: 'Craving Biryani? Get Flat ₹125 OFF on your first 3 orders on Swiggy!',
      primaryText: 'Hungry? Lightning-fast 20-min delivery from top-rated restaurants near you.',
      ctaText: 'Order Now',
      format: 'IMAGE',
      landingPageUrl: 'https://www.swiggy.com/restaurants',
    });

    // 12 Dimensions verification
    expect(analysis.mainMessage).toBeDefined();
    expect(analysis.valueProposition).toBeDefined();
    expect(Array.isArray(analysis.painPoints)).toBe(true);
    expect(analysis.painPoints.length).toBeGreaterThan(0);
    expect(Array.isArray(analysis.audienceSignals)).toBe(true);
    expect(['EMOTIONAL', 'RATIONAL', 'BALANCED']).toContain(analysis.emotionalVsRational);
    expect(analysis.positioning).toBeDefined();
    expect(analysis.promotionalStrategy).toBeDefined();
    expect(analysis.offerStrategy).toBeDefined();
    expect(analysis.ctaStrategy).toBeDefined();
    expect(analysis.creativeFormat).toBeDefined();
    expect(analysis.messagingAngle).toBeDefined();
    expect(analysis.landingPageRelevance).toBeDefined();

    // Confidence and accounting
    expect(analysis.confidenceScore).toBeGreaterThanOrEqual(0.7);
    expect(analysis.confidenceScore).toBeLessThanOrEqual(1.0);
    expect(analysis.promptTokens).toBeGreaterThan(0);
    expect(analysis.completionTokens).toBeGreaterThan(0);
    expect(analysis.estimatedCostPaise).toBeGreaterThan(0);
    expect(analysis.model).toBeDefined();
  });

  it('correctly classifies emotional vs rational stance based on copy triggers', async () => {
    const service = new AdAnalysisService();

    const emotionalAnalysis = await service.analyzeAd({
      adRecordId: 'ad_emo',
      organizationId: 'org_test',
      advertiserName: 'Swiggy',
      headline: 'Late night cravings hitting different? Pure food love 🤤🍕',
      primaryText: 'Indulge in delicious desserts and midnight snack heaven.',
      ctaText: 'Order Now',
    });
    expect(emotionalAnalysis.emotionalVsRational).toBe('EMOTIONAL');

    const rationalAnalysis = await service.analyzeAd({
      adRecordId: 'ad_rat',
      organizationId: 'org_test',
      advertiserName: 'Magicpin',
      headline: 'Save 50% discount and flat ₹200 price cut on every order',
      primaryText: 'Calculate your savings and get lowest prices guaranteed.',
      ctaText: 'Get Offer',
    });
    expect(rationalAnalysis.emotionalVsRational).toBe('RATIONAL');
  });

  it('parses structured JSON responses from Gemini AI when API is configured', async () => {
    const service = new AdAnalysisService();
    const mockJson = JSON.stringify({
      mainMessage: 'Fast meal fulfillment',
      valueProposition: '20-min delivery promise',
      painPoints: ['Hunger at work'],
      audienceSignals: ['Busy professionals'],
      emotionalVsRational: 'BALANCED',
      positioning: 'Speed & convenience leader',
      promotionalStrategy: 'First purchase coupon',
      offerStrategy: '₹100 discount coupon',
      ctaStrategy: 'Instant transaction',
      creativeFormat: 'Static banner display',
      messagingAngle: 'Convenience',
      landingPageRelevance: 'Direct link to restaurants',
      confidenceScore: 0.98,
    });

    // Mock gemini adapter prompt response
    (service as any).geminiAdapter = {
      runPrompt: vi.fn().mockResolvedValue({
        rawResponseText: mockJson,
        tokenUsage: { inputTokens: 400, outputTokens: 250 },
      }),
    };
    process.env.GEMINI_API_KEY = 'mock_key_for_test';

    const analysis = await service.analyzeAd({
      adRecordId: 'ad_mock_ai',
      organizationId: 'org_test',
      advertiserName: 'Swiggy',
      headline: 'Order Now',
    });

    expect(analysis.confidenceScore).toBe(0.98);
    expect(analysis.positioning).toBe('Speed & convenience leader');
    expect(analysis.promptTokens).toBe(400);
    expect(analysis.completionTokens).toBe(250);
  });
});
