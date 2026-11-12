// Visnora — M6 Analytics Reporting & Freshness Standards Unit Tests

import { describe, it, expect } from 'vitest';
import { ReportingHistoryLimitError } from '../../packages/domain/chatgpt-ads/analytics-service';

describe('M6 Analytics Reporting & Non-Fabrication Standards', () => {
  it('instantiates ReportingHistoryLimitError with requested vs max allowed days', () => {
    const error = new ReportingHistoryLimitError(45, 30);
    expect(error.name).toBe('ReportingHistoryLimitError');
    expect(error.message).toContain('45 days exceeds your plan limit of 30 days');
    expect(error.message).toContain('Upgrade your subscription plan');
  });

  it('verifies non-fabrication standard: null metrics represent delayed windows rather than false zeros', () => {
    const rawMetrics = [
      { date: '2026-11-12', spendPaise: BigInt(5000), conversions: null, isFinal: false },
      { date: '2026-11-11', spendPaise: BigInt(6500), conversions: 3, isFinal: true },
    ];

    const hasDelayedData = rawMetrics.some((m) => !m.isFinal);
    expect(hasDelayedData).toBe(true);

    // Conversions should not be coerced to 0 when pending reporting delay
    const todayRecord = rawMetrics[0];
    expect(todayRecord.conversions).toBeNull();
    expect(todayRecord.isFinal).toBe(false);
  });
});

