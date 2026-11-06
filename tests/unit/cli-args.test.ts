import { describe, it, expect } from 'vitest';
import { parseCliArgs } from '../../packages/integrations/ai-providers/benchmark-runner';

describe('Benchmark Runner CLI Argument Parsing', () => {
  it('allows user-supplied --limit to override earlier default --limit', () => {
    // Simulates npm run benchmark:gemini:text -- --limit=1
    const args = ['--provider=google-gemini', '--limit=3', '--limit=1'];
    const parsed = parseCliArgs(args);
    expect(parsed.limit).toBe(1);
    expect(parsed.provider).toBe('google-gemini');
  });

  it('supports space-separated --limit arguments and overrides earlier limits', () => {
    const args = ['--limit=3', '--limit', '1'];
    const parsed = parseCliArgs(args);
    expect(parsed.limit).toBe(1);
  });

  it('supports --model=<model-id> and space-separated --model', () => {
    const parsed1 = parseCliArgs(['--model=gemini-3.5-flash-lite']);
    expect(parsed1.modelId).toBe('gemini-3.5-flash-lite');

    const parsed2 = parseCliArgs(['--model', 'gemini-3.8-flash']);
    expect(parsed2.modelId).toBe('gemini-3.8-flash');
  });

  it('defaults grounding to undefined / false and requires explicit opt-in', () => {
    const defaultArgs = parseCliArgs(['--limit=1']);
    expect(defaultArgs.enableGrounding).toBeUndefined();

    const optIn = parseCliArgs(['--grounding']);
    expect(optIn.enableGrounding).toBe(true);

    const explicitOff = parseCliArgs(['--grounding', '--no-grounding']);
    expect(explicitOff.enableGrounding).toBe(false);
  });

  it('correctly handles --dry-run and preserves provider selection', () => {
    const parsed = parseCliArgs(['--dry-run', '--provider=openai']);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.provider).toBe('openai');
  });
});

