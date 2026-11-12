// Visnora — Official OpenAI Ads Advertiser API Client
// Reference: https://developers.openai.com/ads/ & Base URL: https://api.ads.openai.com

import {
  OpenAiAdAccountResponse,
  OpenAiCampaignRequest,
  OpenAiCampaignResponse,
  OpenAiAdGroupRequest,
  OpenAiAdGroupResponse,
  OpenAiAdRequest,
  OpenAiAdResponse,
  OpenAiAssetUploadResponse,
  OpenAiInsightsRequest,
  OpenAiInsightsResponse,
  OpenAiConversionEventRequest,
  OpenAiConversionResponse,
} from './types';
import { scrubAdsApiKey } from './credential-vault';

export class OpenAiAdsApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'OpenAiAdsApiError';
  }
}

export interface OpenAiAdsClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class OpenAiAdsClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: OpenAiAdsClientConfig) {
    if (!config.apiKey || !config.apiKey.trim()) {
      throw new Error('OpenAiAdsClient requires a non-empty apiKey.');
    }
    this.apiKey = config.apiKey.trim();
    this.baseUrl = (config.baseUrl || process.env.OPENAI_ADS_API_BASE_URL || 'https://api.ads.openai.com').replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs || 30000;
    this.maxRetries = config.maxRetries ?? 3;
  }

  /**
   * Internal HTTP execution with retries, timeout, and secret redaction.
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      body?: any;
      query?: Record<string, string | number | boolean | undefined>;
      idempotencyKey?: string;
      isFormData?: boolean;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, query, idempotencyKey, isFormData = false } = options;

    let urlString = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    if (query) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) {
          searchParams.append(k, String(v));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        urlString += (urlString.includes('?') ? '&' : '?') + qs;
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      'User-Agent': 'Visnora-Ads-Client/1.0',
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(urlString, {
          method,
          headers,
          body: isFormData ? body : body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle Rate Limits (HTTP 429)
        if (response.status === 429) {
          const retryAfterSec = parseInt(response.headers.get('Retry-After') || '2', 10);
          const waitTimeMs = Math.min(Math.max(retryAfterSec * 1000, 1000), 10000);
          console.warn(`[OpenAiAdsClient] Rate limited (429). Retrying after ${waitTimeMs}ms (attempt ${attempt}/${this.maxRetries})`);
          if (attempt < this.maxRetries) {
            await new Promise((r) => setTimeout(r, waitTimeMs));
            continue;
          }
        }

        // Handle Server Errors (HTTP 5xx) with exponential backoff
        if (response.status >= 500 && attempt < this.maxRetries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
          console.warn(`[OpenAiAdsClient] Server error (${response.status}). Retrying in ${backoff}ms (attempt ${attempt}/${this.maxRetries})`);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const errCode = data?.error?.code || `HTTP_${response.status}`;
          const errMsg = data?.error?.message || response.statusText || 'OpenAI Ads API request failed';
          throw new OpenAiAdsApiError(
            `OpenAI Ads API error (${response.status}): ${errMsg}`,
            response.status,
            errCode,
            data?.error?.details
          );
        }

        return data as T;
      } catch (err: any) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
          lastError = new OpenAiAdsApiError(`OpenAI Ads API request timed out after ${this.timeoutMs}ms`, 408, 'TIMEOUT');
        } else if (err instanceof OpenAiAdsApiError) {
          throw err; // Client errors are non-retryable
        } else {
          lastError = new OpenAiAdsApiError(`Network failure contacting OpenAI Ads API: ${err.message}`, 503, 'NETWORK_ERROR');
        }

        if (attempt < this.maxRetries && method === 'GET') {
          const backoff = 1000 * attempt;
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new OpenAiAdsApiError('OpenAI Ads API request failed after retries', 500);
  }

  // ---------------------------------------------------------------------------
  // 1. ACCOUNT VERIFICATION & DETAILS (GET /v1/ad_account)
  // ---------------------------------------------------------------------------

  /**
   * Verifies the provided credentials and retrieves the connected advertiser account metadata.
   */
  async verifyAccount(): Promise<OpenAiAdAccountResponse> {
    return this.request<OpenAiAdAccountResponse>('/v1/ad_account', { method: 'GET' });
  }

  // ---------------------------------------------------------------------------
  // 2. CAMPAIGN MANAGEMENT (/v1/campaigns)
  // ---------------------------------------------------------------------------

  async listCampaigns(query?: {
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ data: OpenAiCampaignResponse[]; has_more: boolean; next_cursor?: string }> {
    return this.request<{ data: OpenAiCampaignResponse[]; has_more: boolean; next_cursor?: string }>(
      '/v1/campaigns',
      { method: 'GET', query }
    );
  }

  async getCampaign(campaignId: string): Promise<OpenAiCampaignResponse> {
    return this.request<OpenAiCampaignResponse>(`/v1/campaigns/${encodeURIComponent(campaignId)}`, {
      method: 'GET',
    });
  }

  /**
   * Creates a new campaign. Guaranteed default status is PAUSED unless explicitly authorized.
   */
  async createCampaign(
    payload: OpenAiCampaignRequest,
    idempotencyKey?: string
  ): Promise<OpenAiCampaignResponse> {
    // Enforce safety rule: status defaults to PAUSED
    const safePayload: OpenAiCampaignRequest = {
      ...payload,
      status: payload.status || 'PAUSED',
    };
    return this.request<OpenAiCampaignResponse>('/v1/campaigns', {
      method: 'POST',
      body: safePayload,
      idempotencyKey,
    });
  }

  async updateCampaign(
    campaignId: string,
    payload: Partial<OpenAiCampaignRequest>,
    idempotencyKey?: string
  ): Promise<OpenAiCampaignResponse> {
    return this.request<OpenAiCampaignResponse>(`/v1/campaigns/${encodeURIComponent(campaignId)}`, {
      method: 'PATCH',
      body: payload,
      idempotencyKey,
    });
  }

  async pauseCampaign(campaignId: string): Promise<OpenAiCampaignResponse> {
    return this.request<OpenAiCampaignResponse>(`/v1/campaigns/${encodeURIComponent(campaignId)}/pause`, {
      method: 'POST',
    });
  }

  async resumeCampaign(campaignId: string): Promise<OpenAiCampaignResponse> {
    return this.request<OpenAiCampaignResponse>(`/v1/campaigns/${encodeURIComponent(campaignId)}/resume`, {
      method: 'POST',
    });
  }

  // ---------------------------------------------------------------------------
  // 3. AD GROUP MANAGEMENT (/v1/ad_groups)
  // ---------------------------------------------------------------------------

  async listAdGroups(campaignId?: string): Promise<{ data: OpenAiAdGroupResponse[] }> {
    return this.request<{ data: OpenAiAdGroupResponse[] }>('/v1/ad_groups', {
      method: 'GET',
      query: campaignId ? { campaign_id: campaignId } : undefined,
    });
  }

  async createAdGroup(
    payload: OpenAiAdGroupRequest,
    idempotencyKey?: string
  ): Promise<OpenAiAdGroupResponse> {
    const safePayload: OpenAiAdGroupRequest = {
      ...payload,
      status: payload.status || 'PAUSED',
    };
    return this.request<OpenAiAdGroupResponse>('/v1/ad_groups', {
      method: 'POST',
      body: safePayload,
      idempotencyKey,
    });
  }

  async updateAdGroup(
    adGroupId: string,
    payload: Partial<OpenAiAdGroupRequest>,
    idempotencyKey?: string
  ): Promise<OpenAiAdGroupResponse> {
    return this.request<OpenAiAdGroupResponse>(`/v1/ad_groups/${encodeURIComponent(adGroupId)}`, {
      method: 'PATCH',
      body: payload,
      idempotencyKey,
    });
  }

  // ---------------------------------------------------------------------------
  // 4. CREATIVE & ADS MANAGEMENT (/v1/ads & /v1/assets)
  // ---------------------------------------------------------------------------

  async listAds(adGroupId?: string): Promise<{ data: OpenAiAdResponse[] }> {
    return this.request<{ data: OpenAiAdResponse[] }>('/v1/ads', {
      method: 'GET',
      query: adGroupId ? { ad_group_id: adGroupId } : undefined,
    });
  }

  async createAd(payload: OpenAiAdRequest, idempotencyKey?: string): Promise<OpenAiAdResponse> {
    return this.request<OpenAiAdResponse>('/v1/ads', {
      method: 'POST',
      body: payload,
      idempotencyKey,
    });
  }

  async uploadAsset(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<OpenAiAssetUploadResponse> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    formData.append('file', blob, filename);

    return this.request<OpenAiAssetUploadResponse>('/v1/assets', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  // ---------------------------------------------------------------------------
  // 5. REPORTING & INSIGHTS (/v1/insights)
  // ---------------------------------------------------------------------------

  async getInsights(params: OpenAiInsightsRequest): Promise<OpenAiInsightsResponse> {
    return this.request<OpenAiInsightsResponse>('/v1/insights', {
      method: 'GET',
      query: {
        date_start: params.date_start,
        date_end: params.date_end,
        level: params.level,
        campaign_id: params.campaign_id,
        ad_group_id: params.ad_group_id,
        ad_id: params.ad_id,
        dimensions: params.dimensions?.join(','),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 6. CONVERSIONS API (/v1/conversions)
  // ---------------------------------------------------------------------------

  async sendConversionEvents(
    events: OpenAiConversionEventRequest[],
    idempotencyKey?: string
  ): Promise<OpenAiConversionResponse> {
    return this.request<OpenAiConversionResponse>('/v1/conversions', {
      method: 'POST',
      body: { events },
      idempotencyKey,
    });
  }
}
