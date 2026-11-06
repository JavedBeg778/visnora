'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Percent,
  Award,
  Users2,
  ArrowLeft,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EmptyState } from '../ui/empty-state';

interface CompetitorCompareClientProps {
  initialComparison: any;
  projects: any[];
  currentProjectId: string;
  organizationId: string;
}

export function CompetitorCompareClient({
  initialComparison,
  projects,
  currentProjectId: initialProjectId,
  organizationId,
}: CompetitorCompareClientProps) {
  const [comparison, setComparison] = useState(initialComparison);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const refreshComparison = async (projId: string, dayRange: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/analytics/competitors?projectId=${projId}&days=${dayRange}`,
        { headers: { 'x-organization-id': organizationId } }
      );
      const json = await res.json();
      if (json.success) setComparison(json.data);
    } catch {
      // Keep existing
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedProjectId(newId);
    refreshComparison(newId, days);
  };

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
    refreshComparison(selectedProjectId, newDays);
  };

  const primaryBrand = comparison?.primaryBrand || {
    name: 'Primary Brand',
    mentionCount: 0,
    observedMentionRate: 0,
    sampleShareOfVoice: 0,
    averagePosition: null,
  };

  const competitorsList = comparison?.competitors || [];

  // Prepare chart dataset
  const chartData = [
    {
      name: primaryBrand.name,
      mentionRate: primaryBrand.observedMentionRate,
      shareOfVoice: primaryBrand.sampleShareOfVoice,
      isPrimary: true,
    },
    ...competitorsList.map((c: any) => ({
      name: c.name,
      mentionRate: c.mentionRate,
      shareOfVoice: c.shareOfVoice,
      isPrimary: false,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Back and Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link href="/competitors">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Back to Competitors</span>
            </Button>
          </Link>
          <select
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-subtle"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold self-end sm:self-auto">
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
      </div>

      {/* Comparison Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Share of Voice &amp; Mention Rate Benchmark
            </h2>
            <p className="text-xs text-slate-500">
              Comparative representation in AI search results over the past {days} days
            </p>
          </div>
          <Badge variant="brand">Comparative Analytics</Badge>
        </div>

        <div className="h-80 w-full pt-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} unit="%" />
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
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                <Bar dataKey="mentionRate" name="Observed Mention Rate (%)" fill="#2563EB" radius={[6, 6, 0, 0]} />
                <Bar dataKey="shareOfVoice" name="Share of Voice (%)" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No comparison metrics recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Side-by-Side Detailed Metric Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        <div className="p-4 px-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Entity Performance Breakdown
          </h3>
          <span className="text-xs text-slate-500">
            Computed over {days} days
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3.5 font-bold">Entity</th>
                <th className="px-6 py-3.5 font-bold">Category</th>
                <th className="px-6 py-3.5 font-bold text-right">Mention Rate</th>
                <th className="px-6 py-3.5 font-bold text-right">Share of Voice</th>
                <th className="px-6 py-3.5 font-bold text-right">Total Mentions</th>
                <th className="px-6 py-3.5 font-bold text-right">Avg Position</th>
                <th className="px-6 py-3.5 font-bold text-right">Recommendations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Primary Brand Row */}
              <tr className="bg-blue-50/40 font-semibold text-slate-900">
                <td className="px-6 py-4 flex items-center space-x-2.5">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-subtle">
                    ★
                  </div>
                  <span className="font-bold">{primaryBrand.name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Primary Brand
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-extrabold text-blue-700 text-sm">
                  {primaryBrand.observedMentionRate}%
                </td>
                <td className="px-6 py-4 text-right font-extrabold text-indigo-700 text-sm">
                  {primaryBrand.sampleShareOfVoice}%
                </td>
                <td className="px-6 py-4 text-right font-mono">{primaryBrand.mentionCount}</td>
                <td className="px-6 py-4 text-right font-mono">
                  {primaryBrand.averagePosition ? `#${primaryBrand.averagePosition}` : '—'}
                </td>
                <td className="px-6 py-4 text-right font-mono">
                  {primaryBrand.recommendationCount || 0}
                </td>
              </tr>

              {/* Competitor Rows */}
              {competitorsList.map((comp: any) => (
                <tr key={comp.id} className="text-slate-700 hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-medium flex items-center space-x-2.5">
                    <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200">
                      {comp.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-900">{comp.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Competitor
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">{comp.mentionRate}%</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">{comp.shareOfVoice}%</td>
                  <td className="px-6 py-4 text-right font-mono">{comp.mentionCount}</td>
                  <td className="px-6 py-4 text-right font-mono">
                    {comp.averagePosition ? `#${comp.averagePosition}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-mono">{comp.recommendationCount || 0}</td>
                </tr>
              ))}

              {competitorsList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                    No competitors to compare yet. Add competitors in the Competitors tab to view comparative metrics.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
