import { describe, it, expect } from 'vitest';
import { extractMentions } from '../../packages/domain/ai-visibility/extractor';
import { BrandEntity } from '../../packages/domain/ai-visibility/types';

describe('Brand & Competitor Mention Extraction', () => {
  const targetBrand: BrandEntity = {
    id: 'brand-1',
    canonicalName: 'Visnora',
    domain: 'visnora.com',
    aliases: ['Visnora AI', 'Visnora App'],
  };

  const competitors: BrandEntity[] = [
    {
      id: 'comp-1',
      canonicalName: 'Semrush',
      domain: 'semrush.com',
      aliases: [],
    },
    {
      id: 'comp-2',
      canonicalName: 'Ahrefs',
      domain: 'ahrefs.com',
      aliases: [],
    },
  ];

  it('detects primary brand and competitor mentions with word boundaries', () => {
    const rawText =
      'For AI visibility and marketing intelligence, Visnora is a specialized platform. In contrast, Semrush and Ahrefs focus on traditional SEO.';
    const mentions = extractMentions(rawText, targetBrand, competitors);

    expect(mentions.length).toBe(3);
    const visnoraMention = mentions.find((m) => m.entityName === 'Visnora');
    expect(visnoraMention).toBeDefined();
    expect(visnoraMention?.isPrimaryBrand).toBe(true);

    const semrushMention = mentions.find((m) => m.entityName === 'Semrush');
    expect(semrushMention).toBeDefined();
    expect(semrushMention?.isPrimaryBrand).toBe(false);
  });

  it('avoids false-positive substring matches', () => {
    const brandWithShortName: BrandEntity = {
      id: 'b-short',
      canonicalName: 'App',
      domain: 'app.com',
      aliases: [],
    };

    const rawText = 'I am eating an apple on the platform.';
    const mentions = extractMentions(rawText, brandWithShortName, []);
    expect(mentions.length).toBe(0);
  });

  it('detects brand aliases and extracts list position when present', () => {
    const rawText = `
Here are top recommended tools:
1. Visnora AI
2. Semrush
3. OtherTool
    `;
    const mentions = extractMentions(rawText, targetBrand, competitors);
    const visnoraAlias = mentions.find((m) => m.entityName === 'Visnora');

    expect(visnoraAlias).toBeDefined();
    expect(visnoraAlias?.listPosition).toBe(1);
    expect(visnoraAlias?.confidence).toBe(0.9); // Alias confidence
  });
});

