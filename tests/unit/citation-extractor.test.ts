import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  extractCitations,
  aggregateCitationFrequencies,
} from '../../packages/domain/ai-visibility/citation-extractor';

describe('Citation Extraction & Domain Normalization Engine', () => {
  it('strips tracking query parameters and normalizes root domain', () => {
    const raw = 'https://www.forbes.com/advisor/business/software?utm_source=google&utm_medium=cpc&gclid=12345#overview';
    const result = normalizeUrl(raw);

    expect(result).toBeDefined();
    expect(result?.cleanUrl).toBe('https://forbes.com/advisor/business/software');
    expect(result?.domain).toBe('forbes.com');
  });

  it('handles bare domains without protocol', () => {
    const raw = 'yourstory.com/companies/visnora';
    const result = normalizeUrl(raw);

    expect(result?.cleanUrl).toBe('https://yourstory.com/companies/visnora');
    expect(result?.domain).toBe('yourstory.com');
  });

  it('extracts citations from both grounding sources and markdown text, deduplicating them', () => {
    const rawText = `
Here are the top tools:
- [G2 Reviews](https://www.g2.com/categories/seo?utm_source=affiliate)
- Also visit https://forbes.com/tech for industry news.
- Repeat reference: [G2](https://www.g2.com/categories/seo)
    `;

    const groundingSources = [
      { uri: 'https://yourstory.com/visnora', title: 'YourStory Feature' },
      { uri: 'https://www.g2.com/categories/seo', title: 'G2 SEO' },
    ];

    const citations = extractCitations(rawText, groundingSources);

    // Should contain: YourStory, G2, Forbes (deduplicated!)
    expect(citations.length).toBe(3);
    expect(citations[0].domain).toBe('yourstory.com');
    expect(citations[0].order).toBe(1);
    expect(citations[1].domain).toBe('g2.com');
    expect(citations[1].order).toBe(2);
    expect(citations[2].domain).toBe('forbes.com');
    expect(citations[2].order).toBe(3);
  });

  it('aggregates citation domain frequencies across runs', () => {
    const batchCitations = [
      [
        { url: 'https://g2.com/1', domain: 'g2.com', order: 1 },
        { url: 'https://forbes.com/1', domain: 'forbes.com', order: 2 },
      ],
      [
        { url: 'https://g2.com/2', domain: 'g2.com', order: 1 },
        { url: 'https://techcrunch.com/1', domain: 'techcrunch.com', order: 2 },
      ],
    ];

    const frequencies = aggregateCitationFrequencies(batchCitations);
    expect(frequencies[0].domain).toBe('g2.com');
    expect(frequencies[0].count).toBe(2);
    expect(frequencies[0].percentage).toBe(100.0); // 2 out of 2 runs
  });
});

