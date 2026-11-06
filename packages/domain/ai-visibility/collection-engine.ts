// Visnora — AI Response Collection Engine
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/INTEGRATIONS.md

import { prisma } from '../../database/src/client';
import { NotFoundError, ValidationError, ForbiddenError } from '../organizations/service';
import { GeminiAdapter } from '../../integrations/ai-providers/gemini';
import { OpenAIAdapter } from '../../integrations/ai-providers/openai';
import { analyzeAiResponse } from './analysis-service';
import { generateRecommendationsForRun } from './recommendation-service';
import { USD_TO_INR_EXCHANGE_RATE, GEMINI_3_8_FLASH_PRICING, GEMINI_3_5_FLASH_LITE_PRICING } from '../billing/cost-calculator';
import { BrandEntity } from './types';

export interface TrackingRunOptions {
  organizationId: string;
  projectId: string;
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
  enableGrounding = false
) {
  const avgInputTokens = 150;
  const avgOutputTokens = 450;
  const totalInputTokens = promptCount * avgInputTokens;
  const totalOutputTokens = promptCount * avgOutputTokens;

  const pricing = modelId.includes('lite')
    ? GEMINI_3_5_FLASH_LITE_PRICING
    : GEMINI_3_8_FLASH_PRICING;

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

export async function startTrackingRun(options: TrackingRunOptions) {
  const { organizationId, projectId, promptIds, groupId, enableGrounding = false, dryRun = false } = options;
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

  const primaryBrand = project.brands.find((b) => b.isPrimary) || project.brands[0];
  if (!primaryBrand) {
    throw new ValidationError('A primary brand must be configured for this project before running tracking.');
  }

  const targetBrandEntity: BrandEntity = {
    id: primaryBrand.id,
    canonicalName: primaryBrand.canonicalName,
    domain: primaryBrand.domain,
    aliases: primaryBrand.aliases || [],
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

  // 3. Estimate Pre-Run Usage
  const costEstimate = estimateTrackingRunCost(prompts.length, model, enableGrounding);

  // 4. Create TrackingRun record
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

  // 5. Initialize Provider Adapter
  const adapter = provider === 'openai'
    ? new OpenAIAdapter({ defaultModel: model })
    : new GeminiAdapter({ defaultModel: model });

  let successCount = 0;
  let failedCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalActualCostPaise = 0;

  // 6. Execute Prompts
  for (const prompt of prompts) {
    const executedAt = new Date();

    try {
      // Execute through adapter (dryRun if specified or fallback)
      const result = await adapter.runPrompt({
        promptId: prompt.id,
        promptText: prompt.promptText,
        category: prompt.category || 'General Discovery',
        modelId: model,
        targetLocale: prompt.targetLocale || 'en-IN',
        enableGrounding,
        dryRun,
        timeoutMs: 40000,
      });

      const inTokens = result.tokenUsage?.inputTokens || 150;
      const outTokens = result.tokenUsage?.outputTokens || (result.status === 'COMPLETED' ? 450 : 0);
      const isCompleted = result.status === 'COMPLETED' || result.status === 'DRY_RUN';

      // Calculate cost in paise
      const pricing = model.includes('lite') ? GEMINI_3_5_FLASH_LITE_PRICING : GEMINI_3_8_FLASH_PRICING;
      const costUsd =
        (inTokens / 1_000_000) * pricing.inputCostPer1MUsd +
        (outTokens / 1_000_000) * pricing.outputCostPer1MUsd;
      const costPaise = Math.round(costUsd * USD_TO_INR_EXCHANGE_RATE * 100);

      if (isCompleted) {
        successCount++;
        totalInputTokens += inTokens;
        totalOutputTokens += outTokens;
        totalActualCostPaise += costPaise;

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
            isEstimated: dryRun,
          },
        });

        // Update prompt lastRunAt
        await prisma.trackedPrompt.update({
          where: { id: prompt.id },
          data: { lastRunAt: executedAt },
        });
      } else {
        // Run returned an error status from provider
        failedCount++;
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
      }
    } catch (err: any) {
      failedCount++;
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
    }
  }

  // 7. Update TrackingRun status
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

  // 8. Generate Automated Recommendations based on run data
  try {
    await generateRecommendationsForRun(organizationId, projectId, trackingRun.id);
  } catch {
    // Non-blocking recommendation generation
  }

  return updatedRun;
}

export async function getTrackingRuns(
  organizationId: string,
  projectId: string,
  page = 1,
  limit = 20
) {
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

