// Visnora — OpenAI Ads Advertiser API Type Definitions
// Reference: https://developers.openai.com/ads/ & Base URL: https://api.ads.openai.com

export type OpenAiAdsAccountStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'INACTIVE'
  | 'UNDER_REVIEW'
  | 'BLOCKED';

export interface OpenAiAdAccountResponse {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  status: string;
  review_status?: string;
  created_at: string;
  updated_at: string;
  payment_status?: string;
}

export interface OpenAiCampaignBudget {
  amount: number; // in minor currency units (e.g. cents / paise)
  type: 'daily' | 'lifetime';
  currency: string;
}

export interface OpenAiCampaignRequest {
  name: string;
  objective: 'TRAFFIC' | 'CONVERSIONS' | 'BRAND_AWARENESS' | 'ENGAGEMENT';
  status?: 'PAUSED' | 'ACTIVE'; // Strictly defaults to PAUSED
  budget: OpenAiCampaignBudget;
  start_time?: string;
  end_time?: string;
  targeting?: {
    geographic?: string[];
    platforms?: string[];
    audiences?: string[];
  };
}

export interface OpenAiCampaignResponse {
  id: string;
  name: string;
  objective: string;
  status: 'PAUSED' | 'ACTIVE' | 'ARCHIVED';
  budget: OpenAiCampaignBudget;
  delivery_status?: string;
  start_time?: string;
  end_time?: string;
  targeting?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OpenAiAdGroupRequest {
  campaign_id: string;
  name: string;
  status?: 'PAUSED' | 'ACTIVE';
  bidding: {
    strategy: 'MAXIMIZE_CLICKS' | 'TARGET_CPA' | 'MANUAL_CPC';
    bid_amount?: number;
  };
  context_hints?: string[];
  audience?: Record<string, any>;
}

export interface OpenAiAdGroupResponse {
  id: string;
  campaign_id: string;
  name: string;
  status: 'PAUSED' | 'ACTIVE' | 'ARCHIVED';
  bidding: {
    strategy: string;
    bid_amount?: number;
  };
  context_hints: string[];
  audience?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OpenAiAdRequest {
  ad_group_id: string;
  name: string;
  headline: string;
  ad_copy: string;
  advertiser_name: string;
  destination_url: string;
  landing_page_url: string;
  image_asset_id?: string;
  image_url?: string;
}

export interface OpenAiAdResponse {
  id: string;
  ad_group_id: string;
  name: string;
  headline: string;
  ad_copy: string;
  advertiser_name: string;
  destination_url: string;
  landing_page_url: string;
  image_url?: string;
  asset_id?: string;
  status: 'PAUSED' | 'ACTIVE' | 'ARCHIVED';
  review_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  serving_issues?: Array<{ code: string; message: string; severity: string }>;
  created_at: string;
  updated_at: string;
}

export interface OpenAiAssetUploadResponse {
  id: string;
  filename: string;
  url: string;
  mime_type: string;
  file_size_bytes: number;
  status: 'ACTIVE' | 'PROCESSING' | 'FAILED';
  created_at: string;
}

export interface OpenAiInsightsRequest {
  date_start: string; // YYYY-MM-DD
  date_end: string;   // YYYY-MM-DD
  level: 'account' | 'campaign' | 'ad_group' | 'ad';
  campaign_id?: string;
  ad_group_id?: string;
  ad_id?: string;
  dimensions?: Array<'country' | 'device' | 'platform'>;
}

export interface OpenAiDailyMetric {
  id?: string;
  entity_id: string;
  date: string;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  spend: number | null; // In account currency units
  cpc: number | null;
  cpm: number | null;
  conversions: number | null;
  cpa: number | null;
  attributed_sales: number | null;
  roas: number | null;
  country?: string;
  device?: string;
  platform?: string;
  is_final: boolean;
}

export interface OpenAiInsightsFreshness {
  impressions_delay_minutes: number;
  spend_delay_minutes: number;
  conversions_delay_hours: number;
  last_synchronized_at: string;
}

export interface OpenAiInsightsResponse {
  data: OpenAiDailyMetric[];
  freshness: OpenAiInsightsFreshness;
}

export interface OpenAiConversionEventRequest {
  event_name: 'PAGE_VIEW' | 'SIGN_UP' | 'PURCHASE' | 'LEAD' | string;
  event_id: string;
  deduplication_id: string;
  event_time: string; // ISO 8601
  event_source: 'SERVER' | 'PIXEL';
  user_data?: {
    client_ip_address?: string;
    client_user_agent?: string;
    external_id?: string;
  };
  custom_data?: {
    currency: string;
    value?: number;
    order_id?: string;
    items?: Array<{ id: string; quantity: number; item_price: number }>;
  };
}

export interface OpenAiConversionResponse {
  status: 'received' | 'processed' | 'partial_failure' | 'rejected';
  events_received: number;
  events_processed: number;
  errors?: Array<{ event_id: string; deduplication_id: string; message: string }>;
}

