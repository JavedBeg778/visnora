// Visnora — Creative Element Extractor
// Reference: M5.2 Structured Creative Extraction

import crypto from 'crypto';
import {
  AdFormatType,
  AdCreativeAsset,
  AdLandingPageInfo,
  NormalizedAdRecord,
} from '../types';

export interface ExtractedCreativeData {
  headline: string;
  primaryText: string;
  description: string;
  ctaText: string;
  format: AdFormatType;
  offers: string[];
  audienceKeywords: string[];
  contentHash: string;
  creatives: AdCreativeAsset[];
  landingPage?: AdLandingPageInfo;
}

export class CreativeExtractor {
  private static readonly COMMON_OFFER_PATTERNS = [
    /\b(\d+%\s*off)\b/i,
    /\b(flat\s*(?:₹|\$|€|rs\.?)\s*\d+\s*off)\b/i,
    /\b(save\s*(?:up\s*to\s*)?\d+%?)\b/i,
    /\b(free\s*delivery|free\s*shipping)\b/i,
    /\b(buy\s*1\s*get\s*1\s*free|bogo)\b/i,
    /\b(cashback(?:\s*up\s*to\s*\d+%?)?)\b/i,
    /\b(use\s*code\s*[:\s]*[A-Z0-9_-]+)\b/i,
    /\b(zero\s*(?:delivery|artificial|fee))\b/i,
    /\b(lowest\s*price(?:\s*guaranteed)?)\b/i,
  ];

  private static readonly AUDIENCE_KEYWORDS = [
    'foodie', 'family', 'students', 'professionals', 'late night', 'office',
    'roommates', 'couples', 'fitness', 'budget', 'gourmet', 'veg', 'non-veg',
    'b2b', 'enterprise', 'startups', 'freelancers', 'creators',
  ];

  /**
   * Extracts structured creative information, detected offers, format, and canonical content hash.
   */
  public static extract(record: Partial<NormalizedAdRecord>): ExtractedCreativeData {
    const headline = (record.headline || '').trim();
    const primaryText = (record.primaryText || '').trim();
    const description = (record.description || '').trim();
    const rawCta = (record.ctaText || 'Learn More').trim();
    const advertiser = (record.advertiserName || 'Advertiser').trim();

    // Standardize CTA
    const ctaText = this.standardizeCta(rawCta);

    // Combine text corpus for offer & audience extraction
    const corpus = `${headline} ${primaryText} ${description}`;

    // Extract promotional offers
    const offers = this.extractOffers(corpus);

    // Extract audience signals
    const audienceKeywords = this.extractAudienceSignals(corpus);

    // Determine ad format
    const format = record.format || this.inferFormat(record);

    // Calculate deterministic canonical SHA-256 content hash
    const canonicalContent = [
      advertiser.toLowerCase(),
      headline.toLowerCase().replace(/\s+/g, ' '),
      primaryText.toLowerCase().replace(/\s+/g, ' '),
      ctaText.toLowerCase(),
    ].join('|');

    const contentHash = crypto
      .createHash('sha256')
      .update(canonicalContent)
      .digest('hex');

    // Creatives array
    const creatives: AdCreativeAsset[] = record.creatives && record.creatives.length > 0
      ? record.creatives
      : [
          {
            mediaType: format,
            mediaUrl: record.originalUrl,
            caption: headline || primaryText.slice(0, 100),
          },
        ];

    return {
      headline,
      primaryText,
      description,
      ctaText,
      format,
      offers,
      audienceKeywords,
      contentHash,
      creatives,
      landingPage: record.landingPage,
    };
  }

  private static standardizeCta(cta: string): string {
    const lower = cta.toLowerCase();
    if (lower.includes('order')) return 'Order Now';
    if (lower.includes('shop') || lower.includes('buy')) return 'Shop Now';
    if (lower.includes('install') || lower.includes('download') || lower.includes('get app')) return 'Install Now';
    if (lower.includes('book') || lower.includes('reserve')) return 'Book Now';
    if (lower.includes('sign up') || lower.includes('register')) return 'Sign Up';
    if (lower.includes('get offer') || lower.includes('claim')) return 'Get Offer';
    if (lower.includes('visit') || lower.includes('website')) return 'Visit Site';
    if (lower.includes('contact') || lower.includes('call')) return 'Contact Us';
    return 'Learn More';
  }

  private static extractOffers(text: string): string[] {
    const found = new Set<string>();
    for (const pattern of this.COMMON_OFFER_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[0]) {
        found.add(match[0].trim());
      }
    }
    return Array.from(found);
  }

  private static extractAudienceSignals(text: string): string[] {
    const lower = text.toLowerCase();
    const matches: string[] = [];
    for (const kw of this.AUDIENCE_KEYWORDS) {
      if (lower.includes(kw)) {
        matches.push(kw);
      }
    }
    return matches;
  }

  private static inferFormat(record: Partial<NormalizedAdRecord>): AdFormatType {
    if (record.creatives && record.creatives.length > 0) {
      const first = record.creatives[0];
      if (first.mediaType && first.mediaType !== 'UNKNOWN') {
        return first.mediaType;
      }
    }
    const corpus = `${record.headline || ''} ${record.primaryText || ''}`.toLowerCase();
    if (corpus.includes('video') || corpus.includes('watch') || corpus.includes('reels')) {
      return 'VIDEO';
    }
    if (corpus.includes('carousel') || corpus.includes('swipe')) {
      return 'CAROUSEL';
    }
    if (record.platform === 'GOOGLE_ADS') {
      return 'TEXT';
    }
    return 'IMAGE';
  }
}

