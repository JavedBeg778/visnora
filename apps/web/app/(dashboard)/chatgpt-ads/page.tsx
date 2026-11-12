'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  Layers,
  Sparkles,
  BarChart3,
  Target,
  Lightbulb,
  Radio,
  Settings,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Plus,
  Play,
  Pause,
  CheckCircle2,
} from 'lucide-react';

export default function ChatGPTAdsOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [overview, setOverview] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, insRes, campRes, recRes, monRes] = await Promise.all([
        fetch('/api/v1/chatgpt-ads/accounts'),
        fetch('/api/v1/chatgpt-ads/insights'),
        fetch('/api/v1/chatgpt-ads/campaigns'),
        fetch('/api/v1/chatgpt-ads/recommendations'),
        fetch('/api/v1/chatgpt-ads/monitoring'),
      ]);

      const accData = await accRes.json();
      const insData = await insRes.json();
      const campData = await campRes.json();
      const recData = await recRes.json();
      const monData = await monRes.json();

      if (accData.success) {
        setAccounts(accData.data || []);
        if (accData.data?.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accData.data[0].id);
        }
      }
      if (insData.success) setOverview(insData.data);
      if (campData.success) setCampaigns(campData.data || []);
      if (recData.success) setRecommendations(recData.data || []);
      if (monData.success) setAlerts(monData.data?.activeAlerts || []);
    } catch (err) {
      console.error('Failed to load ChatGPT ads overview data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncNow = async () => {
    if (!selectedAccountId) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch('/api/v1/chatgpt-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMsg('Synchronization job queued successfully.');
        setTimeout(fetchData, 1500);
      } else {
        setSyncMsg(data.error?.message || 'Sync failed.');
      }
    } catch {
      setSyncMsg('Failed to trigger synchronization.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-slate-900">ChatGPT Ads Hub</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Official OpenAI Partner Engine
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Conversational advertising campaign orchestration, telemetry, and automated AI optimization.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {accounts.length > 0 ? (
            <>
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="inline-flex items-center px-3.5 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <Link
                href="/chatgpt-ads/campaigns"
                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Campaign
              </Link>
            </>
          ) : (
            <Link
              href="/chatgpt-ads/settings"
              className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Connect OpenAI Ads Account
            </Link>
          )}
        </div>
      </div>

      {syncMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>{syncMsg}</span>
          <button onClick={() => setSyncMsg(null)} className="text-xs text-emerald-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Account Status / Alerts */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900">{alerts[0].title}</h3>
            <p className="text-xs text-amber-700 mt-0.5">{alerts[0].message}</p>
          </div>
          <Link
            href="/chatgpt-ads/monitoring"
            className="text-xs font-semibold text-amber-800 hover:underline whitespace-nowrap"
          >
            View Alerts ({alerts.length}) &rarr;
          </Link>
        </div>
      )}

      {accounts.length === 0 && !loading && (
        <div className="bg-white border border-dashed border-slate-300 p-12 rounded-2xl text-center space-y-4">
          <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Bot className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-bold text-slate-900">No OpenAI Ads Account Connected</h2>
            <p className="text-sm text-slate-500 mt-1">
              Connect your authorized OpenAI Ads advertiser account to track conversational performance, orchestrate sponsored results, and receive AI optimization recommendations.
            </p>
          </div>
          <Link
            href="/chatgpt-ads/settings"
            className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            Connect Account Now
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Spend</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              {overview?.freshnessStatus || 'FRESH'}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {overview?.spendFormatted || '$0.00'}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600 mr-1" />
            <span>Avg CPC: {overview?.cpcFormatted || '$0.00'}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Impressions & Clicks</span>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {overview?.impressions?.toLocaleString() || '0'}{' '}
            <span className="text-sm font-normal text-slate-400">/ {overview?.clicks?.toLocaleString() || '0'} clicks</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            CTR: <span className="font-semibold text-slate-700">{overview?.ctr || 0}%</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Conversions</span>
            <Target className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {overview?.conversions?.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Avg CPA: <span className="font-semibold text-slate-700">{overview?.cpaFormatted || '$0.00'}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Attributed ROAS</span>
            <Sparkles className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {overview?.roas || 0}x
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Sales: <span className="font-semibold text-slate-700">{overview?.attributedSalesFormatted || '$0.00'}</span>
          </div>
        </div>
      </div>

      {/* Module Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link
          href="/chatgpt-ads/campaigns"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Layers className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-3 group-hover:text-emerald-700 flex items-center justify-between">
            <span>Campaigns</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Manage budgets, targeting, schedules, and active statuses (default PAUSED).
          </p>
        </Link>

        <Link
          href="/chatgpt-ads/creative-studio"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-3 group-hover:text-blue-700 flex items-center justify-between">
            <span>Creative Studio</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            In-thread ChatGPT conversational preview and AI copy generator.
          </p>
        </Link>

        <Link
          href="/chatgpt-ads/conversions"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Target className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-3 group-hover:text-purple-700 flex items-center justify-between">
            <span>Conversions API & Pixel</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Measurement Pixel snippet and server-to-server CAPI deduplication.
          </p>
        </Link>

        <Link
          href="/chatgpt-ads/optimization"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Lightbulb className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-3 group-hover:text-amber-700 flex items-center justify-between">
            <span>AI Optimization</span>
            <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            12-dimension recommendations: negative prompts, context hints, CTAs.
          </p>
        </Link>
      </div>

      {/* Campaigns Table & Recommendations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Campaigns</h2>
              <p className="text-xs text-slate-500 mt-0.5">Live status and budget control</p>
            </div>
            <Link
              href="/chatgpt-ads/campaigns"
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              View all ({campaigns.length}) &rarr;
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No campaigns created yet. Start by creating a campaign in the Campaigns manager.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-lg">Campaign</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Objective</th>
                    <th className="py-2.5 px-3">Daily Budget</th>
                    <th className="py-2.5 px-3 rounded-r-lg text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.slice(0, 5).map((camp) => (
                    <tr key={camp.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {camp.name}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            camp.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{camp.objective}</td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        ${(Number(camp.budgetAmountPaise || 0) / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/chatgpt-ads/campaigns`}
                          className="text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top AI Recommendations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">AI Optimization</h2>
              <p className="text-xs text-slate-500 mt-0.5">High-impact actions</p>
            </div>
            <Link
              href="/chatgpt-ads/optimization"
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              Explore all &rarr;
            </Link>
          </div>

          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No pending recommendations. All campaigns are operating at optimal parameters.
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 transition-colors bg-slate-50/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      {rec.category?.replace(/_/g, ' ') || 'OPTIMIZATION'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {rec.confidence} Confidence
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{rec.title}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{rec.explanation}</p>
                  <div className="pt-1 flex justify-end">
                    <Link
                      href="/chatgpt-ads/optimization"
                      className="text-xs font-semibold text-amber-700 hover:underline"
                    >
                      Review & Apply &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

