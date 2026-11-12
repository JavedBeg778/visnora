// Visnora — M6 Multi-Tenant Isolation & Error Guards Unit Tests

import { describe, it, expect } from 'vitest';
import { AdsAccountNotFoundError, AdsAccountLimitError } from '../../packages/domain/chatgpt-ads/account-service';
import { CampaignNotFoundError } from '../../packages/domain/chatgpt-ads/campaign-service';
import { AdGroupNotFoundError } from '../../packages/domain/chatgpt-ads/ad-group-service';
import { AdNotFoundError } from '../../packages/domain/chatgpt-ads/creative-service';
import { AlertNotFoundError } from '../../packages/domain/chatgpt-ads/monitoring-service';

describe('M6 Multi-Tenant Isolation & Account Limit Guards', () => {
  it('throws AdsAccountNotFoundError when cross-tenant account is accessed', () => {
    const err = new AdsAccountNotFoundError('cross-tenant-acc-id');
    expect(err.name).toBe('AdsAccountNotFoundError');
    expect(err.message).toContain('not found or unauthorized');
  });

  it('throws AdsAccountLimitError when connected accounts exceed plan limits', () => {
    const err = new AdsAccountLimitError(1, 1);
    expect(err.name).toBe('AdsAccountLimitError');
    expect(err.message).toContain('Connected ChatGPT Ads account limit reached (1/1)');
    expect(err.message).toContain('Upgrade your subscription plan');
  });

  it('throws CampaignNotFoundError for cross-tenant campaign access', () => {
    const err = new CampaignNotFoundError('foreign-camp-id');
    expect(err.name).toBe('CampaignNotFoundError');
    expect(err.message).toContain('foreign-camp-id');
  });

  it('throws AdGroupNotFoundError for cross-tenant ad group access', () => {
    const err = new AdGroupNotFoundError('foreign-ag-id');
    expect(err.name).toBe('AdGroupNotFoundError');
  });

  it('throws AdNotFoundError for cross-tenant ad access', () => {
    const err = new AdNotFoundError('foreign-ad-id');
    expect(err.name).toBe('AdNotFoundError');
  });

  it('throws AlertNotFoundError for cross-tenant alert access', () => {
    const err = new AlertNotFoundError('foreign-alert-id');
    expect(err.name).toBe('AlertNotFoundError');
  });
});

