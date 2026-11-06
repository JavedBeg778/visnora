// Visnora — Core Shared Types & Contracts

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'ANALYST' | 'VIEWER';
export type MemberStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';

export type SentimentType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED' | 'UNKNOWN' | 'NOT_EVALUATED';
export type BuyingStage = 'AWARENESS' | 'CONSIDERATION' | 'DECISION' | 'GENERAL';
export type PromptCadence = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MANUAL';
export type RunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED' | 'CANCELLED';
export type RecommendationStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
export type RecommendationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type DataClass = 
  | 'actual' 
  | 'observed' 
  | 'sampled' 
  | 'platform_reported' 
  | 'estimated';

export interface TenantContext {
  userId: string;
  organizationId: string;
  role: OrgRole;
  workspaceId?: string;
  traceId: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    traceId: string;
    timestamp: string;
    pagination?: PaginationMeta;
  };
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    traceId: string;
    details?: ApiErrorDetail[];
  };
}

