// Visnora — Brand & Competitor Mention Extractor
// Reference: docs/DATA_METHODOLOGY.md

import { BrandEntity, ExtractedMention } from './types';

/**
 * Escapes regex special characters in a search term.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts mentions of target brand and competitors from raw text.
 * Enforces word boundaries to eliminate substring false positives (e.g. "Apple" in "Pineapple").
 * Deduplicates overlapping character spans for the same entity, favoring longer specific phrases.
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

    // Sort terms longest first to prioritize full multi-word aliases over single words
    const searchTerms = [
      { term: canonical, confidence: 1.0 },
      ...aliases.map((alias) => ({ term: alias, confidence: 0.9 })),
      { term: domain, confidence: 0.85 },
    ]
      .filter((s) => Boolean(s.term && s.term.trim().length > 0))
      .sort((a, b) => b.term.length - a.term.length);

    const entityMentions: ExtractedMention[] = [];

    for (const { term, confidence } of searchTerms) {
      if (!term || term.trim().length === 0) continue;

      // Word boundary regex with case-insensitive matching
      const regex = new RegExp(`\\b${escapeRegex(term.trim())}\\b`, 'gi');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(rawText)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;

        // Check if this span is already covered by a longer match for this entity
        const isSubsumed = entityMentions.some(
          (existing) => start >= existing.charStart && end <= existing.charEnd
        );
        if (isSubsumed) continue;

        // Context excerpt (up to 40 characters before and after)
        const excerptStart = Math.max(0, start - 40);
        const excerptEnd = Math.min(rawText.length, end + 40);
        const evidenceText = rawText.slice(excerptStart, excerptEnd).trim();

        // Check if mention appears in a numbered list (e.g. "1. Visnora" or "2) Visnora")
        const lineBeforeMatch = rawText.slice(Math.max(0, start - 20), start);
        const listMatch = lineBeforeMatch.match(/(?:^|\n)\s*(\d+)[\.\)]\s*$/);
        const listPosition = listMatch && listMatch[1] ? parseInt(listMatch[1], 10) : null;

        entityMentions.push({
          matchedEntityId: entity.id,
          entityName: canonical,
          isPrimaryBrand: isPrimary,
          charStart: start,
          charEnd: end,
          evidenceText,
          listPosition,
          confidence,
        });
      }
    }

    mentions.push(...entityMentions);
  }

  // Sort all mentions by position in the text
  return mentions.sort((a, b) => a.charStart - b.charStart);
}
