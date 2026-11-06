// Visnora — Comprehensive Unit Economics & AI Inference Cost Calculator
// Baseline Date: 4 November 2026 | Currency: USD ($) & INR (₹)
// Reference: https://ai.google.dev/gemini-api/docs/pricing & docs/M0_UNIT_ECONOMICS.md

export const USD_TO_INR_EXCHANGE_RATE = 87.0; // Baseline: 4 November 2026
export const EXCHANGE_RATE_TIMESTAMP = '2026-11-04T21:42:09+05:30';

export interface ModelPricingTier {
  modelId: string;
  provider: string;
  inputCostPer1MUsd: number;
  outputCostPer1MUsd: number;
  groundingCostPer1KQueriesUsd: number;
  freeGroundingQueriesMonthly: number;
  dailyQueryCap: number;
  pricingNotes: string;
}

// Current Official Pricing for Gemini 3+ Generation (Google AI Studio Developer API)
export const GEMINI_3_8_FLASH_PRICING: ModelPricingTier = {
  modelId: 'gemini-3.8-flash',
  provider: 'Google Gemini',
  inputCostPer1MUsd: 0.75, // Introductory rate through Dec 31, 2026 ($1.50 standard thereafter)
  outputCostPer1MUsd: 3.75, // Including reasoning/thinking tokens ($7.50 standard thereafter)
  groundingCostPer1KQueriesUsd: 14.0, // $14.00 per 1,000 search queries
  freeGroundingQueriesMonthly: 5000, // 5,000 free search queries per month per project
  dailyQueryCap: 1500, // Default 1,500 requests/day cap on paid tier
  pricingNotes: 'Current standard workhorse model. Retrieved grounding text context is not charged as input tokens.',
};

export const GEMINI_3_5_FLASH_LITE_PRICING: ModelPricingTier = {
  modelId: 'gemini-3.5-flash-lite',
  provider: 'Google Gemini',
  inputCostPer1MUsd: 0.30,
  outputCostPer1MUsd: 2.50,
  groundingCostPer1KQueriesUsd: 14.0,
  freeGroundingQueriesMonthly: 5000,
  dailyQueryCap: 1500,
  pricingNotes: 'Ultra-budget high-scale model for high-frequency prompt monitoring.',
};

export interface PromptExecutionScenario {
  scenarioName: string;
  promptCount: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  enableGrounding: boolean;
  searchQueriesPerPrompt: number;
  retryBufferPercent: number;
}

export interface DetailedCostBreakdown {
  scenarioName: string;
  promptCount: number;
  totalSearchQueries: number;
  billableSearchQueries: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  inferenceCostUsd: number;
  groundingCostUsd: number;
  retryBufferCostUsd: number;
  totalAiCostUsd: number;
  totalAiCostInr: number;
  costPerPromptInr: number;
}

/**
 * Computes AI inference and search grounding costs under specified parameters.
 */
export function calculateDetailedPromptCost(
  scenario: PromptExecutionScenario,
  modelPricing: ModelPricingTier = GEMINI_3_8_FLASH_PRICING,
  exchangeRate: number = USD_TO_INR_EXCHANGE_RATE
): DetailedCostBreakdown {
  const {
    scenarioName,
    promptCount,
    avgInputTokens,
    avgOutputTokens,
    enableGrounding,
    searchQueriesPerPrompt,
    retryBufferPercent,
  } = scenario;

  const totalInputTokens = promptCount * avgInputTokens;
  const totalOutputTokens = promptCount * avgOutputTokens;

  // 1. Raw Model Inference Cost
  const inputCostUsd = (totalInputTokens / 1_000_000) * modelPricing.inputCostPer1MUsd;
  const outputCostUsd = (totalOutputTokens / 1_000_000) * modelPricing.outputCostPer1MUsd;
  const inferenceCostUsd = inputCostUsd + outputCostUsd;

  // 2. Search Grounding Cost (Per Search Query, not per prompt)
  let totalSearchQueries = 0;
  let billableSearchQueries = 0;
  let groundingCostUsd = 0;

  if (enableGrounding) {
    totalSearchQueries = promptCount * searchQueriesPerPrompt;
    billableSearchQueries = Math.max(0, totalSearchQueries - modelPricing.freeGroundingQueriesMonthly);
    groundingCostUsd = (billableSearchQueries / 1000) * modelPricing.groundingCostPer1KQueriesUsd;
  }

  // 3. Retry Buffer (accounting for transient failures / exponential backoff re-runs)
  const retryBufferCostUsd = (inferenceCostUsd + groundingCostUsd) * (retryBufferPercent / 100);

  const totalAiCostUsd = inferenceCostUsd + groundingCostUsd + retryBufferCostUsd;
  const totalAiCostInr = totalAiCostUsd * exchangeRate;
  const costPerPromptInr = promptCount > 0 ? totalAiCostInr / promptCount : 0;

  return {
    scenarioName,
    promptCount,
    totalSearchQueries,
    billableSearchQueries,
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    inferenceCostUsd: Number(inferenceCostUsd.toFixed(4)),
    groundingCostUsd: Number(groundingCostUsd.toFixed(4)),
    retryBufferCostUsd: Number(retryBufferCostUsd.toFixed(4)),
    totalAiCostUsd: Number(totalAiCostUsd.toFixed(4)),
    totalAiCostInr: Number(totalAiCostInr.toFixed(2)),
    costPerPromptInr: Number(costPerPromptInr.toFixed(4)),
  };
}

export interface RealisticPlanEconomics {
  planTier: string;
  monthlyPromptsIncluded: number;
  monthlySubscriptionPriceInr: number;
  // Itemized monthly costs per customer (INR)
  aiInferenceCostInr: number;
  searchGroundingCostInr: number;
  allocatedDatabaseStorageInr: number; // Estimated share of Supabase Pro
  allocatedQueueRedisInr: number;      // Estimated share of Upstash Redis
  allocatedHostingInr: number;         // Estimated share of Vercel/Railway
  paymentGatewayFeeInr: number;        // Razorpay 2% + 18% GST = 2.36%
  allocatedMonitoringInr: number;      // Estimated share of Sentry / logging
  totalEstimatedCostInr: number;
  estimatedGrossProfitInr: number;
  estimatedGrossMarginPercent: number;
}

/**
 * Computes a realistic, all-inclusive monthly subscription economics model.
 * Assumes an early-stage agency base (e.g. 20 paying customers amortizing fixed infra).
 */
export function calculateRealisticPlanEconomics(
  activeSubscribersBase: number = 20,
  exchangeRate: number = USD_TO_INR_EXCHANGE_RATE
): RealisticPlanEconomics[] {
  // Fixed monthly infrastructure baselines (USD converted to INR)
  // These represent real operational services:
  const monthlySupabaseInr = 25 * exchangeRate; // $25/mo Pro tier (~₹2,175)
  const monthlyRedisInr = 10 * exchangeRate;    // $10/mo Upstash (~₹870)
  const monthlyHostingInr = 20 * exchangeRate;  // $20/mo Vercel Pro (~₹1,740)
  const monthlyMonitoringInr = 15 * exchangeRate; // $15/mo Sentry team (~₹1,305)

  // Amortized fixed cost per subscriber:
  const perTenantDb = Number((monthlySupabaseInr / activeSubscribersBase).toFixed(2));
  const perTenantRedis = Number((monthlyRedisInr / activeSubscribersBase).toFixed(2));
  const perTenantHosting = Number((monthlyHostingInr / activeSubscribersBase).toFixed(2));
  const perTenantMonitoring = Number((monthlyMonitoringInr / activeSubscribersBase).toFixed(2));

  // Plan tiers configuration (prompts, price, grounding query multiplier):
  const planConfigs = [
    { tier: 'Starter', prompts: 100, price: 1499, queriesPerPrompt: 1 },
    { tier: 'Pro', prompts: 500, price: 3999, queriesPerPrompt: 1 },
    { tier: 'Agency', prompts: 2500, price: 9999, queriesPerPrompt: 1.5 }, // Agencies use deeper queries
  ];

  return planConfigs.map((p) => {
    // 150 input tokens, 450 output tokens standard profile
    const cost = calculateDetailedPromptCost({
      scenarioName: p.tier,
      promptCount: p.prompts,
      avgInputTokens: 150,
      avgOutputTokens: 450,
      enableGrounding: true,
      searchQueriesPerPrompt: p.queriesPerPrompt,
      retryBufferPercent: 5,
    });

    const aiInferenceCostInr = Number((cost.inferenceCostUsd * exchangeRate).toFixed(2));
    const searchGroundingCostInr = Number((cost.groundingCostUsd * exchangeRate).toFixed(2));

    // Razorpay transaction fee: 2% + 18% GST on the fee = 2.36% of subscription price
    const paymentGatewayFeeInr = Number((p.price * 0.0236).toFixed(2));

    const totalCost =
      aiInferenceCostInr +
      searchGroundingCostInr +
      perTenantDb +
      perTenantRedis +
      perTenantHosting +
      paymentGatewayFeeInr +
      perTenantMonitoring;

    const grossProfit = Number((p.price - totalCost).toFixed(2));
    const grossMarginPercent = Number(((grossProfit / p.price) * 100).toFixed(1));

    return {
      planTier: p.tier,
      monthlyPromptsIncluded: p.prompts,
      monthlySubscriptionPriceInr: p.price,
      aiInferenceCostInr,
      searchGroundingCostInr,
      allocatedDatabaseStorageInr: perTenantDb,
      allocatedQueueRedisInr: perTenantRedis,
      allocatedHostingInr: perTenantHosting,
      paymentGatewayFeeInr,
      allocatedMonitoringInr: perTenantMonitoring,
      totalEstimatedCostInr: Number(totalCost.toFixed(2)),
      estimatedGrossProfitInr: grossProfit,
      estimatedGrossMarginPercent: grossMarginPercent,
    };
  });
}

// CLI Execution entrypoint
if (require.main === module || process.argv[1]?.includes('cost-calculator')) {
  console.log(`\n========================================================================================`);
  console.log(`VISNORA AUDITED INFERENCE & SUBSCRIPTION UNIT ECONOMICS (GEMINI 3.8 FLASH)`);
  console.log(`Exchange Rate: 1 USD = ₹${USD_TO_INR_EXCHANGE_RATE.toFixed(2)} | Timestamp: ${EXCHANGE_RATE_TIMESTAMP}`);
  console.log(`Model: ${GEMINI_3_8_FLASH_PRICING.modelId} ($${GEMINI_3_8_FLASH_PRICING.inputCostPer1MUsd}/1M in, $${GEMINI_3_8_FLASH_PRICING.outputCostPer1MUsd}/1M out)`);
  console.log(`Search Grounding: Free first ${GEMINI_3_8_FLASH_PRICING.freeGroundingQueriesMonthly} queries/mo, then $${GEMINI_3_8_FLASH_PRICING.groundingCostPer1KQueriesUsd}/1k queries`);
  console.log(`========================================================================================\n`);

  const promptCounts = [100, 1000, 2500, 10000];

  console.log(`1. SCENARIO A: NO SEARCH GROUNDING (Pure LLM Inference: 150 in / 450 out)`);
  console.log(`----------------------------------------------------------------------------------------`);
  for (const n of promptCounts) {
    const res = calculateDetailedPromptCost({
      scenarioName: `${n} Prompts`,
      promptCount: n,
      avgInputTokens: 150,
      avgOutputTokens: 450,
      enableGrounding: false,
      searchQueriesPerPrompt: 0,
      retryBufferPercent: 5,
    });
    console.log(`${res.scenarioName.padEnd(16)} | Tokens: ${String(res.totalTokens).padStart(9)} | USD: $${res.totalAiCostUsd.toFixed(3).padStart(7)} | INR: ₹${res.totalAiCostInr.toFixed(2).padStart(8)} | Per Prompt: ₹${res.costPerPromptInr.toFixed(4)}`);
  }

  console.log(`\n2. SCENARIO B: SEARCH GROUNDING ENABLED (1 Query per Prompt)`);
  console.log(`----------------------------------------------------------------------------------------`);
  for (const n of promptCounts) {
    const res = calculateDetailedPromptCost({
      scenarioName: `${n} Prompts`,
      promptCount: n,
      avgInputTokens: 150,
      avgOutputTokens: 450,
      enableGrounding: true,
      searchQueriesPerPrompt: 1,
      retryBufferPercent: 5,
    });
    console.log(`${res.scenarioName.padEnd(16)} | Queries: ${String(res.totalSearchQueries).padStart(6)} (Billable: ${String(res.billableSearchQueries).padStart(5)}) | USD: $${res.totalAiCostUsd.toFixed(3).padStart(7)} | INR: ₹${res.totalAiCostInr.toFixed(2).padStart(8)} | Per Prompt: ₹${res.costPerPromptInr.toFixed(4)}`);
  }

  console.log(`\n3. SCENARIO C: DEEP SEARCH GROUNDING (2 Queries per Prompt)`);
  console.log(`----------------------------------------------------------------------------------------`);
  for (const n of promptCounts) {
    const res = calculateDetailedPromptCost({
      scenarioName: `${n} Prompts`,
      promptCount: n,
      avgInputTokens: 150,
      avgOutputTokens: 450,
      enableGrounding: true,
      searchQueriesPerPrompt: 2,
      retryBufferPercent: 5,
    });
    console.log(`${res.scenarioName.padEnd(16)} | Queries: ${String(res.totalSearchQueries).padStart(6)} (Billable: ${String(res.billableSearchQueries).padStart(5)}) | USD: $${res.totalAiCostUsd.toFixed(3).padStart(7)} | INR: ₹${res.totalAiCostInr.toFixed(2).padStart(8)} | Per Prompt: ₹${res.costPerPromptInr.toFixed(4)}`);
  }

  console.log(`\n4. ALL-INCLUSIVE SUBSCRIPTION PLAN ECONOMICS (Amortizing Infra Across 20 Customers)`);
  console.log(`----------------------------------------------------------------------------------------`);
  const plans = calculateRealisticPlanEconomics(20);
  for (const p of plans) {
    console.log(`\n[Plan Tier: ${p.planTier.toUpperCase()} — Price: ₹${p.monthlySubscriptionPriceInr}/mo — Prompts: ${p.monthlyPromptsIncluded}]`);
    console.log(`  • AI Inference:       ₹${p.aiInferenceCostInr.toFixed(2)}`);
    console.log(`  • Search Grounding:   ₹${p.searchGroundingCostInr.toFixed(2)}`);
    console.log(`  • Database & Storage: ₹${p.allocatedDatabaseStorageInr.toFixed(2)} (Estimated amortized share)`);
    console.log(`  • Queue & Redis:      ₹${p.allocatedQueueRedisInr.toFixed(2)} (Estimated amortized share)`);
    console.log(`  • App Hosting:        ₹${p.allocatedHostingInr.toFixed(2)} (Estimated amortized share)`);
    console.log(`  • Payment Gateway:    ₹${p.paymentGatewayFeeInr.toFixed(2)} (Razorpay 2% + 18% GST)`);
    console.log(`  • Monitoring:         ₹${p.allocatedMonitoringInr.toFixed(2)} (Estimated amortized share)`);
    console.log(`  --------------------------------------------------`);
    console.log(`  TOTAL MONTHLY COST:   ₹${p.totalEstimatedCostInr.toFixed(2)}`);
    console.log(`  ESTIMATED NET MARGIN: ₹${p.estimatedGrossProfitInr.toFixed(2)} (${p.estimatedGrossMarginPercent}%)`);
  }
  console.log(`\n========================================================================================\n`);
}
