import { describe, it, expect } from 'vitest';
import { GeminiAdapter } from '../../packages/integrations/ai-providers/gemini';
import {
  AiAuthError,
  AiGroundingQuotaError,
  AiQuotaExhaustedError,
  AiCapacityError,
  AiRateLimitError,
} from '../../packages/integrations/ai-providers/types';

describe('Gemini Provider Adapter', () => {
  it('executes a dry-run prompt successfully without external API calls', async () => {
    const adapter = new GeminiAdapter();
    const result = await adapter.runPrompt({
      promptId: 'TEST-001',
      promptText: 'What are the top AI search visibility tools?',
      dryRun: true,
    });

    expect(result.status).toBe('DRY_RUN');
    expect(result.provider).toBe('google-gemini');
    expect(result.rawResponseText).toContain('[DRY-RUN SIMULATION]');
    expect(result.tokenUsage).toBeDefined();
    expect(result.groundingMetadata?.sources?.length).toBeGreaterThan(0);
    expect(result.payloadHash).toBeDefined();
  });

  it('throws AiAuthError when running live mode without an API key', async () => {
    const adapter = new GeminiAdapter({ apiKey: undefined });
    await expect(
      adapter.runPrompt({
        promptId: 'TEST-002',
        promptText: 'Live test without key',
        dryRun: false,
      })
    ).rejects.toThrow(AiAuthError);
  });

  it('returns valid: false when credentials check fails without key', async () => {
    const adapter = new GeminiAdapter({ apiKey: undefined });
    const check = await adapter.verifyCredentials();
    expect(check.valid).toBe(false);
    expect(check.message).toContain('GEMINI_API_KEY');
  });

  it('correctly classifies search grounding 429 quota exhaustion as AiGroundingQuotaError', () => {
    const adapter = new GeminiAdapter({ apiKey: 'mock-key' });
    const rawError = {
      status: 429,
      message: 'You exceeded your current quota, please check your plan and billing details.',
    };

    // When enableGrounding is true
    const parsed = (adapter as any).classifyError(rawError, 'gemini-3.8-flash', true);
    expect(parsed).toBeInstanceOf(AiGroundingQuotaError);
    expect(parsed.code).toBe('GROUNDING_QUOTA_EXHAUSTED');
    expect(parsed.statusCode).toBe(429);
    expect(parsed.isRetryable).toBe(false); // Does not waste backoff retries on plan quota exhaustion
  });

  it('correctly classifies text quota 429 exhaustion as AiQuotaExhaustedError when grounding is off', () => {
    const adapter = new GeminiAdapter({ apiKey: 'mock-key' });
    const rawError = {
      status: 429,
      message: 'You exceeded your current quota, please check your plan and billing details.',
    };

    // When enableGrounding is false
    const parsed = (adapter as any).classifyError(rawError, 'gemini-3.8-flash', false);
    expect(parsed).toBeInstanceOf(AiQuotaExhaustedError);
    expect(parsed.code).toBe('QUOTA_EXHAUSTED');
    expect(parsed.statusCode).toBe(429);
    expect(parsed.isRetryable).toBe(false);
  });

  it('correctly classifies temporary 503 high demand as AiCapacityError', () => {
    const adapter = new GeminiAdapter({ apiKey: 'mock-key' });
    const rawError = {
      status: 503,
      message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.',
    };

    const parsed = (adapter as any).classifyError(rawError, 'gemini-3.8-flash', false);
    expect(parsed).toBeInstanceOf(AiCapacityError);
    expect(parsed.code).toBe('CAPACITY_EXHAUSTED');
    expect(parsed.statusCode).toBe(503);
    expect(parsed.isRetryable).toBe(true);
  });
});


