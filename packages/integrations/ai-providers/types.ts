// Visnora — Unified AI Provider Interfaces & Contracts
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/DATA_METHODOLOGY.md

export type ProviderType = 'google-gemini' | 'openai';

export interface PromptRunRequest {
  promptId: string;
  promptText: string;
  category?: string;
  modelId?: string;
  targetLocale?: string;
  enableGrounding?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  dryRun?: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface GroundingWebSource {
  uri: string;
  title: string;
  domain: string;
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  sources?: GroundingWebSource[];
  groundingSupports?: Array<{
    segmentText: string;
    groundingChunkIndices: number[];
    confidenceScores?: number[];
  }>;
}

export interface PromptRunResult {
  promptId: string;
  category?: string;
  provider: ProviderType;
  modelId: string;
  status: 'COMPLETED' | 'FAILED' | 'DRY_RUN';
  rawResponseText: string;
  latencyMs: number;
  tokenUsage?: TokenUsage;
  groundingMetadata?: GroundingMetadata;
  rawPayload?: Record<string, unknown>;
  payloadHash?: string;
  errorCode?: string;
  errorMessage?: string;
  executedAt: string;
}

export interface AiProviderAdapter {
  readonly provider: ProviderType;
  readonly defaultModel: string;
  runPrompt(request: PromptRunRequest): Promise<PromptRunResult>;
  verifyCredentials(): Promise<{ valid: boolean; message: string; availableModels?: string[] }>;
}

// -----------------------------------------------------------------------------
// STANDARDIZED PROVIDER ERROR CLASSES
// -----------------------------------------------------------------------------

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderType,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}

export class AiAuthError extends AiProviderError {
  constructor(provider: ProviderType, message: string) {
    super(message, provider, 'AUTH_FAILED', 401, false);
    this.name = 'AiAuthError';
  }
}

export class AiRateLimitError extends AiProviderError {
  constructor(provider: ProviderType, message: string, public readonly retryAfterSeconds?: number) {
    super(message, provider, 'RATE_LIMITED', 429, true);
    this.name = 'AiRateLimitError';
  }
}

export class AiTimeoutError extends AiProviderError {
  constructor(provider: ProviderType, timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`, provider, 'TIMEOUT', 408, true);
    this.name = 'AiTimeoutError';
  }
}

export class AiModelError extends AiProviderError {
  constructor(provider: ProviderType, modelId: string, message: string) {
    super(`Model error (${modelId}): ${message}`, provider, 'MODEL_ERROR', 400, false);
    this.name = 'AiModelError';
  }
}

export class AiGroundingQuotaError extends AiProviderError {
  constructor(provider: ProviderType, message: string) {
    super(
      `Search Grounding quota exhausted or billing plan required: ${message}`,
      provider,
      'GROUNDING_QUOTA_EXHAUSTED',
      429,
      false
    );
    this.name = 'AiGroundingQuotaError';
  }
}

export class AiQuotaExhaustedError extends AiProviderError {
  constructor(
    provider: ProviderType,
    message: string,
    public readonly quotaDomain: 'text' | 'grounding' | 'general' = 'general'
  ) {
    super(
      `Quota exhausted (${quotaDomain}): ${message}`,
      provider,
      quotaDomain === 'grounding' ? 'GROUNDING_QUOTA_EXHAUSTED' : 'QUOTA_EXHAUSTED',
      429,
      false
    );
    this.name = 'AiQuotaExhaustedError';
  }
}

export class AiCapacityError extends AiProviderError {
  constructor(provider: ProviderType, modelId: string, message: string) {
    super(
      `Model capacity exhausted / high demand (${modelId}): ${message}`,
      provider,
      'CAPACITY_EXHAUSTED',
      503,
      true
    );
    this.name = 'AiCapacityError';
  }
}


