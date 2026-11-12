// Visnora — M6 Campaign Validation & Safety Rules Unit Tests

import { describe, it, expect } from 'vitest';
import {
  CampaignValidationError,
  FinancialConfirmationRequiredError,
} from '../../packages/domain/chatgpt-ads/campaign-service';

describe('M6 Campaign Safety & Validation Rules', () => {
  it('instantiates CampaignValidationError with appropriate message', () => {
    const err = new CampaignValidationError('Campaign budget must be greater than zero.');
    expect(err.name).toBe('CampaignValidationError');
    expect(err.message).toBe('Campaign budget must be greater than zero.');
  });

  it('instantiates FinancialConfirmationRequiredError for consequential financial actions', () => {
    const err = new FinancialConfirmationRequiredError('activate_campaign');
    expect(err.name).toBe('FinancialConfirmationRequiredError');
    expect(err.message).toContain('activate_campaign');
    expect(err.message).toContain('financial confirmation');
  });
});

