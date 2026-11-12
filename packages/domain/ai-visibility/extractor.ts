// Visnora — Brand & Competitor Mention Extractor
// Reference: docs/DATA_METHODOLOGY.md & M3.1 Intelligence Quality

import { BrandEntity, ExtractedMention, DetectionMethod, ConfidenceTier } from './types';

/**
 * Escapes regex special characters in a search term.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Common English dictionary words and prepositions that frequently appear in brand names or aliases
 * but cause severe false positives if matched without contextual reinforcement.
 */
const AMBIGUOUS_WORDS = new Set([
  'sure',
  'eat',
  'pin',
  'magic',
  'fast',
  'box',
  'next',
  'one',
  'all',
  'go',
  'prime',
  'fresh',
  'target',
  'wave',
  'nest',
  'apple',
  'blink',
  'hub',
  'spot',
  'now',
  'it',
  'in',
  'to',
  'ai',
  'on',
  'me',
  'by',
  'at',
  'is',
  'be',
  'or',
  'so',
  'up',
  'out',
  'get',
  'set',
]);

const BRAND_CONTEXT_CLUES =
  /\b(app|platform|tool|service|software|company|brand|website|delivery|order|competitor|solution|product|suite|portal|inc|ltd|pvt|co|tech|food|grocery|restaurant|cloud|engine|saas|analytics|system)\b/i;

function computeConfidenceTier(score: number): ConfidenceTier {
  if (score >= 0.85) return 'HIGH';
  if (score >= 0.6) return 'MEDIUM';
  return 'LOW';
}

/**
 * Validates whether a candidate text match represents a genuine brand mention
 * rather than a common English dictionary word or isolated abbreviation.
 */
function isValidBrandMatch(
  matchedString: string,
  rawText: string,
  start: number,
  end: number,
  termType: DetectionMethod
): boolean {
  const lowerTerm = matchedString.toLowerCase().trim();

  // If it's a domain match (e.g. zomato.com), always valid
  if (termType === 'DOMAIN') return true;

  // Check if term is an ambiguous dictionary word or short acronym (<= 3 chars)
  const isAmbiguous = AMBIGUOUS_WORDS.has(lowerTerm);
  const isShortAcronym = lowerTerm.length <= 3;

  if (isAmbiguous || isShortAcronym) {
    // 1. Check if the matched substring is capitalized or in uppercase (e.g. "AI", "GO", "Sure")
    const isCapitalized = /^[A-Z]/.test(matchedString) || /^[A-Z0-9]+$/.test(matchedString);

    // 2. Check surrounding context window (+/- 50 characters)
    const contextStart = Math.max(0, start - 50);
    const contextEnd = Math.min(rawText.length, end + 50);
    const contextSnippet = rawText.slice(contextStart, contextEnd);
    const hasBrandClue = BRAND_CONTEXT_CLUES.test(contextSnippet);

    // If lowercase and no brand clue is present, reject as a false positive
    if (!isCapitalized && !hasBrandClue) {
      return false;
    }
  }

  return true;
}

/**
 * Extracts mentions of target brand and competitors from raw text.
 * Enforces word boundaries, alias prioritization, product matching, and false-positive guards.
 */
export function extractMentions(
  rawText: string,
  targetBrand: BrandEntity,
  competitors: BrandEntity[]
): ExtractedMention[] {
  const mentions: ExtractedMention[] = [];
  const allEntities = [
    { entity: targetBrand, isPrimary: true },
    ...competitors.map((c) => ({ entity: c, isPrimary: false })),
  ];

  for (const { entity, isPrimary } of allEntities) {
    const canonical = entity.canonicalName || (entity as any).name || '';
    const aliases = Array.isArray(entity.aliases) ? entity.aliases : [];
    const domain = entity.domain || '';
    const productsServices = Array.isArray(entity.productsServices) ? entity.productsServices : [];

    // Assemble search candidates with specific detection methods and initial confidence weights
    interface SearchTermSpec {
      term: string;
      confidence: number;
      method: DetectionMethod;
    }

    const searchTerms: SearchTermSpec[] = [];

    // 1. Canonical Name
    if (canonical.trim().length > 0) {
      searchTerms.push({
        term: canonical.trim(),
        confidence: 1.0,
        method: 'EXACT_NAME',
      });
    }

    // 2. Aliases
    for (const alias of aliases) {
      if (alias && alias.trim().length > 0) {
        searchTerms.push({
          term: alias.trim(),
          confidence: 0.9,
          method: 'ALIAS',
        });
      }
    }

    // 3. Products & Services
    for (const prod of productsServices) {
      if (prod && prod.trim().length > 0) {
        searchTerms.push({
          term: prod.trim(),
          confidence: 0.88,
          method: 'PRODUCT_SERVICE',
        });
      }
    }

    // 4. Domain / Website
    if (domain.trim().length > 0) {
      const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
      if (cleanDomain.length > 0) {
        searchTerms.push({
          term: cleanDomain,
          confidence: 0.85,
          method: 'DOMAIN',
        });
      }
    }

    // Sort terms longest first to prioritize multi-word phrases over single words
    searchTerms.sort((a, b) => b.term.length - a.term.length);

    const entityMentions: ExtractedMention[] = [];

    for (const { term, confidence: baseConfidence, method } of searchTerms) {
      if (!term || term.length === 0) continue;

      // Word boundary regex: Unicode-safe boundary check
      const regex = new RegExp(`(?<=^|[\\s\\p{P}])(${escapeRegex(term)})(?=[\\s\\p{P}]|$)`, 'giu');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(rawText)) !== null) {
        const matchedString = match[1];
        const start = match.index;
        const end = match.index + matchedString.length;

        // Check if this span is already covered by an existing longer match for this entity
        const isSubsumed = entityMentions.some(
          (existing) => start >= existing.charStart && end <= existing.charEnd
        );
        if (isSubsumed) continue;

        // False positive filter
        if (!isValidBrandMatch(matchedString, rawText, start, end, method)) {
          continue;
        }

        // Clean natural context excerpt (up to 60 characters before and after)
        const excerptStart = Math.max(0, start - 60);
        const excerptEnd = Math.min(rawText.length, end + 60);
        const evidenceText = rawText.slice(excerptStart, excerptEnd).trim();

        // Check if mention appears in a numbered list (e.g. "1. Visnora" or "2) Visnora")
        const lineBeforeMatch = rawText.slice(Math.max(0, start - 25), start);
        const listMatch = lineBeforeMatch.match(/(?:^|\n)\s*(\d+)[\.\)]\s*$/);
        const listPosition = listMatch && listMatch[1] ? parseInt(listMatch[1], 10) : null;

        const confidence = baseConfidence;
        const confidenceTier = computeConfidenceTier(confidence);

        entityMentions.push({
          matchedEntityId: entity.id,
          entityName: canonical,
          isPrimaryBrand: isPrimary,
          charStart: start,
          charEnd: end,
          evidenceText,
          listPosition,
          confidence,
          confidenceTier,
          detectionMethod: method,
          analysisMethod: 'DETERMINISTIC_HEURISTIC',
          matchedTerm: matchedString,
        });
      }
    }

    mentions.push(...entityMentions);
  }

  // Sort all mentions by position in the text
  return mentions.sort((a, b) => a.charStart - b.charStart);
}
