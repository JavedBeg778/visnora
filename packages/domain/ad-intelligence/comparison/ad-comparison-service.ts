// Visnora — Side-by-Side Ad Comparison Service
// Reference: M5.3 Side-by-Side Ad Comparison & AI Synthesis

import { AdComparisonView, NormalizedAdRecord, AdAnalysis12Dimensions } from '../types';

export interface AdComparisonInputItem {
  id: string;
  advertiserName: string;
  headline?: string;
  primaryText?: string;
  platform: string;
  format: string;
  ctaText?: string;
  landingPageUrl?: string;
  analysis?: AdAnalysis12Dimensions;
}

export class AdComparisonService {
  /**
   * Generates a side-by-side comparison view with synthesized strategic comparison insights.
   */
  public static compareAds(
    ads: AdComparisonInputItem[],
    customTitle?: string
  ): AdComparisonView {
    if (ads.length < 2) {
      throw new Error('Ad comparison requires at least 2 advertisements.');
    }

    const title = customTitle || `${ads.map(a => a.advertiserName).filter((v, i, arr) => arr.indexOf(v) === i).join(' vs ')} Creative Comparison`;

    // Extract common & differing themes
    const commonThemes: string[] = [];
    const differingThemes: string[] = [];

    // Check platform commonality / differences
    const platforms = new Set(ads.map(a => a.platform));
    if (platforms.size === 1) {
      commonThemes.push(`All competing creatives deployed on ${Array.from(platforms)[0]}`);
    } else {
      differingThemes.push(`Multi-channel split across ${Array.from(platforms).join(', ')}`);
    }

    // Check CTA strategy
    const ctas = new Set(ads.map(a => a.ctaText || 'Learn More'));
    if (ctas.size === 1) {
      commonThemes.push(`Identical conversion intent with "${Array.from(ctas)[0]}" CTA`);
    } else {
      differingThemes.push(`Divergent call-to-actions: ${ads.map(a => `${a.advertiserName} uses "${a.ctaText || 'Learn More'}"`).join(' vs ')}`);
    }

    // Check format alignment
    const formats = new Set(ads.map(a => a.format));
    if (formats.size === 1) {
      commonThemes.push(`Shared creative asset format (${Array.from(formats)[0]})`);
    } else {
      differingThemes.push(`Format contrast: ${ads.map(a => `${a.advertiserName} (${a.format})`).join(' vs ')}`);
    }

    // Positioning contrast from analysis
    const positioningStatements = ads
      .filter(a => a.analysis?.positioning)
      .map(a => `${a.advertiserName} positions on "${a.analysis!.positioning}"`);

    if (positioningStatements.length >= 2) {
      differingThemes.push(`Positioning Angle: ${positioningStatements.join(' whereas ')}`);
    }

    // AI Synthesis summary
    const aiSummary = this.generateComparativeSynthesis(ads);

    return {
      title,
      ads: ads.map(a => ({
        id: a.id,
        headline: a.headline,
        primaryText: a.primaryText,
        advertiserName: a.advertiserName,
        platform: a.platform,
        format: a.format,
        ctaText: a.ctaText,
        landingPageUrl: a.landingPageUrl,
        analysis: a.analysis,
      })),
      aiSummary,
      commonThemes: commonThemes.length > 0 ? commonThemes : ['Targeting digital consumer meal discovery and rapid ordering.'],
      differingThemes: differingThemes.length > 0 ? differingThemes : ['Variation in visual execution and onboarding promo incentives.'],
    };
  }

  private static generateComparativeSynthesis(ads: AdComparisonInputItem[]): string {
    const names = ads.map(a => a.advertiserName);
    const first = ads[0];
    const second = ads[1];

    return `Comparative analysis reveals contrasting customer acquisition tactics between ${names.join(' and ')}. ` +
      `${first.advertiserName} focuses primarily on ${first.analysis?.positioning || 'speed and immediate order gratification'} ` +
      `with a high-urgency "${first.ctaText || 'Order Now'}" trigger. ` +
      `In contrast, ${second.advertiserName} differentiates through ${second.analysis?.positioning || 'value differentiation and assortment'} ` +
      `addressing distinct customer friction points. ` +
      `Brands competing in this space should test contrasting copy angles—combining rapid fulfillment reassurance with bundled savings to out-convert both competitors.`;
  }
}

