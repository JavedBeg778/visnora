// Visnora — M6 ChatGPT Ads Intelligence Domain Types
// Reference: docs/TECHNICAL_BLUEPRINT.md & Prisma schema

export interface ConnectAccountInput {
  organizationId: string;
  name: string;
  openaiAccountId: string;
  apiKey: string;
  currency?: string;
  timezone?: string;
}

export interface AccountView {
  id: string;
  organizationId: string;
  name: string;
  openaiAccountId: string;
  currency: string;
  timezone: string;
  status: string;
  reviewStatus: string | null;
  lastSyncAt: Date | null;
  maskedKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCampaignInput {
  organizationId: string;
  accountId: string;
  name: string;
  objective: string;
  budgetAmountPaise: number | bigint;
  budgetType?: string;
  currency?: string;
  startTime?: Date;
  endTime?: Date;
  contextTargeting?: string[];
  negativeContexts?: string[];
  actorUserId?: string;
  financialConfirmation?: boolean;
}

export interface UpdateCampaignInput {
  name?: string;
  budgetAmountPaise?: number | bigint;
  budgetType?: string;
  startTime?: Date;
  endTime?: Date;
  contextTargeting?: string[];
  negativeContexts?: string[];
  actorUserId?: string;
  financialConfirmation?: boolean;
}

export interface CreateAdGroupInput {
  organizationId: string;
  campaignId: string;
  accountId: string;
  name: string;
  bidAmountPaise?: number | bigint;
  contextHints?: string[];
  audienceConfig?: Record<string, any>;
  bidStrategy?: string;
  actorUserId?: string;
}

export interface CreateAdInput {
  organizationId: string;
  adGroupId: string;
  accountId: string;
  name: string;
  headline: string;
  adCopy: string;
  advertiserName: string;
  destinationUrl: string;
  landingPageUrl?: string;
  imageUrl?: string;
  actorUserId?: string;
}

export interface ConversionsApiEventInput {
  organizationId: string;
  accountId?: string;
  eventName: string;
  eventTimestamp?: Date | string;
  userEmail?: string;
  userPhone?: string;
  userExternalId?: string;
  eventSource?: string;
  currency?: string;
  valuePaise?: number | bigint;
  metadata?: Record<string, any>;
  deduplicationId?: string;
}

export interface GenerateAiRecommendationsInput {
  organizationId: string;
  accountId?: string;
  campaignId?: string;
  actorUserId?: string;
}

export interface AnalyticsQueryInput {
  organizationId: string;
  accountId?: string;
  campaignId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface PerformanceOverview {
  impressions: number;
  clicks: number;
  spendPaise: string;
  spendFormatted: string;
  conversions: number;
  attributedSalesPaise: string;
  attributedSalesFormatted: string;
  ctr: number;
  cpcFormatted: string;
  cpaFormatted: string;
  currency?: string;
  roas: number;
  isFinal: boolean;
  freshnessStatus: 'FRESH' | 'DELAYED' | 'UNAVAILABLE';
  lastSyncAt: Date | null;
}
