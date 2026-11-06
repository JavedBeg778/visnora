// Visnora — Module A: AI Visibility Domain Types
import { SentimentType } from '../../shared/types/index';

export interface BrandEntity {
  id: string;
  canonicalName: string;
  domain: string;
  aliases: string[];
}

export interface ExtractedMention {
  matchedEntityId: string;
  entityName: string;
  isPrimaryBrand: boolean;
  charStart: number;
  charEnd: number;
  evidenceText: string;
  listPosition: number | null;
  confidence: number;
  sentiment?: SentimentType;
  sentimentConfidence?: number;
  isRecommendation?: boolean;
}

export interface ExtractedCitation {
  url: string;
  domain: string;
  order: number;
  anchorText?: string;
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

