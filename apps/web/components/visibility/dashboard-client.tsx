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
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Layers,
  HelpCircle,
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
import { EmptyState } from '../ui/empty-state';
import { formatBrandWebsite } from '../../lib/brand-utils';

interface DashboardClientProps {
  initialOverview: any;
  initialTrends: any[];
  brands?: any[];
  initialBrandId?: string;
  projects: any[];
  currentProjectId: string;
  organizationId: string;
}

export function DashboardClient({
  initialOverview,
  initialTrends,
  brands = [],
  initialBrandId,
  projects,
  currentProjectId: initialProjectId,
  organizationId,
}: DashboardClientProps) {
  // Resolve default brand: prioritize initialBrandId, then primary brand (avoiding Demo Brand if another brand exists), then first
  const defaultBrand =
    (initialBrandId && brands.find((b) => b.id === initialBrandId)) ||
    brands.find((b) => b.isPrimary && b.canonicalName !== 'Demo Brand') ||
    brands.find((b) => b.isPrimary) ||
    brands.find((b) => !b.domain.includes('example.com')) ||
    brands[0];

  const [selectedBrandId, setSelectedBrandId] = useState<string>(defaultBrand?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultBrand?.projectId || initialProjectId
  );
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState(initialOverview);
  const [trends, setTrends] = useState(initialTrends);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStatusType, setRunStatusType] = useState<'info' | 'success' | 'error' | null>(null);

  // Quick Tracking Run Trigger
  const handleTriggerRun = async () => {
    if (!selectedProjectId) return;
    setRunning(true);
    setRunMessage(null);
    setRunStatusType('info');

    const activeBrand = brands.find((b) => b.id === selectedBrandId) || defaultBrand;
    const brandName = activeBrand?.canonicalName || 'Active Brand';

    try {
      const res = await fetch('/api/v1/tracking/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          brandId: activeBrand?.id,
          provider: 'google-gemini',
          model: 'gemini-3.8-flash',
          enableGrounding: false,
        }),
      });
      const json = await res.json();

      if (json.success) {
        const runId = json.data.id || json.data.trackingRunId;
        const totalPrompts = json.data.promptCount || json.data.summary?.totalPrompts || 10;
        setActiveRunId(runId);
        setRunStatusType('info');
        setRunMessage(`Tracking pipeline started for ${brandName}! Evaluating ${totalPrompts} prompt query sample(s) in background.`);

        // Non-blocking status polling while background worker executes prompts
        if (runId) {
          let attempts = 0;
          const maxAttempts = 24; // 24 * 2.5s = 60s
          const pollInterval = setInterval(async () => {
            attempts++;
            try {
              const runRes = await fetch(`/api/v1/tracking/runs/${runId}`, {
                headers: { 'x-organization-id': organizationId },
              });
              const runJson = await runRes.json();
              if (runJson.success && runJson.data) {
                const r = runJson.data;
                if (r.status === 'COMPLETED' || r.status === 'PARTIALLY_COMPLETED' || r.status === 'PARTIAL' || r.status === 'FAILED') {
                  clearInterval(pollInterval);
                  setRunning(false);
                  if (r.status === 'FAILED') {
                    setRunStatusType('error');
                    setRunMessage(`Tracking pipeline finished with errors (${r.failedCount} failed). Check run details.`);
                  } else {
                    setRunStatusType('success');
                    setRunMessage(
                      `Tracking pipeline complete! Successfully evaluated ${r.successCount}/${r.promptCount} prompt query sample(s).`
                    );
                    await refreshData(selectedProjectId, selectedBrandId, days);
                  }
                }
              }
            } catch {
              // Ignore transient poll error
            }

            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              setRunning(false);
              setRunStatusType('info');
              setRunMessage('Tracking run is continuing in background. You can inspect progress on the Runs page.');
            }
          }, 2500);
        } else {
          setRunning(false);
        }
      } else {
        setRunning(false);
        setRunStatusType('error');
        setRunMessage(`Run notice: ${json.error?.message || 'Could not complete tracking run'}`);
      }
    } catch (err: any) {
      setRunning(false);
      setRunStatusType('error');
      setRunMessage(`Error: ${err.message || 'Run execution failed'}`);
    }
  };

  const refreshData = async (projId: string, brandId: string, dayRange: number) => {
    setLoading(true);
    try {
      const brandParam = brandId ? `&brandId=${encodeURIComponent(brandId)}` : '';
      const [overviewRes, trendsRes] = await Promise.all([
        fetch(`/api/v1/analytics/visibility?projectId=${projId}${brandParam}&days=${dayRange}`, {
          headers: { 'x-organization-id': organizationId },
        }),
        fetch(`/api/v1/analytics/trends?projectId=${projId}${brandParam}&days=${dayRange}`, {
          headers: { 'x-organization-id': organizationId },
        }),
      ]);
      const overviewJson = await overviewRes.json();
      const trendsJson = await trendsRes.json();
      if (overviewJson.success) setOverview(overviewJson.data);
      if (trendsJson.success) setTrends(trendsJson.data);
    } catch {
      // Retain current data on transient failure
    } finally {
      setLoading(false);
    }
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBrandId = e.target.value;
    setSelectedBrandId(newBrandId);
    // Persist active brand in cookie for 1 year
    document.cookie = `visnora_active_brand=${newBrandId}; path=/; max-age=31536000; SameSite=Lax`;
    const targetBrand = brands.find((b) => b.id === newBrandId);
    const newProjId = targetBrand?.projectId || selectedProjectId;
    if (newProjId !== selectedProjectId) {
      setSelectedProjectId(newProjId);
    }
    refreshData(newProjId, newBrandId, days);
  };

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
    refreshData(selectedProjectId, selectedBrandId, newDays);
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

  const currentBrand = brands.find((b) => b.id === selectedBrandId) || defaultBrand;
  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  return (
    <div className="space-y-6">
      {/* Methodology Alert Banner */}
      <div className="bg-white border border-blue-200/80 rounded-2xl p-4 shadow-subtle flex items-start space-x-3.5">
        <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-100">
          <Info className="h-4 w-4" />
        </div>
        <div className="text-xs text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-900">Statistical Sampling Methodology: </span>
          Visnora metrics are computed from periodic, empirical AI model evaluations across designated industry prompts. Scores depict actual observed generative output at time of execution and do not represent deterministic or static search indexing.
        </div>
      </div>

      {/* Top Filter and Execution Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="brand-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Active Brand:
          </label>
          <div className="relative">
            {brands.length > 0 ? (
              <select
                id="brand-select"
                value={selectedBrandId}
                onChange={handleBrandChange}
                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-subtle cursor-pointer"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.canonicalName} ({formatBrandWebsite(b.domain)})
                  </option>
                ))}
              </select>
            ) : (
              <select
                id="brand-select"
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  refreshData(e.target.value, '', days);
                }}
                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-subtle cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.primaryWebsite})
                  </option>
                ))}
              </select>
            )}
          </div>

          {currentBrand && (
            <span className="hidden sm:inline-flex items-center text-xs text-slate-500 font-medium">
              <Globe2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
              {formatBrandWebsite(currentBrand.domain)}
            </span>
          )}

          {brands.length === 0 && (
            <Link
              href="/brands"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center ml-2"
            >
              Configure Brand Profiles
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-3 self-end md:self-auto">
          {/* Day range pill buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => handleDaysChange(d)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  days === d
                    ? 'bg-white text-blue-700 shadow-subtle font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={handleTriggerRun}
            disabled={running || !selectedProjectId}
            className="shadow-sm"
          >
            {running ? (
              <RotateCw className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1.5" />
            )}
            <span>{running ? 'Evaluating...' : 'Run Pipeline'}</span>
          </Button>
        </div>
      </div>

      {runMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            runStatusType === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : runStatusType === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {runStatusType === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            ) : runStatusType === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <RotateCw className="h-4 w-4 text-blue-600 flex-shrink-0 animate-spin" />
            )}
            <span>{runMessage}</span>
          </div>
          {activeRunId && (
            <Link
              href={`/runs/${activeRunId}`}
              className="text-xs font-bold underline flex items-center space-x-1 hover:opacity-80 flex-shrink-0"
            >
              <span>View Tracking Run</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Row 1: Visibility Score & 4 Core KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Composite Score Card */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                AI Visibility Score
              </span>
              <Badge variant="brand">Weighted 0-100</Badge>
            </div>

            <div className="mt-4 flex items-baseline space-x-3">
              <span className="text-5xl font-black text-slate-900 tracking-tight">
                {score.score}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  score.score >= 60
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : score.score >= 30
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {score.score >= 70 ? 'High Impact' : score.score >= 40 ? 'Moderate' : 'Emerging'}
              </span>
            </div>

            {/* Formula Breakdown Progress Bars */}
            <div className="mt-6 space-y-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Weight Allocation:
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Mention Rate (45% max)</span>
                  <span className="font-bold text-slate-900">{score.omrComponent} pts</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(score.omrComponent / 45) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Share of Voice (25% max)</span>
                  <span className="font-bold text-slate-900">{score.ssovComponent} pts</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(score.ssovComponent / 25) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Citation Rate (15% max)</span>
                  <span className="font-bold text-slate-900">{score.citationComponent} pts</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(score.citationComponent / 15) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Positive Sentiment (15% max)</span>
                  <span className="font-bold text-slate-900">{score.sentimentComponent} pts</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(score.sentimentComponent / 15) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3.5 border-t border-slate-100 text-[11px] text-slate-400">
            Computed across {kpis.totalCompletedRuns} verified queries in the last {days} days.
          </div>
        </div>

        {/* 4 Core KPIs: 8 cols */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Observed Mention Rate
              </span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-4xl font-extrabold text-slate-900">{kpis.observedMentionRate}%</div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Appeared in <strong className="font-semibold text-slate-800">{kpis.totalMentions}</strong> of{' '}
                <strong className="font-semibold text-slate-800">{kpis.totalCompletedRuns}</strong> completed search evaluations.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-blue-600">Primary Brand Discovery</span>
              <span className="text-slate-400">Target &gt; 50%</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Sample Share of Voice
              </span>
              <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-4xl font-extrabold text-slate-900">{kpis.sampleShareOfVoice}%</div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Portion of total brand and competitor mentions observed across answers.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-indigo-600">Competitive Presence</span>
              <Link href="/competitors/compare" className="text-slate-400 hover:text-slate-700">
                Compare &rarr;
              </Link>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Citation Rate
              </span>
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Link2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-4xl font-extrabold text-slate-900">{kpis.citationRate}%</div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                <strong className="font-semibold text-slate-800">{kpis.totalCitations}</strong> verified authority source links captured.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-purple-600">Domain Grounding</span>
              <Link href="/citations" className="text-slate-400 hover:text-slate-700">
                View Sources &rarr;
              </Link>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Average Position
              </span>
              <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-4xl font-extrabold text-slate-900">
                {kpis.averagePosition !== null ? `#${kpis.averagePosition}` : '—'}
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Mean placement order when brand is cited or listed in multi-item responses.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-amber-600">Prominence Rank</span>
              <span className="text-slate-400">Position 1-3 Optimal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Trend Chart & Sentiment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Trend Area Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Visibility Score Trajectory</h2>
              <p className="text-xs text-slate-500">Historical performance trend over selected {days}-day window</p>
            </div>
            <Badge variant="blue">Daily Resolution</Badge>
          </div>

          <div className="h-72 w-full pt-2">
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
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#172033',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visibilityScore"
                    name="Visibility Score"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#scoreGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="mentionRate"
                    name="Mention Rate (%)"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={0}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No historical trend samples recorded yet. Run tracking runs to populate trajectory.
              </div>
            )}
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900">Sentiment Distribution</h2>
              <span className="text-xs font-semibold text-slate-400">Contextual Tone</span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Evaluation tone detected across observed brand mentions.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="text-emerald-700">Positive Mentions</span>
                  <span className="font-bold">{sentiment.positive}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${sentiment.positive}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="text-slate-600">Neutral Mentions</span>
                  <span className="font-bold">{sentiment.neutral}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-400 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${sentiment.neutral}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="text-rose-700">Negative Mentions</span>
                  <span className="font-bold">{sentiment.negative}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${sentiment.negative}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="text-amber-700">Mixed Mentions</span>
                  <span className="font-bold">{sentiment.mixed}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${sentiment.mixed}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link href="/prompts" className="text-blue-600 font-bold hover:underline">
              Inspect Prompts &rarr;
            </Link>
            <Link href="/recommendations" className="text-slate-500 font-semibold hover:underline">
              View Strategies &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3: Recent AI Verbatim Responses Feed */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent AI Responses &amp; Verbatim Evidence</h2>
            <p className="text-xs text-slate-500">Live search queries with grounded brand mentions and citations</p>
          </div>
          <Link href="/runs">
            <Button variant="secondary" size="sm">
              <span>View All Runs</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {overview?.recentRuns && overview.recentRuns.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {overview.recentRuns.map((run: any) => {
              const resp = run.aiResponse;
              return (
                <div key={run.id} className="py-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      &ldquo;{run.prompt?.promptText}&rdquo;
                    </span>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">
                        {run.prompt?.category || 'General'}
                      </span>
                      <span>•</span>
                      <span>{new Date(run.executedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {resp?.rawText ? (
                    <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed font-normal">
                      &ldquo;{resp.rawText}&rdquo;
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No response text captured for this query execution.</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Mentions:
                    </span>
                    {resp?.mentions && resp.mentions.length > 0 ? (
                      resp.mentions.map((m: any) => (
                        <span
                          key={m.id}
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
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
                      <span className="text-xs text-slate-400">No brand references identified.</span>
                    )}

                    {resp?.citations && resp.citations.length > 0 && (
                      <span className="ml-auto text-purple-700 font-semibold flex items-center space-x-1 text-xs">
                        <Link2 className="h-3.5 w-3.5" />
                        <span>{resp.citations.length} Citation(s)</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title="No search evaluations recorded"
            description="Run your first tracking run to begin evaluating prompt queries against Google Gemini."
            actionLabel="Start Tracking Run"
            onAction={handleTriggerRun}
          />
        )}
      </div>
    </div>
  );
}

function Globe2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}
