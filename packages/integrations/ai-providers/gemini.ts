// Visnora — Google Gemini Provider Adapter (Official @google/genai SDK)
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/INTEGRATIONS.md

import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
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
  AiGroundingQuotaError,
  AiQuotaExhaustedError,
  AiCapacityError,
  GroundingMetadata,
  GroundingWebSource,
} from './types';

export interface GeminiAdapterConfig {
  apiKey?: string;
  defaultModel?: string;
  maxRetries?: number;
  initialBackoffMs?: number;
  timeoutMs?: number;
}

export class GeminiAdapter implements AiProviderAdapter {
  readonly provider: ProviderType = 'google-gemini';
  readonly defaultModel: string;
  private readonly apiKey: string | undefined;
  private readonly maxRetries: number;
  private readonly initialBackoffMs: number;
  private readonly timeoutMs: number;
  private client: GoogleGenAI | null = null;

  constructor(config: GeminiAdapterConfig = {}) {
    // Read key exclusively from environment variables or passed config (which also pulls from env)
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.defaultModel = config.defaultModel || 'gemini-3.8-flash';
    this.maxRetries = config.maxRetries ?? 3;
    this.initialBackoffMs = config.initialBackoffMs ?? 1000;
    this.timeoutMs = config.timeoutMs ?? 45000;

    if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  /**
   * Verifies the configured Gemini API key by making a lightweight request.
   */
  async verifyCredentials(): Promise<{ valid: boolean; message: string; availableModels?: string[] }> {
    if (!this.apiKey) {
      return {
        valid: false,
        message: 'GEMINI_API_KEY is not configured in environment variables.',
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`
      );
      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `HTTP ${response.status}`;
        const reason = data.error?.details?.[0]?.reason || 'UNKNOWN';
        return {
          valid: false,
          message: `Google Gemini API rejected key: ${errorMsg} (Reason: ${reason})`,
        };
      }

      const models: string[] = (data.models || []).map((m: { name: string }) =>
        m.name.replace('models/', '')
      );
      return {
        valid: true,
        message: 'Google Gemini API key successfully verified.',
        availableModels: models,
      };
    } catch (err) {
      return {
        valid: false,
        message: `Network failure while verifying Gemini credentials: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Executes a prompt run against the Gemini API with timeout, retry, and metric tracking.
   */
  async runPrompt(request: PromptRunRequest): Promise<PromptRunResult> {
    const executedAt = new Date().toISOString();
    const modelId = request.modelId || this.defaultModel;

    // Dry-run mode bypasses paid API calls completely
    if (request.dryRun) {
      return this.generateDryRunResponse(request, modelId, executedAt);
    }

    if (!this.apiKey || !this.client) {
      throw new AiAuthError(
        'google-gemini',
        'Cannot execute live Gemini benchmark: GEMINI_API_KEY is missing from environment variables.'
      );
    }

    const timeout = request.timeoutMs || this.timeoutMs;
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt <= this.maxRetries) {
      attempt++;
      const startTime = Date.now();

      try {
        const result = await this.executeWithTimeout(request, modelId, timeout);
        const latencyMs = Date.now() - startTime;
        return this.normalizeGeminiResponse(request, modelId, result, latencyMs, executedAt);
      } catch (err) {
        const parsedError = this.classifyError(err, modelId, request.enableGrounding);
        lastError = parsedError;

        if (!parsedError.isRetryable || attempt > this.maxRetries) {
          throw parsedError;
        }

        // Exponential backoff with jitter
        const backoff =
          this.initialBackoffMs * Math.pow(2, attempt - 1) + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }

    throw lastError;
  }

  private async executeWithTimeout(
    request: PromptRunRequest,
    modelId: string,
    timeoutMs: number
  ): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Configuration for Gemini model call
      const config: Record<string, unknown> = {};

      if (request.temperature !== undefined) {
        config.temperature = request.temperature;
      }
      if (request.maxOutputTokens !== undefined) {
        config.maxOutputTokens = request.maxOutputTokens;
      }
      if (request.enableGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      // Execute via the official GoogleGenAI client
      const response = await this.client!.models.generateContent({
        model: modelId,
        contents: request.promptText,
        config: Object.keys(config).length > 0 ? (config as any) : undefined,
      });

      return response;
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        throw new AiTimeoutError('google-gemini', timeoutMs);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private normalizeGeminiResponse(
    request: PromptRunRequest,
    modelId: string,
    response: any,
    latencyMs: number,
    executedAt: string
  ): PromptRunResult {
    const rawText = response.text || '';
    const hash = crypto.createHash('sha256').update(rawText).digest('hex');

    // Extract token usage
    const usage = response.usageMetadata;
    const tokenUsage = usage
      ? {
          inputTokens: usage.promptTokenCount || 0,
          outputTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
        }
      : undefined;

    // Extract Google Search Grounding metadata if present
    let groundingMetadata: GroundingMetadata | undefined;
    const candidate = response.candidates?.[0];
    const rawGrounding = candidate?.groundingMetadata;

    if (rawGrounding) {
      const sources: GroundingWebSource[] = [];
      const chunks = rawGrounding.groundingChunks || [];

      for (const chunk of chunks) {
        if (chunk.web?.uri) {
          try {
            const urlObj = new URL(chunk.web.uri);
            sources.push({
              uri: chunk.web.uri,
              title: chunk.web.title || urlObj.hostname,
              domain: urlObj.hostname.replace(/^www\./, ''),
            });
          } catch {
            sources.push({
              uri: chunk.web.uri,
              title: chunk.web.title || chunk.web.uri,
              domain: 'unknown',
            });
          }
        }
      }

      groundingMetadata = {
        webSearchQueries: rawGrounding.webSearchQueries || [],
        sources,
        groundingSupports: (rawGrounding.groundingSupports || []).map((s: any) => ({
          segmentText: s.segment?.text || '',
          groundingChunkIndices: s.groundingChunkIndices || [],
          confidenceScores: s.confidenceScores || [],
        })),
      };
    }

    return {
      promptId: request.promptId,
      category: request.category,
      provider: 'google-gemini',
      modelId,
      status: 'COMPLETED',
      rawResponseText: rawText,
      latencyMs,
      tokenUsage,
      groundingMetadata,
      payloadHash: hash,
      executedAt,
    };
  }

  private classifyError(
    err: any,
    modelId: string,
    groundingRequested: boolean = false
  ): AiProviderError {
    const msg = err?.message || String(err);
    const status = err?.status || err?.code || err?.statusCode;

    // 1. Authentication / Permission errors (400 / 401 / 403 API_KEY_INVALID)
    if (
      msg.includes('API_KEY_INVALID') ||
      msg.includes('API key not valid') ||
      status === 401 ||
      status === 403
    ) {
      return new AiAuthError('google-gemini', `Authentication error: ${msg}`);
    }

    // 2. Search Grounding Quota Exhaustion / Billing Plan Required
    // Triggered when request requested grounding and Google returned 429 RESOURCE_EXHAUSTED
    if (
      groundingRequested &&
      (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED'))
    ) {
      return new AiGroundingQuotaError(
        'google-gemini',
        `Search Grounding quota exhausted or billing required on Google AI Studio / Cloud project. Raw error: ${msg}`
      );
    }

    // 3. Text Generation Quota Exhaustion (plan & billing limit exceeded)
    if (
      (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) &&
      (msg.includes('check your plan and billing details') || msg.includes('quota'))
    ) {
      return new AiQuotaExhaustedError('google-gemini', `Plan or project quota exhausted: ${msg}`, 'text');
    }

    // 4. Temporary Service Capacity / High Demand / Overloaded (HTTP 503 UNAVAILABLE)
    if (
      status === 503 ||
      msg.includes('503') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('high demand') ||
      msg.includes('try again later')
    ) {
      return new AiCapacityError(
        'google-gemini',
        modelId,
        `Service temporarily unavailable due to high demand: ${msg}`
      );
    }

    // 5. Transient Rate Limiting (standard RPM/RPD throttle)
    if (status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      return new AiRateLimitError('google-gemini', `Rate limit exceeded: ${msg}`);
    }

    // 6. Model Not Found / Invalid (HTTP 404)
    if (
      status === 404 ||
      msg.includes('404') ||
      msg.includes('NOT_FOUND') ||
      msg.includes('model not found')
    ) {
      return new AiModelError('google-gemini', modelId, `Model unavailable or invalid: ${msg}`);
    }

    if (err instanceof AiTimeoutError) {
      return err;
    }

    return new AiProviderError(
      msg,
      'google-gemini',
      'UNKNOWN_ERROR',
      typeof status === 'number' ? status : 500,
      true
    );
  }

  private generateDryRunResponse(
    request: PromptRunRequest,
    modelId: string,
    executedAt: string
  ): PromptRunResult {
    const sampleText = `[DRY-RUN SIMULATION] For query: "${request.promptText}", leading solutions in the Indian market include Visnora AI, Semrush, and Ahrefs. Citations provided via Google Search Grounding indicate domain authority references on g2.com and yourstory.com.`;
    const hash = crypto.createHash('sha256').update(sampleText).digest('hex');

    return {
      promptId: request.promptId,
      category: request.category,
      provider: 'google-gemini',
      modelId: `${modelId}-dryrun`,
      status: 'DRY_RUN',
      rawResponseText: sampleText,
      latencyMs: 120,
      tokenUsage: {
        inputTokens: Math.ceil(request.promptText.length / 4),
        outputTokens: Math.ceil(sampleText.length / 4),
        totalTokens: Math.ceil((request.promptText.length + sampleText.length) / 4),
      },
      groundingMetadata: {
        webSearchQueries: [request.promptText],
        sources: [
          { uri: 'https://www.g2.com/categories/seo-software', title: 'G2 SEO Software', domain: 'g2.com' },
          { uri: 'https://yourstory.com/companies/visnora', title: 'YourStory Visnora Profile', domain: 'yourstory.com' },
        ],
      },
      payloadHash: hash,
      executedAt,
    };
  }
}

