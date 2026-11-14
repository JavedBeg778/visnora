// Visnora — 50-Prompt AI Visibility Benchmark Runner
// Reference: docs/TECHNICAL_BLUEPRINT.md & Milestone M0

import fs from 'fs';
import path from 'path';
import { GeminiAdapter } from './gemini';
import { OpenAIAdapter } from './openai';
import { AiProviderAdapter, PromptRunResult, ProviderType } from './types';
import { extractMentions } from '../../domain/ai-visibility/extractor';
import { extractCitations, aggregateCitationFrequencies } from '../../domain/ai-visibility/citation-extractor';
import { calculateBatchVisibilitySummary, BatchRunEvaluationItem } from '../../domain/ai-visibility/metrics';
import { BrandEntity } from '../../domain/ai-visibility/types';

interface BenchmarkPrompt {
  id: string;
  category: string;
  promptText: string;
  buyingStage: string;
  targetIndustry: string;
  targetLocale: string;
  evaluationEntities: string[];
}

export interface BenchmarkReportOutput {
  metadata: {
    executedAt: string;
    provider: ProviderType;
    modelId: string;
    isDryRun: boolean;
    isGroundingEnabled: boolean;
    totalPromptsEvaluated: number;
    totalExecutionDurationMs: number;
  };
  metrics: ReturnType<typeof calculateBatchVisibilitySummary>;
  topCitations: ReturnType<typeof aggregateCitationFrequencies>;
  costAnalysis: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    estimatedCostInr: number;
  };
  results: Array<{
    promptId: string;
    category: string;
    status: string;
    latencyMs: number;
    tokenUsage?: { inputTokens: number; outputTokens: number; totalTokens: number };
    errorCode?: string;
    errorMessage?: string;
    mentions: Array<{ entityName: string; isPrimary: boolean; confidence: number; listPosition: number | null }>;
    citations: Array<{ domain: string; url: string }>;
  }>;
}

export interface BenchmarkRunOptions {
  provider?: ProviderType;
  modelId?: string;
  dryRun?: boolean;
  limit?: number;
  outputFilePath?: string;
  delayMs?: number;
  enableGrounding?: boolean;
}

export function parseCliArgs(args: string[]): BenchmarkRunOptions {
  const result: BenchmarkRunOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--grounding' || arg === '--enable-grounding' || arg === '--enable-grounding=true') {
      result.enableGrounding = true;
    } else if (arg === '--no-grounding' || arg === '--enable-grounding=false') {
      result.enableGrounding = false;
    } else if (arg.startsWith('--provider=')) {
      result.provider = arg.substring('--provider='.length) as ProviderType;
    } else if (arg === '--provider' && i + 1 < args.length) {
      result.provider = args[++i] as ProviderType;
    } else if (arg.startsWith('--model=')) {
      result.modelId = arg.substring('--model='.length);
    } else if (arg === '--model' && i + 1 < args.length) {
      result.modelId = args[++i];
    } else if (arg.startsWith('--limit=')) {
      const val = parseInt(arg.substring('--limit='.length), 10);
      if (!isNaN(val)) result.limit = val;
    } else if (arg === '--limit' && i + 1 < args.length) {
      const val = parseInt(args[++i], 10);
      if (!isNaN(val)) result.limit = val;
    } else if (arg.startsWith('--delay=')) {
      const val = parseInt(arg.substring('--delay='.length), 10);
      if (!isNaN(val)) result.delayMs = val;
    } else if (arg.startsWith('--output=')) {
      result.outputFilePath = arg.substring('--output='.length);
    }
  }

  return result;
}

export async function runBenchmark(options: BenchmarkRunOptions = {}): Promise<BenchmarkReportOutput> {
  const providerType: ProviderType = options.provider || 'google-gemini';
  const isDryRun = options.dryRun ?? false;
  const limit = options.limit;
  const delayMs = options.delayMs ?? 300;
  const enableGrounding = options.enableGrounding ?? false;

  // Setup adapter
  let adapter: AiProviderAdapter;
  if (providerType === 'google-gemini') {
    adapter = new GeminiAdapter({
      defaultModel: options.modelId || undefined,
    });
  } else {
    adapter = new OpenAIAdapter({
      defaultModel: options.modelId || undefined,
    });
  }

  const selectedModel = options.modelId || adapter.defaultModel;

  console.log(`\n======================================================`);
  console.log(`VISNORA AI VISIBILITY BENCHMARK RUNNER`);
  console.log(`Provider: ${providerType} | Model: ${selectedModel}`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE API'}`);
  console.log(`Grounding: ${enableGrounding ? 'Google Search Grounding ENABLED' : 'Text-Only (Grounding DISABLED)'}`);
  if (limit) console.log(`Limit: Evaluating first ${limit} prompts`);
  console.log(`======================================================\n`);

  // Load dataset
  const datasetPath = path.resolve(__dirname, 'datasets/prompts-50.json');
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Benchmark dataset not found at: ${datasetPath}`);
  }
  const rawData = fs.readFileSync(datasetPath, 'utf8');
  let prompts: BenchmarkPrompt[] = JSON.parse(rawData);

  if (limit && limit > 0) {
    prompts = prompts.slice(0, limit);
  }

  // Define target brand entity for Visnora and competitors
  const targetBrand: BrandEntity = {
    id: 'visnora-brand',
    canonicalName: 'Visnora',
    domain: 'visnora.com',
    aliases: ['Visnora AI', 'Visnora App', 'Visnora.com'],
  };

  const competitors: BrandEntity[] = [
    { id: 'comp-semrush', canonicalName: 'Semrush', domain: 'semrush.com', aliases: [] },
    { id: 'comp-ahrefs', canonicalName: 'Ahrefs', domain: 'ahrefs.com', aliases: [] },
    { id: 'comp-otterly', canonicalName: 'Otterly', domain: 'otterly.ai', aliases: ['Otterly.ai'] },
    { id: 'comp-peec', canonicalName: 'Peec', domain: 'peec.ai', aliases: ['Peec.ai'] },
    { id: 'comp-agencyanalytics', canonicalName: 'AgencyAnalytics', domain: 'agencyanalytics.com', aliases: [] },
  ];

  const startTime = Date.now();
  const rawResults: PromptRunResult[] = [];
  const evaluationMap = new Map<string, BatchRunEvaluationItem>();
  const citationMap = new Map<string, Array<{ domain: string; url: string; title?: string }>>();
  const allCitations: Array<ReturnType<typeof extractCitations>> = [];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    process.stdout.write(`[${i + 1}/${prompts.length}] Running ${p.id} (${p.category})... `);

    try {
      const result = await adapter.runPrompt({
        promptId: p.id,
        promptText: p.promptText,
        category: p.category,
        modelId: selectedModel,
        targetLocale: p.targetLocale,
        enableGrounding,
        dryRun: isDryRun,
      });

      rawResults.push(result);

      if (result.tokenUsage) {
        totalInputTokens += result.tokenUsage.inputTokens;
        totalOutputTokens += result.tokenUsage.outputTokens;
      }

      // Extract mentions
      const mentions = extractMentions(result.rawResponseText, targetBrand, competitors);
      const hasTargetBrand = mentions.some((m) => m.isPrimaryBrand);
      const targetBrandMentionsCount = mentions.filter((m) => m.isPrimaryBrand).length;
      const competitorMentionsCount = mentions.filter((m) => !m.isPrimaryBrand).length;

      // Extract citations
      const citations = extractCitations(
        result.rawResponseText,
        result.groundingMetadata?.sources
      );
      allCitations.push(citations);
      citationMap.set(p.id, citations);

      const positions = mentions
        .map((m) => m.listPosition)
        .filter((pos): pos is number => pos !== null);
      const avgPos = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : null;

      evaluationMap.set(p.id, {
        promptId: p.id,
        hasTargetBrand,
        targetBrandMentionsCount,
        competitorMentionsCount,
        citationsCount: citations.length,
        averagePosition: avgPos,
      });

      console.log(`DONE (${result.latencyMs}ms | ${mentions.length} mentions | ${citations.length} citations)`);
    } catch (err: any) {
      console.log(`FAILED: [${err.code || 'ERROR'}] ${err.message}`);
      rawResults.push({
        promptId: p.id,
        category: p.category,
        provider: providerType,
        modelId: selectedModel,
        status: 'FAILED',
        rawResponseText: '',
        latencyMs: 0,
        errorCode: err.code || 'UNKNOWN_ERROR',
        errorMessage: err.message,
        executedAt: new Date().toISOString(),
      });
    }

    // Rate-limit throttle delay between prompts
    if (i < prompts.length - 1 && delayMs > 0 && !isDryRun) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const totalDuration = Date.now() - startTime;
  const evaluationItems = Array.from(evaluationMap.values());
  const metrics = calculateBatchVisibilitySummary(evaluationItems, prompts.length);
  const topCitations = aggregateCitationFrequencies(allCitations);

  // Pricing calculation
  // Gemini 3.5 Flash-Lite: $0.30 / 1M in, $2.50 / 1M out
  // Gemini 3.8 Flash: $0.75 / 1M in, $3.75 / 1M out
  const isFlashLite = selectedModel.includes('flash-lite');
  const inputRate = isFlashLite ? 0.30 : 0.75;
  const outputRate = isFlashLite ? 2.50 : 3.75;
  const usdInputCost = (totalInputTokens / 1_000_000) * inputRate;
  const usdOutputCost = (totalOutputTokens / 1_000_000) * outputRate;
  const estimatedCostUsd = Number((usdInputCost + usdOutputCost).toFixed(4));
  const estimatedCostInr = Number((estimatedCostUsd * 87).toFixed(2));

  const reportOutput: BenchmarkReportOutput = {
    metadata: {
      executedAt: new Date().toISOString(),
      provider: providerType,
      modelId: selectedModel,
      isDryRun,
      isGroundingEnabled: enableGrounding,
      totalPromptsEvaluated: prompts.length,
      totalExecutionDurationMs: totalDuration,
    },
    metrics,
    topCitations: topCitations.slice(0, 10),
    costAnalysis: {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      estimatedCostUsd,
      estimatedCostInr,
    },
    results: rawResults.map((r) => {
      const evalItem = evaluationMap.get(r.promptId);
      const cites = citationMap.get(r.promptId) || [];
      return {
        promptId: r.promptId,
        category: r.category || 'General',
        status: r.status,
        latencyMs: r.latencyMs,
        tokenUsage: r.tokenUsage,
        errorCode: r.errorCode,
        errorMessage: r.errorMessage,
        mentions: evalItem
          ? [
              ...(evalItem.hasTargetBrand
                ? [{ entityName: 'Visnora', isPrimary: true, confidence: 1.0, listPosition: evalItem.averagePosition }]
                : []),
            ]
          : [],
        citations: cites.map((c) => ({ domain: c.domain, url: c.url })),
      };
    }),
  };

  // Write output fixture
  const outPath =
    options.outputFilePath ||
    path.resolve(process.cwd(), `tests/fixtures/benchmark-results-${providerType}.json`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(reportOutput, null, 2), 'utf8');

  console.log(`\n======================================================`);
  console.log(`BENCHMARK SUMMARY (${providerType})`);
  console.log(`======================================================`);
  console.log(`Attempted Prompts: ${prompts.length}`);
  console.log(`Successful Runs: ${metrics.successfulRunsCount} | Failed Runs: ${metrics.failedRunsCount}`);
  console.log(`Model: ${selectedModel}`);
  console.log(`Grounding Status: ${enableGrounding ? 'Search Grounded' : 'Text-Only'}`);
  console.log(`Observed Mention Rate (OMR): ${metrics.brandMentionRate}%`);
  console.log(`Sample Share of Voice (SSOV): ${metrics.sampleShareOfVoice}%`);
  console.log(`Avg Citations / Response: ${metrics.averageCitationsPerResponse}`);
  console.log(`Tokens Consumed: ${totalInputTokens} in / ${totalOutputTokens} out (Total: ${totalInputTokens + totalOutputTokens})`);
  console.log(`Estimated Cost: $${estimatedCostUsd} (₹${estimatedCostInr})`);
  console.log(`Results saved to: ${outPath}\n`);

  return reportOutput;
}

// CLI Execution entrypoint
if (process.argv[1]?.includes('benchmark-runner')) {
  const cliArgs = parseCliArgs(process.argv.slice(2));

  runBenchmark(cliArgs).catch((err) => {
    console.error('\nBenchmark Runner Encountered An Error:');
    console.error(err.message || err);
    process.exit(1);
  });
}

