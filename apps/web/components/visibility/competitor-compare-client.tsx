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

  // Chart data preparing side-by-side comparison
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Link href="/competitors">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span>Back to Competitors</span>
            </Button>
          </Link>
          <select
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
          <button
            onClick={() => handleDaysChange(7)}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              days === 7 ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600'
            }`}
          >
            7D
          </button>
          <button
            onClick={() => handleDaysChange(30)}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              days === 30 ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600'
            }`}
          >
            30D
          </button>
          <button
            onClick={() => handleDaysChange(90)}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              days === 90 ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600'
            }`}
          >
            90D
          </button>
        </div>
      </div>

      {/* Comparison Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Brand vs Competitors Share of Voice & Mention Rate</h2>
            <p className="text-xs text-slate-500">Relative presence in AI-generated answers over the past {days} days</p>
          </div>
          <Badge variant="blue" className="text-[10px]">
            Comparative Metrics
          </Badge>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#172033',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="mentionRate" name="Mention Rate (%)" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="shareOfVoice" name="Share of Voice (%)" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side-by-Side Detailed Metric Cards Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Entity Performance Breakdown
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 font-semibold">Entity</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold text-right">Mention Rate</th>
                <th className="px-4 py-3 font-semibold text-right">Share of Voice</th>
                <th className="px-4 py-3 font-semibold text-right">Mentions</th>
                <th className="px-4 py-3 font-semibold text-right">Avg Position</th>
                <th className="px-4 py-3 font-semibold text-right">Recommendations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Primary Brand Row */}
              <tr className="bg-blue-50/40 font-semibold text-slate-900">
                <td className="px-4 py-3.5 flex items-center space-x-2">
                  <div className="h-6 w-6 rounded bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                    ★
                  </div>
                  <span>{primaryBrand.name}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Primary Brand
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right font-bold text-blue-700">
                  {primaryBrand.observedMentionRate}%
                </td>
                <td className="px-4 py-3.5 text-right font-bold text-indigo-700">
                  {primaryBrand.sampleShareOfVoice}%
                </td>
                <td className="px-4 py-3.5 text-right">{primaryBrand.mentionCount}</td>
                <td className="px-4 py-3.5 text-right">
                  {primaryBrand.averagePosition ? `#${primaryBrand.averagePosition}` : '—'}
                </td>
                <td className="px-4 py-3.5 text-right">
                  {primaryBrand.recommendationCount || 0}
                </td>
              </tr>

              {/* Competitor Rows */}
              {competitorsList.map((comp: any) => (
                <tr key={comp.id} className="text-slate-700 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-medium flex items-center space-x-2">
                    <div className="h-6 w-6 rounded bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                      {comp.name.charAt(0)}
                    </div>
                    <span>{comp.name}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      Competitor
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold">{comp.mentionRate}%</td>
                  <td className="px-4 py-3.5 text-right font-semibold">{comp.shareOfVoice}%</td>
                  <td className="px-4 py-3.5 text-right">{comp.mentionCount}</td>
                  <td className="px-4 py-3.5 text-right">
                    {comp.averagePosition ? `#${comp.averagePosition}` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right">{comp.recommendationCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

