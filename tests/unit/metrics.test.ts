import { describe, it, expect } from 'vitest';
import {
  calculateObservedMentionRate,
  calculateSampleShareOfVoice,
  calculatePromptCoverage,
  calculateAveragePosition,
  calculateBatchVisibilitySummary,
  BatchRunEvaluationItem,
} from '../../packages/domain/ai-visibility/metrics';

describe('AI Visibility Metric Calculations', () => {
  it('calculates Observed Mention Rate (OMR) accurately', () => {
    expect(calculateObservedMentionRate(15, 20)).toBe(75.0);
    expect(calculateObservedMentionRate(0, 10)).toBe(0.0);
    expect(calculateObservedMentionRate(10, 0)).toBe(0.0);
    expect(calculateObservedMentionRate(1, 3)).toBe(33.33);
  });

  it('calculates Sample Share of Voice (SSOV) and provides explicit denominator notice', () => {
    const result = calculateSampleShareOfVoice(20, 30);
    expect(result.ssov).toBe(40.0);
    expect(result.denominator).toBe(50);
    expect(result.notice).toContain('Based on 20 brand mentions out of 50 total brand and competitor mentions');

    const empty = calculateSampleShareOfVoice(0, 0);
    expect(empty.ssov).toBe(0.0);
    expect(empty.denominator).toBe(0);
  });

  it('calculates Prompt Coverage (PC) accurately', () => {
    expect(calculatePromptCoverage(8, 10)).toBe(80.0);
    expect(calculatePromptCoverage(0, 5)).toBe(0.0);
    expect(calculatePromptCoverage(5, 0)).toBe(0.0);
  });

  it('calculates Average Mention Position (AMP) and handles empty arrays', () => {
    expect(calculateAveragePosition([1, 2, 3])).toBe(2.0);
    expect(calculateAveragePosition([1, 1, 2])).toBe(1.33);
    expect(calculateAveragePosition([])).toBeNull();
  });

  it('calculates batch visibility summary with accurate failure accounting', () => {
    // Case 1: All 3 failed (0 successful)
    const allFailed = calculateBatchVisibilitySummary([], 3);
    expect(allFailed.totalRunsEvaluated).toBe(3);
    expect(allFailed.successfulRunsCount).toBe(0);
    expect(allFailed.failedRunsCount).toBe(3);
    expect(allFailed.brandMentionRate).toBe(0);
    expect(allFailed.sampleShareOfVoice).toBe(0);
    expect(allFailed.totalRunsEvaluated).toBe(allFailed.successfulRunsCount + allFailed.failedRunsCount);

    // Case 2: 1 successful, 2 failed
    const sampleItem: BatchRunEvaluationItem = {
      promptId: 'P-1',
      hasTargetBrand: true,
      targetBrandMentionsCount: 2,
      competitorMentionsCount: 3,
      citationsCount: 4,
      averagePosition: 1.5,
    };
    const mixed = calculateBatchVisibilitySummary([sampleItem], 3);
    expect(mixed.totalRunsEvaluated).toBe(3);
    expect(mixed.successfulRunsCount).toBe(1);
    expect(mixed.failedRunsCount).toBe(2);
    expect(mixed.totalRunsEvaluated).toBe(mixed.successfulRunsCount + mixed.failedRunsCount);
    // OMR must be based strictly on 1 successful run -> 100%
    expect(mixed.brandMentionRate).toBe(100.0);
    // SSOV: 2 brand mentions / 5 total mentions -> 40%
    expect(mixed.sampleShareOfVoice).toBe(40.0);
    expect(mixed.averageCitationsPerResponse).toBe(4.0);

    // Case 3: All 3 successful
    const allSuccess = calculateBatchVisibilitySummary([sampleItem, sampleItem, sampleItem], 3);
    expect(allSuccess.totalRunsEvaluated).toBe(3);
    expect(allSuccess.successfulRunsCount).toBe(3);
    expect(allSuccess.failedRunsCount).toBe(0);
    expect(allSuccess.totalRunsEvaluated).toBe(allSuccess.successfulRunsCount + allSuccess.failedRunsCount);
  });
});


