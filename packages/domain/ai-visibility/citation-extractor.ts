// Visnora — Citation Extraction & Domain Normalization Engine
// Reference: docs/DATA_METHODOLOGY.md & M3.1 Intelligence Quality

import { ExtractedCitation, BrandEntity } from './types';

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
  'yclid',
  '_ga',
  'campaign_id',
  'ad_id',
  'source',
  'affiliate_id',
  'partner_id',
  'dclid',
  'twclid',
]);

/**
 * Normalizes a URL:
 * - Strips marketing tracking query parameters.
 * - Removes trailing slashes and hash fragments.
 * - Extracts clean hostname / root domain.
 * - Rejects malformed or unsafe URLs.
 */
export function normalizeUrl(rawUrl: string): { cleanUrl: string; domain: string } | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  try {
    let urlString = rawUrl.trim();

    // Reject obvious non-HTTP formats or garbage strings
    if (/^(javascript|data|vbscript|file):/i.test(urlString)) {
      return null;
    }

    if (!/^https?:\/\//i.test(urlString)) {
      urlString = 'https://' + urlString;
    }

    const parsed = new URL(urlString);

    // Hostname must contain at least one dot to be a valid web domain
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return null;
    }

    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // Strip known tracking parameters
    for (const param of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAMS.has(param.toLowerCase())) {
        parsed.searchParams.delete(param);
      }
    }

    // Clear hash fragment
    parsed.hash = '';

    // Remove default ports if present
    if (parsed.port === '80' || parsed.port === '443') {
      parsed.port = '';
    }

    let cleanUrl = parsed.toString();
    // Normalize trailing slash if path is just '/'
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
 * Associates extracted citations with target brand or competitors based on domain ownership.
 */
export function associateCitations(
  citations: ExtractedCitation[],
  targetBrand?: BrandEntity,
  competitors?: BrandEntity[]
): ExtractedCitation[] {
  const brandDomain = targetBrand?.domain
    ? targetBrand.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
    : null;

  const compDomainMap = new Map<string, string>();
  if (competitors) {
    for (const comp of competitors) {
      if (comp.domain) {
        const d = comp.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
        compDomainMap.set(d, comp.id);
      }
    }
  }

  return citations.map((citation) => {
    const citDomain = citation.domain.toLowerCase();

    if (brandDomain && (citDomain === brandDomain || citDomain.endsWith('.' + brandDomain))) {
      return {
        ...citation,
        association: 'PRIMARY_BRAND' as const,
        associatedEntityId: targetBrand?.id,
      };
    }

    for (const [compDomain, compId] of compDomainMap.entries()) {
      if (citDomain === compDomain || citDomain.endsWith('.' + compDomain)) {
        return {
          ...citation,
          association: 'COMPETITOR' as const,
          associatedEntityId: compId,
        };
      }
    }

    return {
      ...citation,
      association: 'THIRD_PARTY' as const,
    };
  });
}

/**
 * Extracts citations from:
 * 1. Structured Google Search Grounding metadata (URIs).
 * 2. Markdown links (`[Anchor](https://...)`) and bare URLs embedded in response text.
 * Deduplicates citations while preserving first-seen order.
 */
export function extractCitations(
  rawText: string,
  groundingSources?: Array<{ uri: string; title?: string }>,
  targetBrand?: BrandEntity,
  competitors?: BrandEntity[]
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

  return associateCitations(citations, targetBrand, competitors);
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
