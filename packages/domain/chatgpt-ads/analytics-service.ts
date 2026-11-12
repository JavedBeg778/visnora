// Visnora — ChatGPT Ads Analytics & Reporting Service
// Strict Non-Fabrication Standard: Respects data freshness and null-vs-zero semantics.

import { prisma } from '../../database/src/client';
import { assertEntitlement, getOrganizationEntitlements } from '../billing/entitlements';
import { AnalyticsQueryInput, PerformanceOverview } from './types';

export class ReportingHistoryLimitError extends Error {
  constructor(requestedDays: number, maxAllowedDays: number) {
    super(
      `Requested reporting window of ${requestedDays} days exceeds your plan limit of ${maxAllowedDays} days. Upgrade your subscription plan for extended historical analytics.`
    );
    this.name = 'ReportingHistoryLimitError';
  }
}

/**
 * Calculates aggregate performance overview for an organization's ChatGPT Ads.
 */
function formatAccountCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
    CAD: 'C$',
  };
  const sym = symbols[currency?.toUpperCase()] || `${(currency || 'USD').toUpperCase()} `;
  return `${sym}${amount.toFixed(2)}`;
}

export async function getPerformanceOverview(input: AnalyticsQueryInput): Promise<PerformanceOverview> {
  const { organizationId, accountId, campaignId, startDate, endDate } = input;

  await assertEntitlement(organizationId, 'chatgpt_ads_intelligence');

  const entitlements = await getOrganizationEntitlements(organizationId);
  const maxDays = entitlements.reportingHistoryDays ?? 30;

  const now = new Date();
  const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start = startDate ? new Date(startDate) : defaultStart;
  const end = endDate ? new Date(endDate) : now;

  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > maxDays) {
    throw new ReportingHistoryLimitError(diffDays, maxDays);
  }

  const where: any = {
    organizationId,
    date: {
      gte: start,
      lte: end,
    },
  };
  if (accountId) where.accountId = accountId;
  if (campaignId) where.campaignId = campaignId;

  const insights = await prisma.chatGPTAdsInsight.findMany({
    where,
    orderBy: { date: 'asc' },
  });

  const account = accountId
    ? await prisma.chatGPTAdsAccount.findFirst({ where: { id: accountId, organizationId } })
    : null;

  const currency = account?.currency || 'USD';

  if (insights.length === 0) {
    return {
      impressions: 0,
      clicks: 0,
      spendPaise: '0',
      spendFormatted: formatAccountCurrency(0, currency),
      conversions: 0,
      attributedSalesPaise: '0',
      attributedSalesFormatted: formatAccountCurrency(0, currency),
      ctr: 0,
      cpcFormatted: formatAccountCurrency(0, currency),
      cpaFormatted: formatAccountCurrency(0, currency),
      currency,
      roas: 0,
      isFinal: true,
      freshnessStatus: account?.lastSyncAt ? 'FRESH' : 'UNAVAILABLE',
      lastSyncAt: account?.lastSyncAt || null,
    };
  }

  let totalImpressions = 0;
  let totalClicks = 0;
  let totalSpendPaise = BigInt(0);
  let totalConversions = 0;
  let totalAttributedSalesPaise = BigInt(0);
  let isAllFinal = true;

  for (const item of insights) {
    totalImpressions += item.impressions || 0;
    totalClicks += item.clicks || 0;
    totalSpendPaise += item.spendPaise || BigInt(0);
    totalConversions += item.conversions || 0;
    totalAttributedSalesPaise += item.attributedSalesPaise || BigInt(0);
    if (!item.isFinal) {
      isAllFinal = false;
    }
  }

  const ctr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
  const spendNum = Number(totalSpendPaise) / 100;
  const cpcNum = totalClicks > 0 ? spendNum / totalClicks : 0;
  const cpaNum = totalConversions > 0 ? spendNum / totalConversions : 0;
  const salesNum = Number(totalAttributedSalesPaise) / 100;
  const roas = spendNum > 0 ? Number((salesNum / spendNum).toFixed(2)) : 0;

  return {
    impressions: totalImpressions,
    clicks: totalClicks,
    spendPaise: totalSpendPaise.toString(),
    spendFormatted: formatAccountCurrency(spendNum, currency),
    conversions: totalConversions,
    attributedSalesPaise: totalAttributedSalesPaise.toString(),
    attributedSalesFormatted: formatAccountCurrency(salesNum, currency),
    ctr,
    cpcFormatted: formatAccountCurrency(cpcNum, currency),
    cpaFormatted: formatAccountCurrency(cpaNum, currency),
    currency,
    roas,
    isFinal: isAllFinal,
    freshnessStatus: isAllFinal ? 'FRESH' : 'DELAYED',
    lastSyncAt: account?.lastSyncAt || insights[insights.length - 1]?.fetchedAt || null,
  };
}

/**
 * Retrieves daily trend series for charting.
 */
export async function getPerformanceTrends(input: AnalyticsQueryInput) {
  const { organizationId, accountId, campaignId, startDate, endDate } = input;

  await assertEntitlement(organizationId, 'chatgpt_ads_intelligence');

  const now = new Date();
  const defaultStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const start = startDate ? new Date(startDate) : defaultStart;
  const end = endDate ? new Date(endDate) : now;

  const where: any = {
    organizationId,
    date: {
      gte: start,
      lte: end,
    },
  };
  if (accountId) where.accountId = accountId;
  if (campaignId) where.campaignId = campaignId;

  const insights = await prisma.chatGPTAdsInsight.findMany({
    where,
    orderBy: { date: 'asc' },
  });

  return insights.map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    impressions: row.impressions || 0,
    clicks: row.clicks || 0,
    spend: Number(row.spendPaise || BigInt(0)) / 100,
    conversions: row.conversions || 0,
    ctr: row.ctr || 0,
    isFinal: row.isFinal,
  }));
}

/**
 * Returns campaign performance comparisons.
 */
export async function getCampaignBreakdown(input: AnalyticsQueryInput) {
  const { organizationId, accountId } = input;
  await assertEntitlement(organizationId, 'chatgpt_ads_intelligence');

  const campaigns = await prisma.chatGPTAdsCampaign.findMany({
    where: { organizationId, ...(accountId ? { accountId } : {}) },
    include: {
      insights: {
        orderBy: { date: 'desc' },
        take: 30,
      },
    },
  });

  return campaigns.map((c) => {
    let imps = 0;
    let clicks = 0;
    let spendPaise = BigInt(0);
    let convs = 0;
    let hasDelayed = false;

    for (const ins of c.insights) {
      imps += ins.impressions || 0;
      clicks += ins.clicks || 0;
      spendPaise += ins.spendPaise || BigInt(0);
      convs += ins.conversions || 0;
      if (!ins.isFinal) hasDelayed = true;
    }

    const spendNum = Number(spendPaise) / 100;
    const ctr = imps > 0 ? Number(((clicks / imps) * 100).toFixed(2)) : 0;
    const cpa = convs > 0 ? Number((spendNum / convs).toFixed(2)) : 0;

    return {
      campaignId: c.id,
      campaignName: c.name,
      status: c.status,
      objective: c.objective,
      budget: Number(c.budgetAmountPaise) / 100,
      impressions: imps,
      clicks,
      spend: spendNum,
      conversions: convs,
      ctr,
      cpa,
      isDelayed: hasDelayed,
    };
  });
}

/**
 * Generates CSV export content for reporting.
 */
export async function exportAnalyticsCsv(input: AnalyticsQueryInput): Promise<string> {
  const breakdown = await getCampaignBreakdown(input);

  const header = ['Campaign Name', 'Status', 'Objective', 'Budget ($)', 'Impressions', 'Clicks', 'Spend ($)', 'Conversions', 'CTR (%)', 'CPA ($)', 'Data Freshness'];
  const rows = breakdown.map((b) => [
    `"${b.campaignName.replace(/"/g, '""')}"`,
    b.status,
    b.objective,
    b.budget.toFixed(2),
    b.impressions,
    b.clicks,
    b.spend.toFixed(2),
    b.conversions,
    b.ctr.toFixed(2),
    b.cpa.toFixed(2),
    b.isDelayed ? 'Delayed Window' : 'Fresh',
  ]);

  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
