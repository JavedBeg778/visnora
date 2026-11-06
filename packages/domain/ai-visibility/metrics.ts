// Visnora — AI Visibility Mathematical Metric Calculators
// Reference: docs/DATA_METHODOLOGY.md

export interface BatchRunEvaluationItem {
  promptId: string;
  hasTargetBrand: boolean;
  targetBrandMentionsCount: number;
  competitorMentionsCount: number;
  citationsCount: number;
  averagePosition: number | null;
}

export interface ComprehensiveVisibilityMetrics {
  totalRunsEvaluated: number;
  successfulRunsCount: number;
  failedRunsCount: number;
  brandMentionRate: number; // OMR (Percentage: 0 - 100)
  competitorMentionRate: number; // Percentage: 0 - 100
  sampleShareOfVoice: number; // SSOV (Percentage: 0 - 100)
  totalBrandMentions: number;
  totalCompetitorMentions: number;
  averageCitationsPerResponse: number;
  averageMentionPosition: number | null;
  methodologyNotice: string;
  samplingDisclaimer: string;
}

/**
 * Observed Mention Rate (OMR):
 * Percentage of successful prompt responses containing at least one detected brand mention.
 * OMR = (successful responses with brand / total successful responses) * 100
 */
export function calculateObservedMentionRate(
  successfulRunsWithBrand: number,
  totalSuccessfulRuns: number
): number {
  if (totalSuccessfulRuns <= 0) return 0.0;
  const rate = (successfulRunsWithBrand / totalSuccessfulRuns) * 100;
  return Number(rate.toFixed(2));
}

/**
 * Competitor Mention Rate:
 * Percentage of successful prompt responses containing at least one competitor mention.
 */
export function calculateCompetitorMentionRate(
  successfulRunsWithCompetitor: number,
  totalSuccessfulRuns: number
): number {
  if (totalSuccessfulRuns <= 0) return 0.0;
  const rate = (successfulRunsWithCompetitor / totalSuccessfulRuns) * 100;
  return Number(rate.toFixed(2));
}

/**
 * Sample Share of Voice (SSOV):
 * Relative proportion of target brand mentions compared to all brand and competitor mentions
 * strictly across the sampled prompt runs.
 * SSOV = (brand mentions / (brand mentions + total competitor mentions)) * 100
 */
export function calculateSampleShareOfVoice(
  brandMentionsCount: number,
  competitorMentionsCount: number
): { ssov: number; denominator: number; notice: string } {
  const denominator = brandMentionsCount + competitorMentionsCount;
  if (denominator <= 0) {
    return {
      ssov: 0.0,
      denominator: 0,
      notice: 'No mentions detected in the selected sample.',
    };
  }

  const ssov = Number(((brandMentionsCount / denominator) * 100).toFixed(2));
  const notice = `Based on ${brandMentionsCount} brand mentions out of ${denominator} total brand and competitor mentions across the evaluated sample.`;

  return {
    ssov,
    denominator,
    notice,
  };
}

/**
 * Prompt Coverage (PC):
 * Percentage of active tracked prompts that executed at least one successful run in the period.
 * PC = (executed active prompts / total active prompts) * 100
 */
export function calculatePromptCoverage(
  executedActivePrompts: number,
  totalActivePrompts: number
): number {
  if (totalActivePrompts <= 0) return 0.0;
  const coverage = (executedActivePrompts / totalActivePrompts) * 100;
  return Number(coverage.toFixed(2));
}

/**
 * Average Mention Position (AMP):
 * Arithmetic mean of numerical rank positions across responses with structured lists.
 * Returns null if no structured list positions are measurable.
 */
export function calculateAveragePosition(positions: number[]): number | null {
  if (!positions || positions.length === 0) return null;
  const sum = positions.reduce((acc, pos) => acc + pos, 0);
  return Number((sum / positions.length).toFixed(2));
}

/**
 * Computes comprehensive visibility metrics across an entire evaluated benchmark batch.
 * Accurately accounts for attempted, successful, and failed runs.
 * Keeps failed responses strictly out of OMR, CMR, SSOV, and citation averages.
 */
export function calculateBatchVisibilitySummary(
  items: BatchRunEvaluationItem[],
  totalActivePromptsCount: number
): ComprehensiveVisibilityMetrics {
  const successfulCount = items.length;
  const attemptedCount = Math.max(totalActivePromptsCount, successfulCount);
  const failedCount = attemptedCount - successfulCount;

  if (successfulCount === 0) {
    return {
      totalRunsEvaluated: attemptedCount,
      successfulRunsCount: 0,
      failedRunsCount: failedCount,
      brandMentionRate: 0,
      competitorMentionRate: 0,
      sampleShareOfVoice: 0,
      totalBrandMentions: 0,
      totalCompetitorMentions: 0,
      averageCitationsPerResponse: 0,
      averageMentionPosition: null,
      methodologyNotice:
        failedCount > 0
          ? `All ${failedCount} attempted prompt runs failed. No successful responses to evaluate.`
          : 'No responses evaluated in this batch.',
      samplingDisclaimer:
        'Truth-in-Reporting: These metrics represent sampled AI responses across a defined benchmark dataset. They do not represent total consumer AI search volume, global search impressions, or guaranteed rankings.',
    };
  }

  const runsWithBrand = items.filter((i) => i.hasTargetBrand).length;
  const runsWithCompetitor = items.filter((i) => i.competitorMentionsCount > 0).length;
  const totalBrandMentions = items.reduce((acc, i) => acc + i.targetBrandMentionsCount, 0);
  const totalCompetitorMentions = items.reduce((acc, i) => acc + i.competitorMentionsCount, 0);
  const totalCitations = items.reduce((acc, i) => acc + i.citationsCount, 0);

  const validPositions = items
    .map((i) => i.averagePosition)
    .filter((p): p is number => p !== null);

  // Ratios are computed strictly across successful responses
  const omr = calculateObservedMentionRate(runsWithBrand, successfulCount);
  const cmr = calculateCompetitorMentionRate(runsWithCompetitor, successfulCount);
  const { ssov, notice } = calculateSampleShareOfVoice(totalBrandMentions, totalCompetitorMentions);
  const avgPos = calculateAveragePosition(validPositions);
  const avgCitations = Number((totalCitations / successfulCount).toFixed(2));

  return {
    totalRunsEvaluated: attemptedCount,
    successfulRunsCount: successfulCount,
    failedRunsCount: failedCount,
    brandMentionRate: omr,
    competitorMentionRate: cmr,
    sampleShareOfVoice: ssov,
    totalBrandMentions,
    totalCompetitorMentions,
    averageCitationsPerResponse: avgCitations,
    averageMentionPosition: avgPos,
    methodologyNotice: notice,
    samplingDisclaimer:
      'Truth-in-Reporting: These metrics represent sampled AI responses across a defined benchmark dataset. They do not represent total consumer AI search volume, global search impressions, or guaranteed rankings.',
  };
}
