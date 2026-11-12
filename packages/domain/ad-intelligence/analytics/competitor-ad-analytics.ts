// Visnora — Competitor Ad Analytics Aggregator
// Reference: M5.3 Competitor Ad Analytics

import { NormalizedAdRecord, CompetitorAdAnalyticsSummary } from '../types';

export class CompetitorAdAnalyticsService {
  /**
   * Calculates comprehensive ad analytics summary for a competitor.
   */
  public static calculateCompetitorSummary(
    competitorId: string,
    ads: NormalizedAdRecord[],
    competitorInfo?: { name: string; domain: string }
  ): CompetitorAdAnalyticsSummary {
    const totalAdsDiscovered = ads.length;
    const activeAdsCount = ads.filter(a => a.status === 'ACTIVE').length;

    // Platform distribution
    const platformCounts: Record<string, number> = {};
    for (const ad of ads) {
      platformCounts[ad.platform] = (platformCounts[ad.platform] || 0) + 1;
    }
    const platformDistribution = Object.entries(platformCounts).map(([platform, count]) => ({
      platform,
      count,
      percentage: totalAdsDiscovered > 0 ? Math.round((count / totalAdsDiscovered) * 100) : 0,
    }));

    // Format distribution
    const formatCounts: Record<string, number> = {};
    for (const ad of ads) {
      formatCounts[ad.format] = (formatCounts[ad.format] || 0) + 1;
    }
    const formatDistribution = Object.entries(formatCounts).map(([format, count]) => ({
      format,
      count,
      percentage: totalAdsDiscovered > 0 ? Math.round((count / totalAdsDiscovered) * 100) : 0,
    }));

    // Top CTAs
    const ctaCounts: Record<string, number> = {};
    for (const ad of ads) {
      const cta = ad.ctaText || 'Learn More';
      ctaCounts[cta] = (ctaCounts[cta] || 0) + 1;
    }
    const topCtas = Object.entries(ctaCounts)
      .map(([cta, count]) => ({ cta, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Active offers
    const offerSet = new Set<string>();
    const commonThemesSet = new Set<string>();

    for (const ad of ads) {
      const text = `${ad.headline || ''} ${ad.primaryText || ''} ${ad.description || ''}`.toLowerCase();
      if (text.includes('50% off')) offerSet.add('50% OFF first order');
      if (text.includes('125 off') || text.includes('₹125')) offerSet.add('Flat ₹125 OFF');
      if (text.includes('free delivery')) offerSet.add('Free Delivery');
      if (text.includes('cashback')) offerSet.add('10% Cashback / Points');
      if (text.includes('zero delivery')) offerSet.add('Zero Delivery Fee');

      // Messaging themes
      if (text.includes('speed') || text.includes('minute') || text.includes('fast') || text.includes('superfast')) {
        commonThemesSet.add('Speed & Rapid Delivery');
      }
      if (text.includes('discount') || text.includes('save') || text.includes('lowest price')) {
        commonThemesSet.add('Aggressive Price Discounting');
      }
      if (text.includes('multi') || text.includes('multiple brands') || text.includes('one order')) {
        commonThemesSet.add('Multi-Brand Single Delivery Cart');
      }
      if (text.includes('late night') || text.includes('cravings')) {
        commonThemesSet.add('Late Night Cravings & Indulgence');
      }
      if (text.includes('fresh') || text.includes('quality') || text.includes('hygiene') || text.includes('checks')) {
        commonThemesSet.add('Quality & Health Assurance');
      }
    }

    // Top Landing pages
    const landingMap: Record<string, { domain: string; url: string; count: number }> = {};
    for (const ad of ads) {
      if (ad.landingPageUrl) {
        try {
          const parsed = new URL(ad.landingPageUrl);
          const key = parsed.origin + parsed.pathname;
          if (!landingMap[key]) {
            landingMap[key] = {
              domain: parsed.hostname.replace(/^www\./, ''),
              url: ad.landingPageUrl,
              count: 0,
            };
          }
          landingMap[key].count++;
        } catch {
          // ignore invalid URLs
        }
      }
    }
    const topLandingPages = Object.values(landingMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Timestamps
    const timestamps = ads.map(a => a.firstSeenAt?.getTime()).filter(Boolean) as number[];
    const firstDiscoveredAt = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined;

    return {
      competitorId,
      competitorName: competitorInfo?.name || ads[0]?.advertiserName || 'Competitor',
      competitorDomain: competitorInfo?.domain || (topLandingPages[0]?.domain) || 'competitor.com',
      totalAdsDiscovered,
      activeAdsCount,
      platformDistribution,
      formatDistribution,
      topCtas,
      activeOffers: Array.from(offerSet),
      commonMessagingThemes: Array.from(commonThemesSet),
      topLandingPages,
      firstDiscoveredAt,
      lastCheckedAt: new Date(),
    };
  }
}

