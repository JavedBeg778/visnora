// Visnora — Citation Extraction & Domain Normalization Engine
// Reference: docs/DATA_METHODOLOGY.md

import { ExtractedCitation } from './types';

// Tracking & analytics query parameters to strip
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'ref',
  'ref_src',
  'mc_eid',
  'igshid',
]);

/**
 * Normalizes a URL:
 * - Strips marketing tracking query parameters.
 * - Removes trailing slashes and hash fragments.
 * - Extracts clean hostname / root domain.
 */
export function normalizeUrl(rawUrl: string): { cleanUrl: string; domain: string } | null {
  try {
    let urlString = rawUrl.trim();
    if (!/^https?:\/\//i.test(urlString)) {
      urlString = 'https://' + urlString;
    }

    const parsed = new URL(urlString);
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // Strip known tracking parameters
    for (const param of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAMS.has(param.toLowerCase())) {
        parsed.searchParams.delete(param);
      }
    }

    // Clear hash fragment
    parsed.hash = '';

    // Remove trailing slash if path is just '/'
    let cleanUrl = parsed.toString();
    if (cleanUrl.endsWith('/') && parsed.pathname === '/') {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    const domain = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return { cleanUrl, domain };
  } catch {
    return null;
  }
}

/**
 * Extracts citations from:
 * 1. Structured Google Search Grounding metadata (URIs).
 * 2. Markdown links (`[Anchor](https://...)`) and bare URLs embedded in response text.
 * Deduplicates citations while preserving first-seen order.
 */
export function extractCitations(
  rawText: string,
  groundingSources?: Array<{ uri: string; title?: string }>
): ExtractedCitation[] {
  const citations: ExtractedCitation[] = [];
  const seenUrls = new Set<string>();
  let order = 1;

  // 1. Process structured Grounding sources first (highest authority)
  if (groundingSources) {
    for (const source of groundingSources) {
      if (!source.uri) continue;
      const normalized = normalizeUrl(source.uri);
      if (normalized && !seenUrls.has(normalized.cleanUrl)) {
        seenUrls.add(normalized.cleanUrl);
        citations.push({
          url: normalized.cleanUrl,
          domain: normalized.domain,
          order: order++,
          anchorText: source.title || normalized.domain,
        });
      }
    }
  }

  // 2. Extract Markdown links from response text: [anchor](url)
  const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = markdownRegex.exec(rawText)) !== null) {
    const anchor = mdMatch[1]?.trim();
    const url = mdMatch[2]?.trim();
    if (url) {
      const normalized = normalizeUrl(url);
      if (normalized && !seenUrls.has(normalized.cleanUrl)) {
        seenUrls.add(normalized.cleanUrl);
        citations.push({
          url: normalized.cleanUrl,
          domain: normalized.domain,
          order: order++,
          anchorText: anchor,
        });
      }
    }
  }

  // 3. Extract bare URLs from text that were not part of markdown links
  const bareUrlRegex = /(?<!\()(https?:\/\/[^\s\)\],<]+)/g;
  let bareMatch: RegExpExecArray | null;
  while ((bareMatch = bareUrlRegex.exec(rawText)) !== null) {
    const url = bareMatch[1]?.trim();
    if (url) {
      const normalized = normalizeUrl(url);
      if (normalized && !seenUrls.has(normalized.cleanUrl)) {
        seenUrls.add(normalized.cleanUrl);
        citations.push({
          url: normalized.cleanUrl,
          domain: normalized.domain,
          order: order++,
        });
      }
    }
  }

  return citations;
}

/**
 * Calculates citation frequency across a collection of prompt results.
 * Returns sorted list of domains by frequency count.
 */
export function aggregateCitationFrequencies(
  citationsList: ExtractedCitation[][]
): Array<{ domain: string; count: number; percentage: number }> {
  const totalCitations = citationsList.reduce((acc, c) => acc + c.length, 0);
  if (totalCitations === 0) return [];

  const domainCounts = new Map<string, number>();

  for (const list of citationsList) {
    // Unique domains per response to measure domain prevalence
    const uniqueDomainsInRun = new Set(list.map((c) => c.domain));
    for (const domain of uniqueDomainsInRun) {
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    }
  }

  const results: Array<{ domain: string; count: number; percentage: number }> = [];
  const totalRuns = citationsList.length;

  for (const [domain, count] of domainCounts.entries()) {
    results.push({
      domain,
      count,
      percentage: Number(((count / totalRuns) * 100).toFixed(2)),
    });
  }

  return results.sort((a, b) => b.count - a.count);
}
