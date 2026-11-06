// Visnora — OpenAI Provider Adapter Architecture (Official OpenAI SDK)
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/INTEGRATIONS.md

import crypto from 'crypto';
import OpenAI from 'openai';
import {
  AiProviderAdapter,
  PromptRunRequest,
  PromptRunResult,
  ProviderType,
  AiAuthError,
  AiRateLimitError,
  AiTimeoutError,
  AiModelError,
  AiProviderError,
} from './types';

export interface OpenAIAdapterConfig {
  apiKey?: string;
  defaultModel?: string;
  maxRetries?: number;
  initialBackoffMs?: number;
  timeoutMs?: number;
}

export class OpenAIAdapter implements AiProviderAdapter {
  readonly provider: ProviderType = 'openai';
  readonly defaultModel: string;
  private readonly apiKey: string | undefined;
  private readonly maxRetries: number;
  private readonly initialBackoffMs: number;
  private readonly timeoutMs: number;
  private client: OpenAI | null = null;

  constructor(config: OpenAIAdapterConfig = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.defaultModel = config.defaultModel || 'gpt-4o-mini';
    this.maxRetries = config.maxRetries ?? 3;
    this.initialBackoffMs = config.initialBackoffMs ?? 1000;
    this.timeoutMs = config.timeoutMs ?? 45000;

    if (this.apiKey) {
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
  }

  /**
   * Verifies the configured OpenAI API key.
   */
  async verifyCredentials(): Promise<{ valid: boolean; message: string; availableModels?: string[] }> {
    if (!this.apiKey) {
      return {
        valid: false,
        message: 'OPENAI_API_KEY is not configured. OpenAI integration is PENDING API ACCESS.',
      };
    }

    try {
      const modelsList = await this.client!.models.list();
      const models = modelsList.data.map((m) => m.id);
      return {
        valid: true,
        message: 'OpenAI API key successfully verified.',
        availableModels: models,
      };
    } catch (err: any) {
      return {
        valid: false,
        message: `OpenAI credential verification failed: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Executes a prompt run against the OpenAI API.
   * If apiKey is absent and not dry-run, cleanly throws AiAuthError without making paid network calls.
   */
  async runPrompt(request: PromptRunRequest): Promise<PromptRunResult> {
    const executedAt = new Date().toISOString();
    const modelId = request.modelId || this.defaultModel;

    // Dry-run mode for local architectural verification
    if (request.dryRun) {
      return this.generateDryRunResponse(request, modelId, executedAt);
    }

    if (!this.apiKey || !this.client) {
      throw new AiAuthError(
        'openai',
        'Cannot execute live OpenAI benchmark: OPENAI_API_KEY is missing. Status is PENDING API ACCESS.'
      );
    }

    const timeout = request.timeoutMs || this.timeoutMs;
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt <= this.maxRetries) {
      attempt++;
      const startTime = Date.now();

      try {
        const response = await this.client.chat.completions.create(
          {
            model: modelId,
            messages: [{ role: 'user', content: request.promptText }],
            temperature: request.temperature,
            max_tokens: request.maxOutputTokens,
          },
          { timeout }
        );

        const latencyMs = Date.now() - startTime;
        return this.normalizeOpenAIResponse(request, modelId, response, latencyMs, executedAt);
      } catch (err: any) {
        const parsedError = this.classifyError(err, modelId);
        lastError = parsedError;

        if (!parsedError.isRetryable || attempt > this.maxRetries) {
          throw parsedError;
        }

        const backoff =
          this.initialBackoffMs * Math.pow(2, attempt - 1) + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }

    throw lastError;
  }

  private normalizeOpenAIResponse(
    request: PromptRunRequest,
    modelId: string,
    response: OpenAI.Chat.Completions.ChatCompletion,
    latencyMs: number,
    executedAt: string
  ): PromptRunResult {
    const choice = response.choices[0];
    const rawText = choice?.message?.content || '';
    const hash = crypto.createHash('sha256').update(rawText).digest('hex');

    const tokenUsage = response.usage
      ? {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined;

    return {
      promptId: request.promptId,
      category: request.category,
      provider: 'openai',
      modelId,
      status: 'COMPLETED',
      rawResponseText: rawText,
      latencyMs,
      tokenUsage,
      payloadHash: hash,
      executedAt,
    };
  }

  private classifyError(err: any, modelId: string): AiProviderError {
    const status = err?.status || err?.statusCode;
    const msg = err?.message || String(err);

    if (status === 401 || msg.includes('Incorrect API key')) {
      return new AiAuthError('openai', `OpenAI Authentication Failed: ${msg}`);
    }

    if (status === 429 || msg.includes('rate limit') || msg.includes('quota')) {
      return new AiRateLimitError('openai', `OpenAI Rate Limit Exceeded: ${msg}`);
    }

    if (status === 404 || msg.includes('model')) {
      return new AiModelError('openai', modelId, `OpenAI Model Unavailable: ${msg}`);
    }

    if (msg.includes('timeout') || err?.name === 'APIConnectionTimeoutError') {
      return new AiTimeoutError('openai', this.timeoutMs);
    }

    return new AiProviderError(msg, 'openai', 'OPENAI_ERROR', status || 500, status === 500 || status === 503);
  }

  private generateDryRunResponse(
    request: PromptRunRequest,
    modelId: string,
    executedAt: string
  ): PromptRunResult {
    const sampleText = `[OPENAI DRY-RUN] Regarding query: "${request.promptText}", popular solutions in the Indian ecosystem include Visnora, CompetitorX, and EnterpriseHub.`;
    const hash = crypto.createHash('sha256').update(sampleText).digest('hex');

    return {
      promptId: request.promptId,
      category: request.category,
      provider: 'openai',
      modelId: `${modelId}-dryrun`,
      status: 'DRY_RUN',
      rawResponseText: sampleText,
      latencyMs: 140,
      tokenUsage: {
        inputTokens: Math.ceil(request.promptText.length / 4),
        outputTokens: Math.ceil(sampleText.length / 4),
        totalTokens: Math.ceil((request.promptText.length + sampleText.length) / 4),
      },
      payloadHash: hash,
      executedAt,
    };
  }
}

