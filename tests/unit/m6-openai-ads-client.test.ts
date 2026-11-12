import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  encryptAdsApiKey,
  decryptAdsApiKey,
  scrubAdsApiKey,
} from '../../packages/integrations/openai-ads/credential-vault';
import {
  OpenAiAdsClient,
  OpenAiAdsApiError,
} from '../../packages/integrations/openai-ads/client';

describe('Phase M6.1 — OpenAI Ads Client & Credential Vault', () => {
  const TEST_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    process.env.OPENAI_ADS_ENCRYPTION_KEY = TEST_MASTER_KEY;
  });

  describe('Credential Encryption & Vault', () => {
    it('encrypts and decrypts an advertiser API key losslessly with AES-256-GCM', () => {
      const apiKey = 'oa_ads_live_sec_99482710384729104859';
      const encrypted = encryptAdsApiKey(apiKey);

      expect(encrypted.encryptedKey).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.keyPrefix).toBe('oa_ads_l');
      expect(encrypted.lastFour).toBe('4859');

      const decrypted = decryptAdsApiKey(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    it('throws meaningful configuration error when encryption key is missing or invalid length', () => {
      delete process.env.OPENAI_ADS_ENCRYPTION_KEY;
      delete process.env.APP_ENCRYPTION_KEY;

      expect(() => encryptAdsApiKey('some_key_12345')).toThrow(
        /Missing encryption secret/
      );

      process.env.OPENAI_ADS_ENCRYPTION_KEY = 'short_key';
      expect(() => encryptAdsApiKey('some_key_12345')).toThrow(
        /Invalid encryption key length/
      );
    });

    it('scrubs API keys safely for logging and display without secret leakage', () => {
      expect(scrubAdsApiKey('oa_ads_live_sec_99482710384729104859')).toBe('oa_ads...4859');
      expect(scrubAdsApiKey('short')).toBe('[REDACTED]');
      expect(scrubAdsApiKey(null)).toBe('[REDACTED]');
    });
  });

  describe('OpenAiAdsClient Request & Campaign Rules', () => {
    it('initializes client and enforces base URL normalization', () => {
      const client = new OpenAiAdsClient({
        apiKey: 'oa_ads_test_12345',
        baseUrl: 'https://api.ads.openai.com/',
      });
      expect(client).toBeDefined();
    });

    it('throws error when initializing with empty API key', () => {
      expect(() => new OpenAiAdsClient({ apiKey: '  ' })).toThrow(
        /requires a non-empty apiKey/
      );
    });

    it('enforces safety rule: new campaigns default to PAUSED state', async () => {
      const client = new OpenAiAdsClient({
        apiKey: 'oa_ads_test_key_123',
        baseUrl: 'https://api.ads.openai.com',
      });

      // Mock internal fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'camp_123',
          name: 'Q4 ChatGPT Promotion',
          objective: 'TRAFFIC',
          status: 'PAUSED',
          budget: { amount: 500000, type: 'daily', currency: 'USD' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
      global.fetch = mockFetch;

      const created = await client.createCampaign({
        name: 'Q4 ChatGPT Promotion',
        objective: 'TRAFFIC',
        budget: { amount: 500000, type: 'daily', currency: 'USD' },
      });

      expect(mockFetch).toHaveBeenCalled();
      const sentPayload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(sentPayload.status).toBe('PAUSED');
      expect(created.status).toBe('PAUSED');
    });

    it('normalizes API error responses into OpenAiAdsApiError without secret leakage', async () => {
      const client = new OpenAiAdsClient({
        apiKey: 'oa_ads_test_secret_key',
        baseUrl: 'https://api.ads.openai.com',
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Advertiser account API key has expired or is invalid.',
          },
        }),
      });

      await expect(client.verifyAccount()).rejects.toThrow(OpenAiAdsApiError);
      try {
        await client.verifyAccount();
      } catch (err: any) {
        expect(err.statusCode).toBe(401);
        expect(err.errorCode).toBe('INVALID_CREDENTIALS');
        expect(err.message).not.toContain('oa_ads_test_secret_key');
      }
    });
  });
});

