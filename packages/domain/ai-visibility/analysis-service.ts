// Visnora — AI Response Analysis Engine
// Analyzes verbatim AI responses for Brand Mentions, Competitor Mentions, Sentiment, and Citations
// Reference: docs/DATA_METHODOLOGY.md & docs/TECHNICAL_BLUEPRINT.md

import crypto from 'crypto';
import { extractMentions } from './extractor';
import { extractCitations, normalizeUrl } from './citation-extractor';
import { BrandEntity, ExtractedMention, ExtractedCitation } from './types';
import { SentimentType } from '../../shared/types/index';

export { extractCitations };

export function generatePayloadHash(rawText: string): string {
  return crypto.createHash('sha256').update(rawText || '').digest('hex');
}

export interface AnalysisInput {
  rawText: string;
  groundingSources?: Array<{ uri: string; title?: string }>;
  targetBrand: BrandEntity;
  competitors: BrandEntity[];
}

export interface AnalysisOutput {
  payloadHash: string;
  normalizedText: string;
  brandMentions: ExtractedMention[];
  competitorMentions: ExtractedMention[];
  allMentions: ExtractedMention[];
  citations: ExtractedCitation[];
  hasCitations: boolean;
  overallSentiment: SentimentType;
  sentimentConfidence: number;
  isBrandRecommended: boolean;
  bestBrandPosition: number | null;
}

const POSITIVE_PATTERNS = [
  /\b(recommend|recommended|top choice|leading|excellent|outstanding|innovative|best-in-class|premier|superior|robust|highly rated|industry-leading)\b/i,
  /\b(popular|reputable|trusted|reliable|go-to|standout|impressive|effective|preferred)\b/i,
];

const NEGATIVE_PATTERNS = [
  /\b(lagging|outdated|expensive|poor|lacks|limited|unreliable|steep learning curve|struggles|criticized|drawback|drawbacks|complaints)\b/i,
  /\b(inferior|buggy|slow|subpar|avoid|unfavorable|weakness)\b/i,
];

const RECOMMENDATION_PATTERNS = [
  /\b(i recommend|we recommend|highly recommended|recommended|recommend|strong choice|worth considering|top pick|top choice|ideal for|best suited for)\b/i,
];

/**
 * Evaluates sentiment around an entity's context snippet
 */
export function evaluateSentiment(evidenceText: string): {
  sentiment: SentimentType;
  confidence: number;
  isRecommendation: boolean;
} {
  const text = evidenceText.toLowerCase();

  const isRecommendation = RECOMMENDATION_PATTERNS.some((p) => p.test(text));

  let posMatches = 0;
  for (const regex of POSITIVE_PATTERNS) {
    const matches = text.match(regex);
    if (matches) posMatches += matches.length;
  }

  let negMatches = 0;
  for (const regex of NEGATIVE_PATTERNS) {
    const matches = text.match(regex);
    if (matches) negMatches += matches.length;
  }

  if (posMatches > 0 && negMatches > 0) {
    return {
      sentiment: 'MIXED',
      confidence: 0.75,
      isRecommendation,
    };
  }

  if (posMatches > 0) {
    const confidence = Math.min(0.95, 0.7 + posMatches * 0.1);
    return {
      sentiment: 'POSITIVE',
      confidence: Number(confidence.toFixed(2)),
      isRecommendation,
    };
  }

  if (negMatches > 0) {
    const confidence = Math.min(0.95, 0.7 + negMatches * 0.1);
    return {
      sentiment: 'NEGATIVE',
      confidence: Number(confidence.toFixed(2)),
      isRecommendation: false,
    };
  }

  // If no strong positive or negative cues are found
  return {
    sentiment: 'NEUTRAL',
    confidence: 0.8,
    isRecommendation,
  };
}

/**
 * Complete analysis pipeline:
 * 1. Hashes raw payload
 * 2. Extracts mentions (brand + competitors)
 * 3. Classifies sentiment per mention
 * 4. Extracts & deduplicates source citations
 */
export function analyzeAiResponse(input: AnalysisInput): AnalysisOutput {
  const rawText = input.rawText || '';
  const normalizedText = rawText.trim();
  const payloadHash = crypto.createHash('sha256').update(rawText).digest('hex');

  // 1. Extract mentions using deterministic word boundary guards
  const allRawMentions = extractMentions(rawText, input.targetBrand, input.competitors);

  // 2. Classify sentiment for each mention
  const enrichedMentions: ExtractedMention[] = allRawMentions.map((m) => {
    const { sentiment, confidence, isRecommendation } = evaluateSentiment(m.evidenceText);
    return {
      ...m,
      sentiment,
      sentimentConfidence: confidence,
      isRecommendation,
    };
  });

  const brandMentions = enrichedMentions.filter((m) => m.isPrimaryBrand);
  const competitorMentions = enrichedMentions.filter((m) => !m.isPrimaryBrand);

  // 3. Extract citations
  const citations = extractCitations(rawText, input.groundingSources);

  // 4. Determine overall brand sentiment across brand mentions
  let overallSentiment: SentimentType = 'NOT_EVALUATED';
  let sentimentConfidence = 0.5;
  let isBrandRecommended = false;
  let bestBrandPosition: number | null = null;

  if (brandMentions.length > 0) {
    const sentiments = brandMentions.map((m) => m.sentiment);
    const hasPos = sentiments.includes('POSITIVE');
    const hasNeg = sentiments.includes('NEGATIVE');

    if (hasPos && hasNeg) {
      overallSentiment = 'MIXED';
    } else if (hasPos) {
      overallSentiment = 'POSITIVE';
    } else if (hasNeg) {
      overallSentiment = 'NEGATIVE';
    } else {
      overallSentiment = 'NEUTRAL';
    }

    const confidences = brandMentions.map((m) => m.sentimentConfidence || 0.8);
    sentimentConfidence = Number(
      (confidences.reduce((acc, c) => acc + c, 0) / confidences.length).toFixed(2)
    );

    isBrandRecommended = brandMentions.some((m) => m.isRecommendation);

    const positions = brandMentions
      .map((m) => m.listPosition)
      .filter((p): p is number => p !== null);

    if (positions.length > 0) {
      bestBrandPosition = Math.min(...positions);
    }
  }

  return {
    payloadHash,
    normalizedText,
    brandMentions,
    competitorMentions,
    allMentions: enrichedMentions,
    citations,
    hasCitations: citations.length > 0,
    overallSentiment,
    sentimentConfidence,
    isBrandRecommended,
    bestBrandPosition,
  };
}

