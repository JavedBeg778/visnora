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

const POSITIVE_WORDS = [
  'recommend',
  'recommended',
  'top choice',
  'leading',
  'excellent',
  'outstanding',
  'innovative',
  'best-in-class',
  'premier',
  'superior',
  'robust',
  'highly rated',
  'industry-leading',
  'popular',
  'reputable',
  'trusted',
  'reliable',
  'go-to',
  'standout',
  'impressive',
  'effective',
  'preferred',
  'seamless',
  'great',
  'superb',
  'fantastic',
  'fastest',
  'faster',
  'better',
  'outperforms',
];

const NEGATIVE_WORDS = [
  'lagging',
  'lags behind',
  'outdated',
  'expensive',
  'poor',
  'lacks',
  'limited',
  'unreliable',
  'steep learning curve',
  'struggles',
  'criticized',
  'drawback',
  'drawbacks',
  'complaints',
  'inferior',
  'buggy',
  'slow',
  'subpar',
  'avoid',
  'unfavorable',
  'weakness',
  'disappointing',
  'terrible',
  'frustrating',
  'overpriced',
  'worse',
  'falls short',
];

const RECOMMENDATION_PATTERNS = [
  /\b(i recommend|we recommend|highly recommended|recommended|recommend|strong choice|worth considering|top pick|top choice|ideal for|best suited for)\b/i,
];

const COMPARISON_PATTERNS = [
  /\b(compared to|versus|vs\.?|better than|worse than|outperforms|lags behind|alternative to|in comparison with|competes with|unlike|whereas|while)\b/i,
];

const NEGATIVE_COMPARISON_PATTERNS = [
  /\b(inferior to|lags behind|worse than|falls short of|lacks .* compared to|unlike .* has poor|subpar compared to|behind competitors)\b/i,
];

const NEGATION_REGEX =
  /\b(not|never|no|hardly|scarcely|barely|cannot|can't|won't|don't|doesn't|isn't|aren't|wasn't|weren't|no longer)\b\s*(?:\w+\s+){0,3}$/i;

function hasPrecedingNegation(text: string, matchIndex: number): boolean {
  const windowStart = Math.max(0, matchIndex - 35);
  const precedingSnippet = text.slice(windowStart, matchIndex);
  return NEGATION_REGEX.test(precedingSnippet);
}

/**
 * Evaluates sentiment around an entity's context snippet with negation handling,
 * comparison language detection, and calibrated confidence levels.
 */
export function evaluateSentiment(evidenceText: string): {
  sentiment: SentimentType;
  confidence: number;
  isRecommendation: boolean;
  isComparison: boolean;
  analysisMethod: 'DETERMINISTIC_HEURISTIC';
} {
  const text = evidenceText.toLowerCase();

  const isComparison = COMPARISON_PATTERNS.some((p) => p.test(text));
  const isNegativeComparison = NEGATIVE_COMPARISON_PATTERNS.some((p) => p.test(text));

  // 1. Recommendation analysis with negation check
  let isRecommendation = false;
  for (const pattern of RECOMMENDATION_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      if (hasPrecedingNegation(text, match.index)) {
        // Negated recommendation (e.g. "not recommended", "cannot recommend")
        isRecommendation = false;
      } else {
        isRecommendation = true;
      }
    }
  }

  // 2. Count positive & negative signals with contextual negation handling
  let posMatches = 0;
  let negMatches = 0;

  if (isNegativeComparison) {
    negMatches += 2;
  }

  for (const word of POSITIVE_WORDS) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (hasPrecedingNegation(text, match.index)) {
        // "not leading", "hardly innovative", "not recommended"
        negMatches += 1;
      } else {
        posMatches += 1;
      }
    }
  }

  for (const word of NEGATIVE_WORDS) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (hasPrecedingNegation(text, match.index)) {
        // "not expensive", "no drawbacks", "not slow" -> suppress negative
      } else {
        negMatches += 1;
      }
    }
  }

  // 3. Classify sentiment
  if (posMatches > 0 && negMatches > 0) {
    return {
      sentiment: 'MIXED',
      confidence: 0.75,
      isRecommendation,
      isComparison,
      analysisMethod: 'DETERMINISTIC_HEURISTIC',
    };
  }

  if (posMatches > 0) {
    const confidence = Math.min(0.95, 0.7 + posMatches * 0.1);
    return {
      sentiment: 'POSITIVE',
      confidence: Number(confidence.toFixed(2)),
      isRecommendation,
      isComparison,
      analysisMethod: 'DETERMINISTIC_HEURISTIC',
    };
  }

  if (negMatches > 0) {
    const confidence = Math.min(0.95, 0.7 + negMatches * 0.1);
    return {
      sentiment: 'NEGATIVE',
      confidence: Number(confidence.toFixed(2)),
      isRecommendation: false,
      isComparison,
      analysisMethod: 'DETERMINISTIC_HEURISTIC',
    };
  }

  // If no strong positive or negative cues are found
  return {
    sentiment: 'NEUTRAL',
    confidence: 0.8,
    isRecommendation,
    isComparison,
    analysisMethod: 'DETERMINISTIC_HEURISTIC',
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
    const { sentiment, confidence, isRecommendation, isComparison, analysisMethod } = evaluateSentiment(m.evidenceText);
    return {
      ...m,
      sentiment,
      sentimentConfidence: confidence,
      isRecommendation,
      isComparison,
      analysisMethod,
    };
  });

  const brandMentions = enrichedMentions.filter((m) => m.isPrimaryBrand);
  const competitorMentions = enrichedMentions.filter((m) => !m.isPrimaryBrand);

  // 3. Extract citations with brand & competitor association
  const citations = extractCitations(rawText, input.groundingSources, input.targetBrand, input.competitors);

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

