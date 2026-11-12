// Visnora — M4 Billing Domain Types & Interfaces
// Reference: docs/DATA_METHODOLOGY.md & docs/TECHNICAL_BLUEPRINT.md

export type BillingCycle = 'MONTHLY' | 'ANNUAL';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'SUSPENDED';

export type PlanSlug = 'free' | 'starter' | 'pro' | 'agency';

export type FeatureKey =
  | 'basic_analytics'
  | 'brand_tracking'
  | 'competitor_tracking'
  | 'advanced_analytics'
  | 'competitor_intelligence'
  | 'citation_gap'
  | 'advanced_recommendations'
  | 'report_export'
  | 'client_reporting'
  | 'multiple_workspaces'
  | 'priority_support'
  | 'ad_intelligence'
  | 'ad_monitoring'
  | 'ad_comparison'
  | 'ad_exports'
  | 'chatgpt_ads_intelligence'
  | 'chatgpt_ads_management'
  | 'chatgpt_ads_optimization'
  | 'chatgpt_ads_advanced_reporting'
  | 'chatgpt_ads_multi_client';

export interface PlanQuotas {
  monthlyPromptLimit: number;
  brandLimit: number;
  workspaceLimit: number;
  competitorLimit: number;
  monthlyAdsLimit?: number;
  monitoredCompetitorsLimit?: number;
  connectedAdsAccountsLimit?: number;
  monthlyAiRecommendationsLimit?: number;
  reportingHistoryDays?: number;
}

export interface SubscriptionPlanDefinition {
  slug: PlanSlug;
  name: string;
  description: string;
  monthlyPricePaise: number; // in INR Paise (149900 = ₹1,499)
  annualPricePaise: number;  // in INR Paise (e.g. 10 months price for 12 months)
  currency: string;
  quotas: PlanQuotas;
  features: FeatureKey[];
  isActive: boolean;
  isDefault?: boolean;
  trialDays: number;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  featureKey: FeatureKey;
  currentPlan: string;
  requiredPlan?: string;
  message?: string;
}

export interface QuotaReservationResult {
  allowed: boolean;
  reservationId?: string;
  requestedCount: number;
  consumed: number;
  limit: number;
  remaining: number;
  periodEnd: Date;
  status: 'RESERVED' | 'QUOTA_EXCEEDED';
  errorDetails?: {
    code: 'QUOTA_EXCEEDED';
    message: string;
    currentUsage: number;
    maxAllowed: number;
    remaining: number;
    resetDate: string;
    upgradeUrl: string;
  };
}

export interface CheckoutSessionRequest {
  organizationId: string;
  planSlug: PlanSlug;
  billingCycle: BillingCycle;
  successUrl?: string;
  cancelUrl?: string;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstin?: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  orderId?: string;
  provider: 'mock' | 'razorpay';
  amountPaise: number;
  currency: string;
  planSlug: PlanSlug;
  billingCycle: BillingCycle;
  status: 'PENDING' | 'SIMULATED_SUCCESS';
  checkoutUrl?: string;
  isDevelopmentSimulation: boolean;
}

export interface PaymentVerificationRequest {
  organizationId: string;
  sessionId: string;
  providerPaymentId?: string;
  providerSignature?: string;
  simulateFailure?: boolean;
  failureReason?: string;
  planSlug?: PlanSlug;
  customerEmail?: string;
  customerName?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  paymentId: string;
  transactionRef: string;
  status: 'CAPTURED' | 'FAILED' | 'PENDING';
  amountPaise: number;
  currency: string;
  invoiceId?: string;
  errorMessage?: string;
}

