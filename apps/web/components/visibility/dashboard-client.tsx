'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  TrendingUp,
  Percent,
  Link2,
  Award,
  Play,
  RotateCw,
  Info,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

interface DashboardClientProps {
  initialOverview: any;
  initialTrends: any[];
  projects: any[];
  currentProjectId: string;
  organizationId: string;
}

export function DashboardClient({
  initialOverview,
  initialTrends,
  projects,
  currentProjectId: initialProjectId,
  organizationId,
}: DashboardClientProps) {
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState(initialOverview);
  const [trends, setTrends] = useState(initialTrends);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  // Quick Tracking Run Trigger
  const handleTriggerRun = async () => {
    if (!selectedProjectId) return;
    setRunning(true);
    setRunMessage(null);
    try {
      const res = await fetch('/api/v1/tracking/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          provider: 'google-gemini',
          model: 'gemini-3.8-flash',
          enableGrounding: false,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRunMessage(`Tracking run completed! ${json.data.summary.successCount} prompts analyzed.`);
        // Refresh overview
        await refreshData(selectedProjectId, days);
      } else {
        setRunMessage(`Run notice: ${json.error?.message || 'Could not complete run'}`);
      }
    } catch (err: any) {
      setRunMessage(`Error: ${err.message || 'Run failed'}`);
    } finally {
      setRunning(false);
    }
  };

  const refreshData = async (projId: string, dayRange: number) => {
    setLoading(true);
    try {
      const [overviewRes, trendsRes] = await Promise.all([
        fetch(`/api/v1/analytics/visibility?projectId=${projId}&days=${dayRange}`, {
          headers: { 'x-organization-id': organizationId },
        }),
        fetch(`/api/v1/analytics/trends?projectId=${projId}&days=${dayRange}`, {
          headers: { 'x-organization-id': organizationId },
        }),
      ]);
      const overviewJson = await overviewRes.json();
      const trendsJson = await trendsRes.json();
      if (overviewJson.success) setOverview(overviewJson.data);
      if (trendsJson.success) setTrends(trendsJson.data);
    } catch {
      // Keep existing data
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedProjectId(newId);
    refreshData(newId, days);
  };

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
    refreshData(selectedProjectId, newDays);
  };

  const score = overview?.visibilityScore || {
    score: 0,
    omrComponent: 0,
    ssovComponent: 0,
    citationComponent: 0,
    sentimentComponent: 0,
  };

  const kpis = overview?.kpis || {
    observedMentionRate: 0,
    sampleShareOfVoice: 0,
    citationRate: 0,
    averagePosition: null,
    totalTrackedPrompts: 0,
    totalCompletedRuns: 0,
    totalMentions: 0,
    totalCitations: 0,
  };

  const sentiment = overview?.sentimentDistribution || {
    positive: 0,
    neutral: 0,
    negative: 0,
    mixed: 0,
  };

  return (
    <div className="space-y-6">
      {/* Sampling Disclaimer Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 px-4 text-xs text-blue-900 flex items-start space-x-3">
        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-blue-950">Statistical Methodology Notice: </span>
          Visnora metrics are derived from sampled AI model executions under specified evaluation parameters. They reflect observed model outputs at the time of query, not universal or deterministic rankings across all search queries.
        </div>
      </div>

      {/* Top Filter and Execution Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <label htmlFor="project-select" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Brand Project:
          </label>
          <select
            id="project-select"
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.primaryWebsite})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {/* Day range toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => handleDaysChange(7)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                days === 7 ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => handleDaysChange(30)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                days === 30 ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30D
            </button>
            <button
              onClick={() => handleDaysChange(90)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                days === 90 ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              90D
            </button>
          </div>

          <Button
            size="sm"
            onClick={handleTriggerRun}
            disabled={running || !selectedProjectId}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {running ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            <span>{running ? 'Running Analysis...' : 'Start Tracking Run'}</span>
          </Button>
        </div>
      </div>

      {runMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{runMessage}</span>
        </div>
      )}

      {/* Row 1: Visibility Score & Core Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Score Card: 4 cols */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                AI Visibility Score
              </span>
              <Badge variant="blue" className="text-[10px]">
                Composite 0-100
              </Badge>
            </div>

            <div className="mt-4 flex items-baseline space-x-3">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {score.score}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  score.score >= 60
                    ? 'bg-emerald-100 text-emerald-800'
                    : score.score >= 30
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {score.score >= 70 ? 'High Impact' : score.score >= 40 ? 'Moderate' : 'Emerging'}
              </span>
            </div>

            {/* Formula Breakdown Progress Bars */}
            <div className="mt-6 space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-500">Score Weight Breakdown:</div>
              <div>
                <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Mention Rate (45% max)</span>
                  <span className="font-bold">{score.omrComponent} pts</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${(score.omrComponent / 45) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Share of Voice (25% max)</span>
                  <span className="font-bold">{score.ssovComponent} pts</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(score.ssovComponent / 25) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Citation Rate (15% max)</span>
                  <span className="font-bold">{score.citationComponent} pts</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${(score.citationComponent / 15) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Positive Sentiment (15% max)</span>
                  <span className="font-bold">{score.sentimentComponent} pts</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${(score.sentimentComponent / 15) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
            Computed over {kpis.totalCompletedRuns} eligible responses in the past {days} days.
          </div>
        </div>

        {/* 4 Core KPIs: 8 cols */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Observed Mention Rate</span>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold text-slate-900">{kpis.observedMentionRate}%</div>
              <p className="text-xs text-slate-500 mt-1">
                Mentioned in {kpis.totalMentions} of {kpis.totalCompletedRuns} completed queries.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-blue-600 font-medium">Primary discovery metric</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Share of Voice (SSOV)</span>
              <Percent className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold text-slate-900">{kpis.sampleShareOfVoice}%</div>
              <p className="text-xs text-slate-500 mt-1">
                Of total brand & competitor mentions in search outputs.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-indigo-600 font-medium">Relative market presence</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Citation Rate</span>
              <Link2 className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold text-slate-900">{kpis.citationRate}%</div>
              <p className="text-xs text-slate-500 mt-1">
                {kpis.totalCitations} verified external source links captured.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-purple-600 font-medium">Domain reference frequency</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Position</span>
              <Award className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold text-slate-900">
                {kpis.averagePosition !== null ? `#${kpis.averagePosition}` : '—'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Average ranking in lists when brand is recommended.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-amber-600 font-medium">Prominence rank</div>
          </div>
        </div>
      </div>

      {/* Row 2: Trend Chart & Sentiment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Visibility Score Trend Line Chart: 8 cols */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Visibility Score Daily Trend</h2>
              <p className="text-xs text-slate-500">Historical performance over selected time window</p>
            </div>
            <Badge variant="blue" className="text-[10px]">
              Daily Trajectory
            </Badge>
          </div>

          <div className="h-64 w-full">
            {trends && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#172033',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visibilityScore"
                    name="Visibility Score"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#scoreGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="mentionRate"
                    name="Mention Rate (%)"
                    stroke="#10B981"
                    strokeWidth={1.5}
                    fillOpacity={0}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No historical trend data recorded yet. Run tracking runs to populate trends.
              </div>
            )}
          </div>
        </div>

        {/* Sentiment Distribution: 4 cols */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Sentiment Distribution</h2>
              <span className="text-xs font-semibold text-slate-400">AI Context</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Contextual tone across observed AI mentions for this brand.
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span className="text-emerald-700 font-semibold">Positive</span>
                  <span className="font-bold">{sentiment.positive}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${sentiment.positive}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span className="text-slate-600 font-semibold">Neutral</span>
                  <span className="font-bold">{sentiment.neutral}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-2 rounded-full" style={{ width: `${sentiment.neutral}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span className="text-rose-700 font-semibold">Negative</span>
                  <span className="font-bold">{sentiment.negative}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${sentiment.negative}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span className="text-amber-700 font-semibold">Mixed</span>
                  <span className="font-bold">{sentiment.mixed}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${sentiment.mixed}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link href="/prompts" className="text-blue-600 font-semibold hover:underline">
              Inspect Prompts &rarr;
            </Link>
            <Link href="/competitors/compare" className="text-slate-500 font-semibold hover:underline">
              Compare Competitors &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Prompt Executions Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent AI Responses & Verbatim Mentions</h2>
            <p className="text-xs text-slate-500">Live prompt executions and brand mentions</p>
          </div>
          <Link href="/runs">
            <Button variant="secondary" size="sm" className="text-xs">
              View All Runs
            </Button>
          </Link>
        </div>

        {overview?.recentRuns && overview.recentRuns.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {overview.recentRuns.map((run: any) => {
              const resp = run.aiResponse;
              const brandMention = resp?.mentions?.find((m: any) => m.brandId);
              return (
                <div key={run.id} className="py-3.5 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900">
                      &ldquo;{run.prompt?.promptText}&rdquo;
                    </span>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium">
                        {run.prompt?.category || 'General'}
                      </span>
                      <span>•</span>
                      <span>{new Date(run.executedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {resp?.rawText ? (
                    <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      &ldquo;{resp.rawText}&rdquo;
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No response text captured or run pending.</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-semibold text-slate-500">Mentions:</span>
                    {resp?.mentions && resp.mentions.length > 0 ? (
                      resp.mentions.map((m: any) => (
                        <span
                          key={m.id}
                          className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                            m.brandId
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {m.brandId ? '★ Primary Brand' : m.competitor?.canonicalName || 'Competitor'}
                          {m.sentiment ? ` (${m.sentiment})` : ''}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">No brand or competitor mentioned in this response.</span>
                    )}

                    {resp?.citations && resp.citations.length > 0 && (
                      <span className="ml-auto text-purple-700 font-semibold flex items-center space-x-1">
                        <Link2 className="h-3 w-3" />
                        <span>{resp.citations.length} citation(s)</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No prompt executions recorded yet. Click &ldquo;Start Tracking Run&rdquo; to test your prompts against Gemini.
          </div>
        )}
      </div>
    </div>
  );
}

