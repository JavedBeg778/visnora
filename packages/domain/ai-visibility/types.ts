// Visnora — Module A: AI Visibility Domain Types
import { SentimentType } from '../../shared/types/index';

export interface BrandEntity {
  id: string;
  canonicalName: string;
  domain: string;
  aliases: string[];
  productsServices?: string[];
  brandKeywords?: string[];
}

export type DetectionMethod = 'EXACT_NAME' | 'ALIAS' | 'DOMAIN' | 'PRODUCT_SERVICE' | 'CONTEXTUAL';
export type AnalysisMethod = 'DETERMINISTIC_HEURISTIC' | 'LLM_ASSISTED';
export type ConfidenceTier = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ExtractedMention {
  matchedEntityId: string;
  entityName: string;
  isPrimaryBrand: boolean;
  charStart: number;
  charEnd: number;
  evidenceText: string;
  listPosition: number | null;
  confidence: number;
  confidenceTier: ConfidenceTier;
  detectionMethod: DetectionMethod;
  analysisMethod: AnalysisMethod;
  sentiment?: SentimentType;
  sentimentConfidence?: number;
  isRecommendation?: boolean;
  isComparison?: boolean;
  matchedTerm?: string;
}

export interface ExtractedCitation {
  url: string;
  domain: string;
  order: number;
  anchorText?: string;
  association?: 'PRIMARY_BRAND' | 'COMPETITOR' | 'THIRD_PARTY';
  associatedEntityId?: string;
}

export interface MetricSummary {
  observedMentionRate: number; // Percentage (0-100)
  sampleShareOfVoice: number;   // Percentage (0-100)
  promptCoverage: number;       // Percentage (0-100)
  visibilityScore: number;      // 0-100 composite
  citationRate: number;         // Percentage (0-100)
  positiveSentimentRate: number;// Percentage (0-100)
  averagePosition: number | null;
  totalRunsEvaluated: number;
  brandMentionsCount: number;
  competitorMentionsCount: number;
  sampleDenominatorNotice: string;
}


