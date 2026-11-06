import { describe, it, expect } from 'vitest';
import {
  calculateDetailedPromptCost,
  calculateRealisticPlanEconomics,
  GEMINI_3_8_FLASH_PRICING,
} from '../../packages/domain/billing/cost-calculator';

describe('Audited Unit Economics & Cost Calculator', () => {
  it('calculates 100 prompt runs under Gemini 3.8 Flash within free grounding allowance', () => {
    const result = calculateDetailedPromptCost({
      scenarioName: '100 Runs',
      promptCount: 100,
      avgInputTokens: 150,
      avgOutputTokens: 450,
      enableGrounding: true,
      searchQueriesPerPrompt: 1,
      retryBufferPercent: 0,
    });

    expect(result.promptCount).toBe(100);
    expect(result.totalTokens).toBe(60000); // 15k input + 45k output
    // Grounding: 100 queries <= 5000 free monthly
    expect(result.groundingCostUsd).toBe(0);
    expect(result.inferenceCostUsd).toBeCloseTo(0.18, 2);
    expect(result.totalAiCostInr).toBeGreaterThan(0);
  });

  it('charges search grounding overage when queries exceed 5,000 monthly allowance', () => {
    const result = calculateDetailedPromptCost({
      scenarioName: '10,000 Runs',
      promptCount: 10000,
      avgInputTokens: 150,
      avgOutputTokens: 450,
      enableGrounding: true,
      searchQueriesPerPrompt: 1,
      retryBufferPercent: 0,
    });

    // 10,000 queries - 5,000 free = 5,000 billable queries * $14/1k = $70
    expect(result.totalSearchQueries).toBe(10000);
    expect(result.billableSearchQueries).toBe(5000);
    expect(result.groundingCostUsd).toBe(70.0);
    expect(result.totalAiCostUsd).toBeGreaterThan(70.0);
  });

  it('evaluates realistic plan tier economics including all infrastructure line-items', () => {
    const plans = calculateRealisticPlanEconomics(20);

    expect(plans.length).toBe(3);
    const starter = plans.find((p) => p.planTier === 'Starter');
    const pro = plans.find((p) => p.planTier === 'Pro');
    const agency = plans.find((p) => p.planTier === 'Agency');

    expect(starter?.allocatedDatabaseStorageInr).toBeGreaterThan(0);
    expect(starter?.allocatedHostingInr).toBeGreaterThan(0);
    expect(starter?.paymentGatewayFeeInr).toBeGreaterThan(0);

    // Ensure margins are reasonable and positive (not exaggerated 99%)
    expect(starter?.estimatedGrossMarginPercent).toBeGreaterThan(50);
    expect(starter?.estimatedGrossMarginPercent).toBeLessThan(90); // Around 70-80% when including infra!
    expect(agency?.estimatedGrossMarginPercent).toBeGreaterThan(85);
  });
});
