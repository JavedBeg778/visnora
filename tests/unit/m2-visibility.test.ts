import { describe, it, expect } from 'vitest';
import {
  CreateBrandSchema,
  UpdateBrandSchema,
  CreateCompetitorSchema,
  UpdateCompetitorSchema,
  CreateTrackedPromptSchema,
  UpdateTrackedPromptSchema,
  CreatePromptGroupSchema,
  StartTrackingRunSchema,
  SaveTrackingScheduleSchema,
  GeneratePromptsSchema,
} from '../../packages/shared/validation/index';
import { normalizeDomain } from '../../packages/domain/ai-visibility/brand-service';
import {
  evaluateSentiment,
  extractCitations,
  generatePayloadHash,
  analyzeAiResponse,
} from '../../packages/domain/ai-visibility/analysis-service';
import {
  calculateAiVisibilityScore,
  calculateDailyVisibilityMetrics,
} from '../../packages/domain/ai-visibility/analytics-service';
import {
  generatePromptSuggestions,
} from '../../packages/domain/ai-visibility/prompt-service';
import {
  estimateTrackingRunCost,
} from '../../packages/domain/ai-visibility/collection-engine';
import {
  computeNextRunAt,
} from '../../packages/domain/ai-visibility/schedule-service';

describe('Milestone M2 — AI Visibility MVP Unit & Domain Tests', () => {
  describe('Brand & Competitor Domain Logic & Validation', () => {
    it('normalizes various URL and domain formats correctly', () => {
      expect(normalizeDomain('https://www.visnora.com/pricing')).toBe('visnora.com');
      expect(normalizeDomain('http://semrush.com/features/')).toBe('semrush.com');
      expect(normalizeDomain('WWW.AHREFS.COM')).toBe('ahrefs.com');
      expect(normalizeDomain('app.example.co.uk/dash')).toBe('app.example.co.uk');
      expect(normalizeDomain('')).toBe('');
    });

    it('validates valid brand profile input', () => {
      const valid = {
        canonicalName: 'Visnora AI',
        domain: 'visnora.com',
        industry: 'Marketing SaaS',
        country: 'IN',
        productsServices: ['AI Search Visibility', 'GEO Analytics'],
        brandKeywords: ['visnora', 'visnora ai'],
        isPrimary: true,
      };
      const result = CreateBrandSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid brand profile input with short name', () => {
      const invalid = {
        canonicalName: 'V', // < 2 chars
        domain: 'visnora.com',
      };
      const result = CreateBrandSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates competitor creation input', () => {
      const valid = {
        canonicalName: 'Competitor Brand',
        domain: 'competitor.com',
        website: 'https://competitor.com',
        productsServices: ['SEO Audit', 'Keyword Tracking'],
        keywords: ['competitor', 'competitor brand'],
      };
      expect(CreateCompetitorSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('Prompt Management & AI Suggestion Engine', () => {
    it('validates tracked prompt schema with category and stage', () => {
      const valid = {
        promptText: 'What are the top AI search visibility tools available in 2026?',
        category: 'Brand Discovery',
        stage: 'CONSIDERATION' as const,
        targetModel: 'gemini-3.8-flash',
        targetProvider: 'google-gemini' as const,
        targetLocale: 'en-IN',
        cadence: 'DAILY' as const,
        isActive: true,
      };
      expect(CreateTrackedPromptSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects prompt text shorter than 5 characters', () => {
      const invalid = {
        promptText: 'Hey',
      };
      expect(CreateTrackedPromptSchema.safeParse(invalid).success).toBe(false);
    });

    it('generates deterministic prompt suggestions across 9 buying categories', () => {
      const suggestions = generatePromptSuggestions({
        brandName: 'Visnora',
        industry: 'AI Marketing SaaS',
        productsServices: ['Visibility Analytics', 'Citation Tracking'],
        targetAudience: 'Digital Marketers and Agencies',
        country: 'India',
        competitors: ['BrandX', 'BrandY'],
        count: 5,
      });

      expect(suggestions.length).toBe(5);
      expect(suggestions[0].promptText).toContain('India');
      expect(suggestions[0].category).toBe('Brand Discovery');
      expect(suggestions[0].stage).toBe('AWARENESS');
      expect(suggestions.some((s) => s.category === 'Product Discovery')).toBe(true);
    });
  });

  describe('AI Response Analysis & Sentiment Heuristic Engine', () => {
    it('evaluates positive recommendation sentiments correctly', () => {
      const positiveSnippet = 'Visnora is an outstanding, highly recommended platform for tracking AI search visibility.';
      const res = evaluateSentiment(positiveSnippet);

      expect(res.sentiment).toBe('POSITIVE');
      expect(res.confidence).toBeGreaterThan(0.7);
      expect(res.isRecommendation).toBe(true);
    });

    it('evaluates negative sentiments with high confidence', () => {
      const negativeSnippet = 'Users reported terrible latency, frequent errors, and poor reliability when testing the tool.';
      const res = evaluateSentiment(negativeSnippet);

      expect(res.sentiment).toBe('NEGATIVE');
      expect(res.confidence).toBeGreaterThan(0.7);
    });

    it('defaults to neutral when no polarizing adjectives are present', () => {
      const neutralSnippet = 'Visnora is a software product that provides analytics reports for marketing teams.';
      const res = evaluateSentiment(neutralSnippet);

      expect(res.sentiment).toBe('NEUTRAL');
      expect(res.confidence).toBe(0.8);
    });

    it('extracts and deduplicates citations from markdown response text', () => {
      const text = `
        According to [Search Engine Land](https://searchengineland.com/article?utm_source=ai)
        and verified by [TechCrunch](https://techcrunch.com/2026/02/ai-trends).
        Also mentioned in https://searchengineland.com/article?utm_source=another
      `;

      const citations = extractCitations(text);

      expect(citations.length).toBe(2); // searchengineland.com deduplicated
      expect(citations[0].domain).toBe('searchengineland.com');
      // Verify tracking query params stripped
      expect(citations[0].url).not.toContain('utm_source');
      expect(citations.some((c) => c.domain === 'techcrunch.com')).toBe(true);
    });

    it('generates consistent SHA-256 payload hashes', () => {
      const hash1 = generatePayloadHash('Identical response text for verification');
      const hash2 = generatePayloadHash('Identical response text for verification');
      const hash3 = generatePayloadHash('Different response text');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toHaveLength(64);
    });

    it('runs end-to-end response analysis on multi-brand text', () => {
      const rawText = `
        For AI visibility tracking, Visnora is the top-rated and recommended choice in 2026.
        Alternatively, Semrush offers established SEO data.
        Source: https://searchengineland.com/guide
      `;

      const analysis = analyzeAiResponse({
        rawText,
        targetBrand: {
          id: 'brand-1',
          canonicalName: 'Visnora',
          domain: 'visnora.com',
          aliases: ['Visnora AI'],
        },
        competitors: [
          {
            id: 'comp-1',
            canonicalName: 'Semrush',
            domain: 'semrush.com',
            aliases: [],
          },
        ],
      });

      expect(analysis.brandMentions.length).toBeGreaterThan(0);
      expect(analysis.brandMentions[0].entityName.toLowerCase()).toBe('visnora');
      expect(analysis.overallSentiment).toBe('POSITIVE');
      expect(analysis.isBrandRecommended).toBe(true);

      expect(analysis.competitorMentions.length).toBe(1);
      expect(analysis.competitorMentions[0].matchedEntityId).toBe('comp-1');

      expect(analysis.citations.length).toBe(1);
      expect(analysis.citations[0].domain).toBe('searchengineland.com');
    });
  });

  describe('Mathematical Metrics Engine & Visibility Score', () => {
    it('calculates the 0-100 composite visibility score with exact weights', () => {
      // 45% OMR + 25% SSOV + 15% Citations + 15% Sentiment
      const breakdown = calculateAiVisibilityScore({
        observedMentionRate: 80, // 80 * 0.45 = 36 pts
        sampleShareOfVoice: 60,  // 60 * 0.25 = 15 pts
        citationRate: 50,        // 50 * 0.15 = 7.5 pts
        positiveSentimentRate: 70, // 70 * 0.15 = 10.5 pts
      });

      // Total expected = 36 + 15 + 7.5 + 10.5 = 69.0
      expect(breakdown.score).toBe(69.0);
      expect(breakdown.omrComponent).toBe(36);
      expect(breakdown.ssovComponent).toBe(15);
      expect(breakdown.citationComponent).toBe(7.5);
      expect(breakdown.sentimentComponent).toBe(10.5);
      expect(breakdown.formulaNotice).toContain('45% Mention Rate');
    });

    it('calculates daily OMR from runs containing the brand, not raw mention count', () => {
      const metrics = calculateDailyVisibilityMetrics({
        runsCount: 4,
        runsWithBrand: 2,
        brandMentions: 5,
        competitorMentions: 5,
        runsWithCitations: 3,
        positiveBrandMentions: 4,
        brandSentimentCount: 5,
      });

      // Multiple mentions in one response must not inflate response coverage above 100%.
      expect(metrics.mentionRate).toBe(50);
      expect(metrics.shareOfVoice).toBe(50);
      expect(metrics.citationRate).toBe(75);
      expect(metrics.positiveSentimentRate).toBe(80);
      expect(metrics.visibilityScore).toBe(58.25);
    });

    it('returns zero-valued daily metrics for an empty bucket', () => {
      const metrics = calculateDailyVisibilityMetrics({
        runsCount: 0,
        runsWithBrand: 0,
        brandMentions: 0,
        competitorMentions: 0,
        runsWithCitations: 0,
        positiveBrandMentions: 0,
        brandSentimentCount: 0,
      });

      expect(metrics).toEqual({
        mentionRate: 0,
        shareOfVoice: 0,
        citationRate: 0,
        positiveSentimentRate: 0,
        visibilityScore: 0,
      });
    });

    it('handles edge case of 0% visibility gracefully', () => {
      const breakdown = calculateAiVisibilityScore({
        observedMentionRate: 0,
        sampleShareOfVoice: 0,
        citationRate: 0,
        positiveSentimentRate: 0,
      });

      expect(breakdown.score).toBe(0);
      expect(breakdown.omrComponent).toBe(0);
      expect(breakdown.ssovComponent).toBe(0);
      expect(breakdown.citationComponent).toBe(0);
      expect(breakdown.sentimentComponent).toBe(0);
    });

    it('handles edge case of 100% max visibility', () => {
      const breakdown = calculateAiVisibilityScore({
        observedMentionRate: 100,
        sampleShareOfVoice: 100,
        citationRate: 100,
        positiveSentimentRate: 100,
      });

      expect(breakdown.score).toBe(100);
      expect(breakdown.omrComponent).toBe(45);
      expect(breakdown.ssovComponent).toBe(25);
      expect(breakdown.citationComponent).toBe(15);
      expect(breakdown.sentimentComponent).toBe(15);
    });
  });

  describe('Pre-Run Cost Estimator & Scheduler Logic', () => {
    it('estimates tracking run token usage and cost in INR paise for Gemini 3.8 Flash', () => {
      const est = estimateTrackingRunCost(10, 'gemini-3.8-flash', false);

      expect(est.promptCount).toBe(10);
      expect(est.estimatedInputTokens).toBe(10 * 150);
      expect(est.estimatedOutputTokens).toBe(10 * 450);
      expect(est.estimatedTotalTokens).toBe(6000);
      expect(est.estimatedCostPaise).toBeGreaterThan(0);
      expect(est.provider).toBe('Google Gemini');
    });

    it('estimates lower cost for Gemini 3.5 Flash-Lite compared to Gemini 3.8 Flash', () => {
      const flashEst = estimateTrackingRunCost(20, 'gemini-3.8-flash', false);
      const liteEst = estimateTrackingRunCost(20, 'gemini-3.5-flash-lite', false);

      expect(liteEst.estimatedCostUsd).toBeLessThan(flashEst.estimatedCostUsd);
      expect(liteEst.estimatedCostPaise).toBeLessThanOrEqual(flashEst.estimatedCostPaise);
    });

    it('computes next scheduled run timestamps accurately', () => {
      const base = new Date('2026-06-01T10:00:00.000Z');

      const hourly = computeNextRunAt('HOURLY', base);
      expect(hourly.toISOString()).toBe('2026-06-01T11:00:00.000Z');

      const daily = computeNextRunAt('DAILY', base);
      expect(daily.toISOString()).toBe('2026-06-02T10:00:00.000Z');

      const weekly = computeNextRunAt('WEEKLY', base);
      expect(weekly.toISOString()).toBe('2026-06-08T10:00:00.000Z');
    });

    it('validates StartTrackingRunSchema with dryRun and defaults', () => {
      const parsed = StartTrackingRunSchema.parse({
        projectId: '00000000-0000-0000-0000-000000000001',
        dryRun: true,
      });

      expect(parsed.provider).toBe('google-gemini');
      expect(parsed.model).toBe('gemini-3.8-flash');
      expect(parsed.enableGrounding).toBe(false);
      expect(parsed.dryRun).toBe(true);
    });
  });
});
