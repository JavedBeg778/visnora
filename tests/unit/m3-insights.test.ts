import { describe, it, expect } from 'vitest';
import {
  calculateAiVisibilityScore,
  computeDelta,
} from '../../packages/domain/ai-visibility/analytics-service';

describe('M3.3 Intelligence & Mathematical Insights', () => {
  describe('45/25/15/15 AI Visibility Formula Preservation', () => {
    it('calculates perfect 100 score for full presence across all dimensions', () => {
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
      expect(breakdown.formulaNotice).toContain('45% Mention Rate');
    });

    it('calculates zero score when all inputs are zero', () => {
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

    it('correctly weighs partial component values', () => {
      // 50% OMR (22.5) + 40% SSOV (10.0) + 20% Citation (3.0) + 60% Sentiment (9.0) = 44.5
      const breakdown = calculateAiVisibilityScore({
        observedMentionRate: 50,
        sampleShareOfVoice: 40,
        citationRate: 20,
        positiveSentimentRate: 60,
      });

      expect(breakdown.omrComponent).toBe(22.5);
      expect(breakdown.ssovComponent).toBe(10);
      expect(breakdown.citationComponent).toBe(3);
      expect(breakdown.sentimentComponent).toBe(9);
      expect(breakdown.score).toBe(44.5);
    });
  });

  describe('Previous-Period Trend Comparison (computeDelta)', () => {
    it('calculates positive delta and percentage increase correctly', () => {
      const result = computeDelta(80, 50);
      expect(result.current).toBe(80);
      expect(result.previous).toBe(50);
      expect(result.delta).toBe(30);
      expect(result.percentChange).toBe(60); // (80 - 50) / 50 * 100 = 60%
    });

    it('calculates negative delta and percentage decrease correctly', () => {
      const result = computeDelta(40, 50);
      expect(result.current).toBe(40);
      expect(result.previous).toBe(50);
      expect(result.delta).toBe(-10);
      expect(result.percentChange).toBe(-20); // (40 - 50) / 50 * 100 = -20%
    });

    it('safely handles zero denominator without producing NaN or Infinity', () => {
      const result = computeDelta(45, 0);
      expect(result.current).toBe(45);
      expect(result.previous).toBe(0);
      expect(result.delta).toBe(45);
      expect(result.percentChange).toBe(100);
      expect(Number.isFinite(result.percentChange)).toBe(true);
    });

    it('handles zero-to-zero cleanly', () => {
      const result = computeDelta(0, 0);
      expect(result.current).toBe(0);
      expect(result.previous).toBe(0);
      expect(result.delta).toBe(0);
      expect(result.percentChange).toBe(0);
    });
  });

  describe('Prompt Intelligence Classification Logic', () => {
    function classifyPrompt(params: {
      totalRuns: number;
      brandMentions: number;
      compMentions: number;
      negativeSentiment: number;
      mentionRate: number;
    }) {
      const { totalRuns, brandMentions, compMentions, negativeSentiment, mentionRate } = params;
      if (totalRuns === 0 || (brandMentions === 0 && compMentions === 0)) return 'UNSEEN';
      if (brandMentions === 0 && compMentions > 0) return 'COMPETITOR_DOMINATED';
      if (negativeSentiment > 0) return 'AT_RISK';
      if (mentionRate >= 70) return 'HIGH_PERFORMING';
      return 'MODERATE';
    }

    it('classifies unseen prompts when no runs or zero mentions exist', () => {
      expect(classifyPrompt({ totalRuns: 0, brandMentions: 0, compMentions: 0, negativeSentiment: 0, mentionRate: 0 })).toBe('UNSEEN');
    });

    it('classifies competitor-dominated queries when brand is missing and competitor appears', () => {
      expect(classifyPrompt({ totalRuns: 5, brandMentions: 0, compMentions: 4, negativeSentiment: 0, mentionRate: 0 })).toBe('COMPETITOR_DOMINATED');
    });

    it('classifies at-risk prompts when negative sentiment is observed', () => {
      expect(classifyPrompt({ totalRuns: 5, brandMentions: 3, compMentions: 2, negativeSentiment: 1, mentionRate: 60 })).toBe('AT_RISK');
    });

    it('classifies high-performing prompts when mention rate is >= 70% with no critical sentiment', () => {
      expect(classifyPrompt({ totalRuns: 10, brandMentions: 8, compMentions: 2, negativeSentiment: 0, mentionRate: 80 })).toBe('HIGH_PERFORMING');
    });
  });
});

