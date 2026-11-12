import { describe, it, expect } from 'vitest';
import regressionData from '../fixtures/intelligence-regression.json';
import { extractMentions } from '../../packages/domain/ai-visibility/extractor';
import { extractCitations, normalizeUrl, associateCitations } from '../../packages/domain/ai-visibility/citation-extractor';
import { analyzeAiResponse, evaluateSentiment } from '../../packages/domain/ai-visibility/analysis-service';
import { BrandEntity } from '../../packages/domain/ai-visibility/types';

describe('M3.1 Intelligence Quality — Regression Test Suite', () => {
  const targetBrand: BrandEntity = regressionData.targetBrand;
  const competitors: BrandEntity[] = regressionData.competitors;

  describe('Brand & Alias Mention Extraction', () => {
    it('detects primary brand and competitor mentions with aliases', () => {
      const c = regressionData.cases.find((x) => x.id === 'case-exact-and-alias')!;
      const mentions = extractMentions(c.text!, targetBrand, competitors);

      expect(mentions.length).toBeGreaterThanOrEqual(2);

      const zomatoMention = mentions.find((m) => m.entityName === 'Zomato');
      expect(zomatoMention).toBeDefined();
      expect(zomatoMention?.isPrimaryBrand).toBe(true);
      expect(zomatoMention?.confidenceTier).toBe('HIGH');
      expect(zomatoMention?.detectionMethod).toBe('EXACT_NAME');

      const swiggyMention = mentions.find((m) => m.entityName === 'Swiggy');
      expect(swiggyMention).toBeDefined();
      expect(swiggyMention?.isPrimaryBrand).toBe(false);
      expect(swiggyMention?.confidenceTier).toBe('HIGH');
    });

    it('suppresses false positives on common ambiguous dictionary words', () => {
      const c = regressionData.cases.find((x) => x.id === 'case-ambiguous-words-suppression')!;
      const mentions = extractMentions(c.text!, targetBrand, competitors);

      // "sure", "eat", "pin", "apple" should not match EatSure, Magicpin, etc.
      expect(mentions.length).toBe(0);
    });

    it('detects compound brands correctly despite containing dictionary words', () => {
      const c = regressionData.cases.find((x) => x.id === 'case-compound-brand-detection')!;
      const mentions = extractMentions(c.text!, targetBrand, competitors);

      const eatSure = mentions.find((m) => m.entityName === 'EatSure');
      expect(eatSure).toBeDefined();
      expect(eatSure?.isPrimaryBrand).toBe(false);

      const magicpin = mentions.find((m) => m.entityName === 'Magicpin');
      expect(magicpin).toBeDefined();
      expect(magicpin?.isPrimaryBrand).toBe(false);
    });
  });

  describe('Sentiment & Negation Handling', () => {
    it('accurately flips negated recommendations and negated positive adjectives to NEGATIVE', () => {
      const c = regressionData.cases.find((x) => x.id === 'case-negated-sentiment')!;
      const evaluation = evaluateSentiment(c.text!);

      expect(evaluation.sentiment).toBe('NEGATIVE');
      expect(evaluation.isRecommendation).toBe(false);
      expect(evaluation.analysisMethod).toBe('DETERMINISTIC_HEURISTIC');
    });

    it('detects strongly positive sentiment with praise and recommendations', () => {
      const c = regressionData.cases.find((x) => x.id === 'case-positive-sentiment')!;
      const evaluation = evaluateSentiment(c.text!);

      expect(evaluation.sentiment).toBe('POSITIVE');
      expect(evaluation.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('detects comparison language between brands', () => {
      const c = regressionData.cases.find((x) => x.id === 'case-comparison-sentiment')!;
      const evaluation = evaluateSentiment(c.text!);

      expect(evaluation.isComparison).toBe(true);
      expect(evaluation.sentiment).toBe('MIXED');
    });

    it('suppresses negative sentiment when negative words are negated', () => {
      const text = 'Zomato is not expensive and has no drawbacks for typical orders.';
      const evaluation = evaluateSentiment(text);

      // Negated "expensive" and negated "drawbacks" should NOT produce NEGATIVE
      expect(evaluation.sentiment).not.toBe('NEGATIVE');
    });
  });

  describe('Citation Extraction, Normalization & Association', () => {
    it('normalizes URLs by removing tracking params, hash fragments, and default ports', () => {
      const url1 = normalizeUrl('https://www.zomato.com/order?utm_source=google&utm_medium=cpc&gclid=12345&campaign_id=987#menu');
      expect(url1).not.toBeNull();
      expect(url1?.domain).toBe('zomato.com');
      expect(url1?.cleanUrl).toBe('https://zomato.com/order');

      const url2 = normalizeUrl('https://swiggy.com/restaurants?ref=affiliate&_ga=1.2.3&yclid=998877');
      expect(url2).not.toBeNull();
      expect(url2?.domain).toBe('swiggy.com');
      expect(url2?.cleanUrl).toBe('https://swiggy.com/restaurants');
    });

    it('rejects unsafe and malformed URLs', () => {
      expect(normalizeUrl('javascript:alert(1)')).toBeNull();
      expect(normalizeUrl('data:text/html,test')).toBeNull();
      expect(normalizeUrl('not-a-valid-url')).toBeNull();
    });

    it('associates citations with target brand, competitor, or third party', () => {
      const rawCitations = [
        { url: 'https://zomato.com/about', domain: 'zomato.com', order: 1 },
        { url: 'https://swiggy.com/press', domain: 'swiggy.com', order: 2 },
        { url: 'https://techcrunch.com/article', domain: 'techcrunch.com', order: 3 },
      ];

      const associated = associateCitations(rawCitations, targetBrand, competitors);
      expect(associated[0].association).toBe('PRIMARY_BRAND');
      expect(associated[0].associatedEntityId).toBe(targetBrand.id);

      expect(associated[1].association).toBe('COMPETITOR');
      expect(associated[1].associatedEntityId).toBe('comp-swiggy');

      expect(associated[2].association).toBe('THIRD_PARTY');
      expect(associated[2].associatedEntityId).toBeUndefined();
    });
  });

  describe('End-to-End Analysis Pipeline Output', () => {
    it('produces comprehensive analysis output with all M3.1 enhancements', () => {
      const sampleText = `
Top food delivery apps in India:
1. Zomato — Highly recommended for wide restaurant selection and Zomato Gold perks.
2. Swiggy — Excellent for lightning fast delivery via Instamart.
3. EatSure — Good choice for multi-restaurant ordering.

Sources:
- https://zomato.com/overview?utm_source=ai_test
- https://swiggy.com/offers
      `;

      const analysis = analyzeAiResponse({
        rawText: sampleText,
        targetBrand,
        competitors,
      });

      expect(analysis.payloadHash).toBeDefined();
      expect(analysis.brandMentions.length).toBeGreaterThan(0);
      expect(analysis.brandMentions[0].entityName).toBe('Zomato');
      expect(analysis.brandMentions[0].isPrimaryBrand).toBe(true);
      expect(analysis.brandMentions[0].confidenceTier).toBe('HIGH');
      expect(analysis.brandMentions[0].listPosition).toBe(1);

      expect(analysis.competitorMentions.length).toBeGreaterThanOrEqual(2);
      expect(analysis.isBrandRecommended).toBe(true);
      expect(analysis.bestBrandPosition).toBe(1);

      expect(analysis.citations.length).toBe(2);
      const brandCit = analysis.citations.find((c) => c.domain === 'zomato.com');
      expect(brandCit?.association).toBe('PRIMARY_BRAND');
      expect(brandCit?.url).toBe('https://zomato.com/overview');
    });
  });
});
