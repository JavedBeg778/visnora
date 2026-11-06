import { describe, it, expect } from 'vitest';
import { OpenAIAdapter } from '../../packages/integrations/ai-providers/openai';
import { AiAuthError } from '../../packages/integrations/ai-providers/types';

describe('OpenAI Provider Adapter Architecture', () => {
  it('executes a dry-run prompt successfully without paid API calls', async () => {
    const adapter = new OpenAIAdapter();
    const result = await adapter.runPrompt({
      promptId: 'OAI-001',
      promptText: 'What are the top marketing intelligence tools?',
      dryRun: true,
    });

    expect(result.status).toBe('DRY_RUN');
    expect(result.provider).toBe('openai');
    expect(result.rawResponseText).toContain('[OPENAI DRY-RUN]');
    expect(result.tokenUsage).toBeDefined();
    expect(result.payloadHash).toBeDefined();
  });

  it('reports PENDING API ACCESS when credentials are not configured', async () => {
    const adapter = new OpenAIAdapter({ apiKey: undefined });
    const check = await adapter.verifyCredentials();
    expect(check.valid).toBe(false);
    expect(check.message).toContain('PENDING API ACCESS');
  });

  it('throws AiAuthError when running live mode without API key', async () => {
    const adapter = new OpenAIAdapter({ apiKey: undefined });
    await expect(
      adapter.runPrompt({
        promptId: 'OAI-002',
        promptText: 'Live test without key',
        dryRun: false,
      })
    ).rejects.toThrow(AiAuthError);
  });
});

