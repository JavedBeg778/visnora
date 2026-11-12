'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Target,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function ChatGPTAdsAnalyticsPage() {
  const [days, setDays] = useState('14');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setErrorMsg(null);

    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000).toISOString();

    try {
      const [insRes, campRes, trendRes] = await Promise.all([
        fetch(`/api/v1/chatgpt-ads/insights?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/v1/chatgpt-ads/insights/campaigns?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/v1/chatgpt-ads/insights/trends?startDate=${startDate}&endDate=${endDate}`),
      ]);

      const insData = await insRes.json();
      const campData = await campRes.json();
      const trendData = await trendRes.json();

      if (insData.success) setOverview(insData.data);
      else setErrorMsg(insData.error?.message || 'Error loading overview.');

      if (campData.success) setCampaigns(campData.data || []);
      if (trendData.success) setTrends(trendData.data || []);
    } catch {
      setErrorMsg('Failed to fetch analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const handleExportCsv = () => {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000).toISOString();
    window.location.href = `/api/v1/chatgpt-ads/insights/export?startDate=${startDate}&endDate=${endDate}`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Performance Analytics & Reporting</h1>
          <p className="text-sm text-slate-500 mt-1">
            Telemetry from OpenAI Ads Advertiser API. Strict non-fabrication standards applied.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setDays('7')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${days === '7' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDays('14')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${days === '14' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              14 Days
            </button>
            <button
              onClick={() => setDays('30')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${days === '30' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDays('90')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${days === '90' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              90 Days
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Freshness Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-slate-600">
            Reporting Window: <strong>Past {days} Days</strong> | Data Freshness:
          </span>
          <span
            className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
              overview?.freshnessStatus === 'FRESH'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {overview?.freshnessStatus === 'FRESH' ? 'Finalized Data' : 'Recent Delay Window'}
          </span>
        </div>
        <div className="text-slate-400">
          Last Synchronized: {overview?.lastSyncAt ? new Date(overview.lastSyncAt).toLocaleString() : 'N/A'}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Spend</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">{overview?.spendFormatted || '$0.00'}</div>
          <span className="text-xs text-slate-500 mt-1 block">Avg CPC: {overview?.cpcFormatted || '$0.00'}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Impressions / Clicks</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {overview?.impressions?.toLocaleString() || 0}{' '}
            <span className="text-sm font-normal text-slate-400">/ {overview?.clicks?.toLocaleString() || 0}</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">CTR: {overview?.ctr || 0}%</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Conversions</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">{overview?.conversions?.toLocaleString() || 0}</div>
          <span className="text-xs text-slate-500 mt-1 block">Avg CPA: {overview?.cpaFormatted || '$0.00'}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Attributed Sales / ROAS</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">{overview?.roas || 0}x</div>
          <span className="text-xs text-slate-500 mt-1 block">Revenue: {overview?.attributedSalesFormatted || '$0.00'}</span>
        </div>
      </div>

      {/* Campaign Performance Comparison */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Campaign Performance Breakdown
        </h2>

        {campaigns.length === 0 && !loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No performance records found for this time period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Campaign</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Objective</th>
                  <th className="py-2.5 px-3">Budget</th>
                  <th className="py-2.5 px-3">Impressions</th>
                  <th className="py-2.5 px-3">Clicks</th>
                  <th className="py-2.5 px-3">Spend</th>
                  <th className="py-2.5 px-3">CTR</th>
                  <th className="py-2.5 px-3">Conversions</th>
                  <th className="py-2.5 px-3">CPA</th>
                  <th className="py-2.5 px-3">Freshness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((c) => (
                  <tr key={c.campaignId} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900">{c.campaignName}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">{c.objective}</td>
                    <td className="py-3 px-3">${c.budget.toFixed(2)}</td>
                    <td className="py-3 px-3">{c.impressions.toLocaleString()}</td>
                    <td className="py-3 px-3">{c.clicks.toLocaleString()}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">${c.spend.toFixed(2)}</td>
                    <td className="py-3 px-3">{c.ctr.toFixed(2)}%</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{c.conversions}</td>
                    <td className="py-3 px-3">${c.cpa.toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${c.isDelayed ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {c.isDelayed ? 'Delayed' : 'Final'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Daily Performance Trends */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Daily Trends Telemetry
        </h2>

        {trends.length === 0 && !loading ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No daily trend telemetry points available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Impressions</th>
                  <th className="py-2 px-3">Clicks</th>
                  <th className="py-2 px-3">Spend (USD)</th>
                  <th className="py-2 px-3">CTR (%)</th>
                  <th className="py-2 px-3">Conversions</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trends.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-900">{t.date}</td>
                    <td className="py-2.5 px-3">{t.impressions?.toLocaleString() || 0}</td>
                    <td className="py-2.5 px-3">{t.clicks?.toLocaleString() || 0}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">${t.spend?.toFixed(2) || '0.00'}</td>
                    <td className="py-2.5 px-3">{t.ctr?.toFixed(2) || 0}%</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{t.conversions || 0}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.isFinal ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {t.isFinal ? 'Finalized' : 'Pending Window'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

