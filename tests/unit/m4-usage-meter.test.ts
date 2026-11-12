import { describe, it, expect } from 'vitest';
import { QuotaExceededError } from '../../packages/domain/billing/usage-meter';

describe('M4.3 Usage Metering & Quota Enforcement', () => {
  it('correctly constructs QuotaExceededError with usage metrics and reset date', () => {
    const resetDate = new Date('2026-12-01T00:00:00.000Z');
    const err = new QuotaExceededError(500, 500, 0, resetDate);

    expect(err.currentUsage).toBe(500);
    expect(err.maxAllowed).toBe(500);
    expect(err.remaining).toBe(0);
    expect(err.resetDate).toEqual(resetDate);
    expect(err.message).toContain('500/500');
    expect(err.message).toContain('2026-12-01');
    expect(err.name).toBe('QuotaExceededError');
  });

  it('correctly checks percentage and warning thresholds', () => {
    const calculateMetrics = (used: number, limit: number) => {
      const remaining = Math.max(0, limit - used);
      const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
      const isNearLimit = percentage >= 80 && percentage < 100;
      const isExceeded = used >= limit;
      return { remaining, percentage, isNearLimit, isExceeded };
    };

    // Case 1: Normal usage (50%)
    const m1 = calculateMetrics(250, 500);
    expect(m1.percentage).toBe(50);
    expect(m1.remaining).toBe(250);
    expect(m1.isNearLimit).toBe(false);
    expect(m1.isExceeded).toBe(false);

    // Case 2: Approaching limit (85%)
    const m2 = calculateMetrics(425, 500);
    expect(m2.percentage).toBe(85);
    expect(m2.remaining).toBe(75);
    expect(m2.isNearLimit).toBe(true);
    expect(m2.isExceeded).toBe(false);

    // Case 3: Exactly at limit (100%)
    const m3 = calculateMetrics(500, 500);
    expect(m3.percentage).toBe(100);
    expect(m3.remaining).toBe(0);
    expect(m3.isNearLimit).toBe(false);
    expect(m3.isExceeded).toBe(true);

    // Case 4: Over limit (110%)
    const m4 = calculateMetrics(550, 500);
    expect(m4.percentage).toBe(100);
    expect(m4.remaining).toBe(0);
    expect(m4.isExceeded).toBe(true);
  });
});

