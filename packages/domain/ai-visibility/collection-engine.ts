// Visnora — AI Response Collection Engine
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/INTEGRATIONS.md

import { prisma } from '../../database/src/client';
import { NotFoundError, ValidationError, ForbiddenError } from '../organizations/service';
import { GeminiAdapter } from '../../integrations/ai-providers/gemini';
import { OpenAIAdapter } from '../../integrations/ai-providers/openai';
import { analyzeAiResponse } from './analysis-service';
import { generateRecommendationsForRun } from './recommendation-service';
import { USD_TO_INR_EXCHANGE_RATE, GEMINI_3_8_FLASH_PRICING, GEMINI_3_5_FLASH_LITE_PRICING, getModelPricing } from '../billing/cost-calculator';
import { reservePromptQuota, recordPromptUsage, releaseReservedQuota, QuotaExceededError } from '../billing/usage-meter';
import { BrandEntity } from './types';

export interface TrackingRunOptions {
  organizationId: string;
  projectId: string;
  brandId?: string;
  userId: string;
  promptIds?: string[];
  groupId?: string;
  provider?: 'google-gemini' | 'openai';
  model?: string;
  enableGrounding?: boolean;
  dryRun?: boolean;
}

export function estimateTrackingRunCost(
  promptCount: number,
  modelId = 'gemini-3.8-flash',
  enableGrounding = false,
  provider = 'google-gemini'
) {
  const avgInputTokens = 150;
  const avgOutputTokens = 450;
  const totalInputTokens = promptCount * avgInputTokens;
  const totalOutputTokens = promptCount * avgOutputTokens;

  const pricing = getModelPricing(provider, modelId);

  const inputCostUsd = (totalInputTokens / 1_000_000) * pricing.inputCostPer1MUsd;
  const outputCostUsd = (totalOutputTokens / 1_000_000) * pricing.outputCostPer1MUsd;
  const inferenceCostUsd = inputCostUsd + outputCostUsd;

  // Grounding cost: 0 if promptCount <= free monthly queries
  const groundingCostUsd = enableGrounding && promptCount > pricing.freeGroundingQueriesMonthly
    ? ((promptCount - pricing.freeGroundingQueriesMonthly) / 1000) * pricing.groundingCostPer1KQueriesUsd
    : 0.0;

  const totalCostUsd = inferenceCostUsd + groundingCostUsd;
  const estimatedCostPaise = Math.round(totalCostUsd * USD_TO_INR_EXCHANGE_RATE * 100);

  return {
    promptCount,
    estimatedTotalTokens: totalInputTokens + totalOutputTokens,
    estimatedInputTokens: totalInputTokens,
    estimatedOutputTokens: totalOutputTokens,
    estimatedCostUsd: Number(totalCostUsd.toFixed(4)),
    estimatedCostPaise,
    modelId,
    provider: pricing.provider,
    notice: 'Estimates based on typical prompt and response length. Actual token usage depends on model verbosity.',
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

export interface InitTrackingRunResult {
  trackingRun: any;
  prompts: any[];
  targetBrandEntity: BrandEntity;
  competitorEntities: BrandEntity[];
  costEstimate: ReturnType<typeof estimateTrackingRunCost>;
  executeRun: () => Promise<any>;
}

export async function initTrackingRun(options: TrackingRunOptions): Promise<InitTrackingRunResult> {
  const { organizationId, projectId, brandId, promptIds, groupId, enableGrounding = false, dryRun = false } = options;
  const provider = options.provider || 'google-gemini';
  const model = options.model || (provider === 'google-gemini' ? 'gemini-3.8-flash' : 'gpt-4o');

  // 1. Verify Project & Brand
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, isArchived: false },
    include: {
      brands: { where: { isArchived: false } },
      competitors: { where: { isArchived: false } },
    },
  });

  if (!project) {
    throw new NotFoundError('Project container not found');
  }

  let targetBrand = null;
  if (brandId) {
    targetBrand = project.brands.find((b) => b.id === brandId);
    if (!targetBrand) {
      // Check if brand exists directly under organization
      const directBrand = await prisma.brand.findFirst({
        where: { id: brandId, organizationId, isArchived: false },
      });
      if (directBrand) {
        targetBrand = directBrand;
      }
    }
  }
  if (!targetBrand) {
    targetBrand = project.brands.find((b) => b.isPrimary) || project.brands[0];
  }
  if (!targetBrand) {
    throw new ValidationError('A primary brand must be configured for this project before running tracking.');
  }

  const targetBrandEntity: BrandEntity = {
    id: targetBrand.id,
    canonicalName: targetBrand.canonicalName,
    domain: targetBrand.domain,
    aliases: targetBrand.aliases || [],
  };

  const competitorEntities: BrandEntity[] = project.competitors.map((c) => ({
    id: c.id,
    canonicalName: c.canonicalName,
    domain: c.domain,
    aliases: c.aliases || [],
  }));

  // 2. Load Prompts
  let prompts = await prisma.trackedPrompt.findMany({
    where: {
      organizationId,
      projectId,
      isArchived: false,
      isActive: true,
      ...(promptIds && promptIds.length > 0 ? { id: { in: promptIds } } : {}),
      ...(groupId ? { groupId } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  // If no specific prompts were enabled, fallback to any project prompt if explicitly requested
  if (prompts.length === 0 && promptIds && promptIds.length > 0) {
    prompts = await prisma.trackedPrompt.findMany({
      where: {
        id: { in: promptIds },
        organizationId,
        projectId,
      },
    });
  }

  if (prompts.length === 0) {
    throw new ValidationError('No active prompts found to track. Please create or enable prompts first.');
  }

  // 3. Quota reservation check
  if (!dryRun) {
    const quotaReservation = await reservePromptQuota(organizationId, prompts.length);
    if (!quotaReservation.allowed) {
      throw new QuotaExceededError(
        quotaReservation.consumed,
        quotaReservation.limit,
        quotaReservation.remaining,
        quotaReservation.periodEnd
      );
    }
  }

  // 4. Estimate Pre-Run Usage
  const costEstimate = estimateTrackingRunCost(prompts.length, model, enableGrounding);

  // 5. Create TrackingRun record
  const trackingRun = await prisma.trackingRun.create({
    data: {
      organizationId,
      projectId,
      status: 'RUNNING',
      provider,
      model,
      promptCount: prompts.length,
      estimatedCostPaise: costEstimate.estimatedCostPaise,
      startedAt: new Date(),
    },
  });

  const executeRun = async () => {
    return await executeTrackingRunPrompts({
      trackingRun,
      prompts,
      targetBrandEntity,
      competitorEntities,
      provider,
      model,
      enableGrounding,
      dryRun,
    });
  };

  return {
    trackingRun,
    prompts,
    targetBrandEntity,
    competitorEntities,
    costEstimate,
    executeRun,
  };
}

export async function executeTrackingRunPrompts(params: {
  trackingRun: any;
  prompts: any[];
  targetBrandEntity: BrandEntity;
  competitorEntities: BrandEntity[];
  provider: string;
  model: string;
  enableGrounding: boolean;
  dryRun: boolean;
}) {
  const {
    trackingRun,
    prompts,
    targetBrandEntity,
    competitorEntities,
    provider,
    model,
    enableGrounding,
    dryRun,
  } = params;

  const organizationId = trackingRun.organizationId;
  const projectId = trackingRun.projectId;

  try {
    // Initialize Provider Adapter with safety timeouts and minimal retries
    const adapter =
      provider === 'openai'
        ? new OpenAIAdapter({ defaultModel: model })
        : new GeminiAdapter({ defaultModel: model, maxRetries: 1, timeoutMs: 25000 });

    // Execute prompts concurrently (concurrency: 3) to prevent timeouts
    const executionResults = await runWithConcurrency(prompts, 3, async (prompt) => {
      const executedAt = new Date();

      try {
        // Idempotency check: if prompt has already completed for this tracking run, avoid re-executing
        const existingRun = await prisma.promptRun.findFirst({
          where: {
            promptId: prompt.id,
            trackingRunId: trackingRun.id,
            status: 'COMPLETED',
          },
        });

        if (existingRun) {
          return {
            success: true,
            inputTokens: existingRun.inputTokens,
            outputTokens: existingRun.outputTokens,
            costPaise: existingRun.actualCostPaise,
          };
        }

        const result = await adapter.runPrompt({
          promptId: prompt.id,
          promptText: prompt.promptText,
          category: prompt.category || 'General Discovery',
          modelId: model,
          targetLocale: prompt.targetLocale || 'en-IN',
          enableGrounding,
          dryRun,
          timeoutMs: 25000,
        });

        const hasRealTokenUsage = Boolean(result.tokenUsage && (result.tokenUsage.inputTokens || result.tokenUsage.outputTokens));
        const inTokens = result.tokenUsage?.inputTokens ?? (dryRun ? 150 : 0);
        const outTokens = result.tokenUsage?.outputTokens ?? (result.status === 'COMPLETED' ? (dryRun ? 450 : 0) : 0);
        const isCompleted = result.status === 'COMPLETED' || result.status === 'DRY_RUN';

        const pricing = getModelPricing(provider, model);
        const costUsd =
          (inTokens / 1_000_000) * pricing.inputCostPer1MUsd +
          (outTokens / 1_000_000) * pricing.outputCostPer1MUsd;
        const costPaise = Math.round(costUsd * USD_TO_INR_EXCHANGE_RATE * 100);

        if (isCompleted) {
          // Create PromptRun
          const promptRun = await prisma.promptRun.create({
            data: {
              organizationId,
              projectId,
              promptId: prompt.id,
              trackingRunId: trackingRun.id,
              provider,
              modelVersion: model,
              status: 'COMPLETED',
              latencyMs: result.latencyMs,
              inputTokens: inTokens,
              outputTokens: outTokens,
              estimatedCostPaise: costPaise,
              actualCostPaise: costPaise,
              executedAt,
            },
          });

          // Analyze Response
          const analysis = analyzeAiResponse({
            rawText: result.rawResponseText,
            groundingSources: result.groundingMetadata?.sources?.map((s) => ({
              uri: s.uri,
              title: s.title,
            })),
            targetBrand: targetBrandEntity,
            competitors: competitorEntities,
          });

          // Store AiResponse
          const aiResponse = await prisma.aiResponse.create({
            data: {
              organizationId,
              promptRunId: promptRun.id,
              rawPayload: (result.rawPayload as any) || { text: result.rawResponseText },
              normalizedText: analysis.normalizedText,
              payloadHash: analysis.payloadHash,
              hasCitations: analysis.hasCitations,
            },
          });

          // Store Mentions
          if (analysis.allMentions.length > 0) {
            await prisma.responseMention.createMany({
              data: analysis.allMentions.map((m) => ({
                organizationId,
                aiResponseId: aiResponse.id,
                matchedEntityId: m.matchedEntityId,
                entityName: m.entityName,
                mentionType: m.isPrimaryBrand ? 'PRIMARY_BRAND' : 'COMPETITOR',
                charStart: m.charStart,
                charEnd: m.charEnd,
                evidenceText: m.evidenceText,
                listPosition: m.listPosition,
                extractionConfidence: m.confidence,
                sentiment: m.sentiment || 'NOT_EVALUATED',
                sentimentConfidence: m.sentimentConfidence,
                isRecommendation: m.isRecommendation || false,
              })),
            });
          }

          // Store Citations
          if (analysis.citations.length > 0) {
            await prisma.citation.createMany({
              data: analysis.citations.map((c) => ({
                organizationId,
                aiResponseId: aiResponse.id,
                url: c.url,
                domain: c.domain,
                citationOrder: c.order,
                anchorText: c.anchorText,
              })),
            });
          }

          // Store AI Usage Record
          await prisma.aIUsageRecord.create({
            data: {
              organizationId,
              projectId,
              trackingRunId: trackingRun.id,
              promptRunId: promptRun.id,
              provider,
              model,
              inputTokens: inTokens,
              outputTokens: outTokens,
              estimatedCostPaise: costPaise,
              actualCostPaise: costPaise,
              isEstimated: !hasRealTokenUsage || dryRun,
            },
          });

          // Update prompt lastRunAt
          await prisma.trackedPrompt.update({
            where: { id: prompt.id },
            data: { lastRunAt: executedAt },
          });

          return {
            success: true,
            inputTokens: inTokens,
            outputTokens: outTokens,
            costPaise,
          };
        } else {
          // Run returned an error status from provider
          await prisma.promptRun.create({
            data: {
              organizationId,
              projectId,
              promptId: prompt.id,
              trackingRunId: trackingRun.id,
              provider,
              modelVersion: model,
              status: 'FAILED',
              latencyMs: result.latencyMs,
              errorCode: result.errorCode || 'PROVIDER_ERROR',
              errorMessage: result.errorMessage || 'Failed to generate response',
              executedAt,
            },
          });
          return { success: false, inputTokens: 0, outputTokens: 0, costPaise: 0 };
        }
      } catch (err: any) {
        await prisma.promptRun.create({
          data: {
            organizationId,
            projectId,
            promptId: prompt.id,
            trackingRunId: trackingRun.id,
            provider,
            modelVersion: model,
            status: 'FAILED',
            errorCode: err?.name || 'EXECUTION_EXCEPTION',
            errorMessage: err?.message || 'Unexpected exception during execution',
            executedAt,
          },
        });
        return { success: false, inputTokens: 0, outputTokens: 0, costPaise: 0 };
      }
    });

    // Aggregate stats
    let successCount = 0;
    let failedCount = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalActualCostPaise = 0;

    for (const r of executionResults) {
      if (r.success) {
        successCount++;
        totalInputTokens += r.inputTokens || 0;
        totalOutputTokens += r.outputTokens || 0;
        totalActualCostPaise += r.costPaise || 0;
      } else {
        failedCount++;
      }
    }

    // Determine final status
    let finalStatus = 'COMPLETED';
    if (failedCount > 0 && successCount > 0) {
      finalStatus = 'PARTIALLY_COMPLETED';
    } else if (failedCount > 0 && successCount === 0) {
      finalStatus = 'FAILED';
    }

    const completedAt = new Date();
    const updatedRun = await prisma.trackingRun.update({
      where: { id: trackingRun.id },
      data: {
        status: finalStatus,
        successCount,
        failedCount,
        totalInputTokens,
        totalOutputTokens,
        actualCostPaise: totalActualCostPaise,
        completedAt,
      },
      include: {
        promptRuns: {
          include: {
            prompt: { select: { promptText: true, category: true } },
            aiResponse: {
              include: {
                mentions: true,
                citations: true,
              },
            },
          },
        },
      },
    });

    // Record billable usage and release unconsumed quota reservations
    if (!dryRun) {
      if (successCount > 0) {
        try {
          await recordPromptUsage({
            organizationId,
            quantity: successCount,
            trackingRunId: trackingRun.id,
          });
        } catch (usageErr) {
          console.error(`[TrackingPipeline] Failed to record prompt usage for run ${trackingRun.id}:`, usageErr);
        }
      }
      const unconsumed = prompts.length - successCount;
      if (unconsumed > 0) {
        try {
          await releaseReservedQuota(organizationId, unconsumed);
        } catch (releaseErr) {
          console.error(`[TrackingPipeline] Failed to release unconsumed quota for run ${trackingRun.id}:`, releaseErr);
        }
      }
    }

    // Generate automated recommendations based on run data
    try {
      await generateRecommendationsForRun(organizationId, projectId, trackingRun.id);
    } catch {
      // Non-blocking recommendation generation
    }

    return {
      ...updatedRun,
      summary: {
        totalPrompts: updatedRun.promptCount,
        successCount: updatedRun.successCount,
        failedCount: updatedRun.failedCount,
        status: updatedRun.status,
      },
    };
  } catch (unexpectedError: any) {
    console.error(`[TrackingPipeline] Fatal unexpected error in run ${trackingRun.id}:`, unexpectedError);
    if (!dryRun) {
      try {
        await releaseReservedQuota(organizationId, prompts.length);
      } catch (releaseErr) {
        console.error(`[TrackingPipeline] Failed to release quota after unexpected error for run ${trackingRun.id}:`, releaseErr);
      }
    }
    try {
      await prisma.trackingRun.update({
        where: { id: trackingRun.id },
        data: {
          status: 'FAILED',
          errorMessage: unexpectedError?.message || 'Unexpected failure during pipeline execution',
          completedAt: new Date(),
        },
      });
    } catch (dbErr) {
      console.error(`[TrackingPipeline] Failed to mark run ${trackingRun.id} as FAILED:`, dbErr);
    }
    throw unexpectedError;
  }
}

export async function startTrackingRun(options: TrackingRunOptions) {
  const { executeRun } = await initTrackingRun(options);
  return await executeRun();
}

export async function getTrackingRuns(
  organizationId: string,
  projectId: string,
  pageOrLimit: number = 1,
  limitParam?: number
) {
  let page = 1;
  let limit = 20;

  if (limitParam !== undefined) {
    page = pageOrLimit;
    limit = limitParam;
  } else if (pageOrLimit > 10) {
    // Called like getTrackingRuns(orgId, projId, 30)
    limit = pageOrLimit;
    page = 1;
  } else {
    page = pageOrLimit;
  }

  const skip = (page - 1) * limit;

  const [runs, totalCount] = await Promise.all([
    prisma.trackingRun.findMany({
      where: { organizationId, projectId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: {
          select: { promptRuns: true },
        },
      },
    }),
    prisma.trackingRun.count({
      where: { organizationId, projectId },
    }),
  ]);

  return {
    runs,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

export async function getTrackingRunById(runId: string, organizationId: string) {
  const run = await prisma.trackingRun.findFirst({
    where: { id: runId, organizationId },
    include: {
      project: { select: { name: true, primaryWebsite: true } },
      promptRuns: {
        include: {
          prompt: true,
          aiResponse: {
            include: {
              mentions: true,
              citations: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!run) {
    throw new NotFoundError('Tracking run not found');
  }

  return run;
}

export async function retryFailedTrackingRun(
  runId: string,
  organizationId: string,
  userId: string
) {
  const existingRun = await getTrackingRunById(runId, organizationId);

  const failedPromptIds = existingRun.promptRuns
    .filter((pr) => pr.status === 'FAILED')
    .map((pr) => pr.promptId);

  if (failedPromptIds.length === 0) {
    throw new ValidationError('This tracking run has no failed prompts to retry.');
  }

  return await startTrackingRun({
    organizationId,
    projectId: existingRun.projectId,
    userId,
    promptIds: failedPromptIds,
    provider: existingRun.provider as any,
    model: existingRun.model,
  });
}

