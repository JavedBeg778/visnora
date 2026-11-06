'use client';

import React, { useState } from 'react';
import {
  Link2,
  ExternalLink,
  Globe,
  TrendingUp,
  Search,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface CitationsClientProps {
  initialCitations: any;
  projects: any[];
  currentProjectId: string;
  organizationId: string;
}

export function CitationsClient({
  initialCitations,
  projects,
  currentProjectId: initialProjectId,
  organizationId,
}: CitationsClientProps) {
  const [data, setData] = useState(initialCitations);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshCitations = async (projId: string, dayRange: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/analytics/citations?projectId=${projId}&days=${dayRange}`,
        { headers: { 'x-organization-id': organizationId } }
      );
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      // Keep existing
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedProjectId(newId);
    refreshCitations(newId, days);
  };

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
    refreshCitations(selectedProjectId, newDays);
  };

  const topDomains = data?.topDomains || [];
  const recentCitations = (data?.recentCitations || []).filter((c: any) =>
    searchQuery
      ? c.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.url.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <label htmlFor="project-select" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Project:
          </label>
          <select
            id="project-select"
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Verified Citations
          </span>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            {data?.totalCitations || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            External reference links returned in AI search answers.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Unique Domains Cited
          </span>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            {data?.uniqueDomains || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Distinct authority websites providing source grounding.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Top Cited Authority
          </span>
          <div className="text-xl font-bold text-blue-600 mt-2 truncate">
            {topDomains[0]?.domain || '—'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {topDomains[0]
              ? `${topDomains[0].count} citations (${topDomains[0].percentage}%)`
              : 'No citations captured yet'}
          </p>
        </div>
      </div>

      {/* Row 2: Top Cited Domains Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Top Cited Domains & Authority Sources</h2>
        <p className="text-xs text-slate-500 mb-4">
          The domains AI search models cite most frequently when discussing your industry and brand queries.
        </p>

        <div className="space-y-3">
          {topDomains.map((d: any) => (
            <div key={d.domain} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <span>{d.domain}</span>
                </span>
                <span className="text-slate-500 font-mono">
                  {d.count} citation(s) ({d.percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, d.percentage)}%` }}
                />
              </div>
            </div>
          ))}

          {topDomains.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400">
              No citations captured yet. Citations are collected during grounded tracking runs.
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Recent Citations List with Context */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Citation Feed</h2>
            <p className="text-xs text-slate-500">Every external source link verified in recent prompt evaluations</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search domain or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {recentCitations.map((c: any) => (
            <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900">{c.domain}</span>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center space-x-1 font-medium truncate max-w-md"
                  >
                    <span className="truncate">{c.url}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                </div>
                {c.promptText && (
                  <p className="text-[11px] text-slate-500 italic truncate">
                    Triggered by: &ldquo;{c.promptText}&rdquo;
                  </p>
                )}
              </div>

              <div className="text-[10px] text-slate-400 whitespace-nowrap self-start sm:self-auto">
                {new Date(c.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}

          {recentCitations.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              No recent citations match your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

