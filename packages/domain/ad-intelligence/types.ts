// Visnora — Competitor Ad Intelligence Types & Data Contracts
// Reference: M5 PRD & Technical Blueprint

export type AdPlatformType = 'GOOGLE_ADS' | 'META_ADS' | 'OPENAI_ADS' | 'TIKTOK_ADS' | 'MANUAL' | 'OTHER';

export type AdSourceType = 'META_AD_LIBRARY' | 'GOOGLE_ADS_TRANSPARENCY' | 'TIKTOK_CREATIVE_CENTER' | 'MANUAL_SUBMISSION';

export type AdFormatType = 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'TEXT' | 'UNKNOWN';

export type AdStatusType = 'ACTIVE' | 'INACTIVE' | 'UNKNOWN' | 'REMOVED';

export type RecommendationCategory =
  | 'MESSAGING'
  | 'VALUE_PROP'
  | 'PAIN_POINT'
  | 'CTA'
  | 'OFFER'
  | 'CREATIVE'
  | 'POSITIONING'
  | 'DIFFERENTIATION'
  | 'LANDING_PAGE';

export interface AdCreativeAsset {
  mediaType: AdFormatType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  width?: number;
  height?: number;
  checksum?: string;
}

export interface AdLandingPageInfo {
  url: string;
  normalizedDomain: string;
  pageTitle?: string;
  metaDescription?: string;
  statusCode?: number;
  isAccessible: boolean;
  extractedOffers: string[];
}

export interface NormalizedAdRecord {
  externalAdId: string;
  platform: AdPlatformType;
  originalUrl?: string;
  advertiserName: string;
  advertiserExternalId?: string;
  headline?: string;
  primaryText?: string;
  description?: string;
  ctaText?: string;
  format: AdFormatType;
  landingPageUrl?: string;
  country?: string;
  language?: string;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
  contentHash: string;
  status: AdStatusType;
  creatives?: AdCreativeAsset[];
  landingPage?: AdLandingPageInfo;
  rawMetadata?: Record<string, any>;
}

export interface AdSourceCapabilities {
  canSearchByKeyword: boolean;
  canSearchByAdvertiser: boolean;
  hasCreativeMedia: boolean;
  supportsPagination: boolean;
  requiresAuthToken: boolean;
  isPubliclyPermitted: boolean;
}

export interface AdDiscoveryParams {
  organizationId: string;
  projectId: string;
  competitorId?: string;
  brandId?: string;
  query?: string;
  country?: string;
  language?: string;
  platform?: AdPlatformType;
  limit?: number;
  cursor?: string;
}

export interface AdDiscoveryResult {
  ads: NormalizedAdRecord[];
  totalEstimated?: number;
  hasMore: boolean;
  nextCursor?: string;
  source: AdSourceType;
  limitations?: string[];
}

export interface AdAnalysis12Dimensions {
  mainMessage: string;
  valueProposition: string;
  painPoints: string[];
  audienceSignals: string[];
  emotionalVsRational: 'EMOTIONAL' | 'RATIONAL' | 'BALANCED';
  positioning: string;
  promotionalStrategy: string;
  offerStrategy: string;
  ctaStrategy: string;
  creativeFormat: string;
  messagingAngle: string;
  landingPageRelevance?: string;
  confidenceScore: number;
}

export interface AdAnalysisRecord extends AdAnalysis12Dimensions {
  id: string;
  adRecordId: string;
  organizationId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostPaise: number;
  rawAiOutput: any;
  analysisVersion: number;
  status: string;
  errorMessage?: string;
  createdAt: Date;
}

export interface CompetitorAdAnalyticsSummary {
  competitorId: string;
  competitorName: string;
  competitorDomain: string;
  totalAdsDiscovered: number;
  activeAdsCount: number;
  platformDistribution: Array<{ platform: string; count: number; percentage: number }>;
  formatDistribution: Array<{ format: string; count: number; percentage: number }>;
  topCtas: Array<{ cta: string; count: number }>;
  activeOffers: string[];
  commonMessagingThemes: string[];
  topLandingPages: Array<{ domain: string; url: string; count: number }>;
  firstDiscoveredAt?: Date;
  lastCheckedAt?: Date;
}

export interface AdComparisonView {
  id?: string;
  title: string;
  ads: Array<{
    id: string;
    headline?: string;
    primaryText?: string;
    advertiserName: string;
    platform: string;
    format: string;
    ctaText?: string;
    landingPageUrl?: string;
    analysis?: AdAnalysis12Dimensions;
  }>;
  aiSummary?: string;
  commonThemes: string[];
  differingThemes: string[];
}

export interface AdRecommendationView {
  id: string;
  category: RecommendationCategory;
  title: string;
  explanation: string;
  supportingAdIds: string[];
  supportingAdsPreview?: Array<{ id: string; advertiserName: string; headline?: string }>;
  evidenceSummary: string;
  expectedBenefit: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedAction: string;
  status: 'NEW' | 'REVIEWED' | 'APPLIED' | 'DISMISSED';
  createdAt: Date;
}

export interface AdMonitoringJobView {
  id: string;
  competitorId: string;
  competitorName: string;
  competitorDomain: string;
  checkFrequency: 'DAILY' | 'WEEKLY' | 'MANUAL';
  sources: string[];
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastStatus?: string;
  errorMessage?: string;
  detectedChangesCount?: number;
}

export interface AdChangeEventView {
  id: string;
  adRecordId: string;
  competitorName?: string;
  changeType: 'NEW_AD' | 'HEADLINE_CHANGED' | 'TEXT_CHANGED' | 'CTA_CHANGED' | 'LANDING_PAGE_CHANGED' | 'REMOVED';
  fieldChanged?: string;
  previousValue?: string;
  newValue?: string;
  detectedAt: Date;
}

