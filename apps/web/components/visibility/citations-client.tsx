'use client';

import React, { useState } from 'react';
import {
  Link2,
  ExternalLink,
  Globe,
  TrendingUp,
  Search,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EmptyState } from '../ui/empty-state';

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
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <label htmlFor="project-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Project:
          </label>
          <select
            id="project-select"
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Total Verified Citations
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Link2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-slate-900 mt-3">
            {data?.totalCitations || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            External reference sources cited across evaluated answers.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Unique Authority Domains
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-slate-900 mt-3">
            {data?.uniqueDomains || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Distinct web domains providing source grounding context.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Top Cited Authority
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-blue-600 mt-3 truncate font-mono">
            {topDomains[0]?.domain || '—'}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {topDomains[0]
              ? `${topDomains[0].count} citations (${topDomains[0].percentage}%)`
              : 'No citations captured yet'}
          </p>
        </div>
      </div>

      {/* Row 2: Top Cited Domains Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card">
        <h2 className="text-base font-bold text-slate-900 mb-1">Top Cited Domains &amp; Authority Sources</h2>
        <p className="text-xs text-slate-500 mb-6">
          The domains that AI search engines reference most frequently when producing answers for your brand category.
        </p>

        <div className="space-y-4">
          {topDomains.map((d: any) => (
            <div key={d.domain} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span className="font-mono">{d.domain}</span>
                </span>
                <span className="text-slate-600 font-bold font-mono">
                  {d.count} citation(s) ({d.percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, d.percentage)}%` }}
                />
              </div>
            </div>
          ))}

          {topDomains.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No citations captured yet. Citations are collected automatically during grounded tracking runs.
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Recent Citations List with Context */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Citations Feed</h2>
            <p className="text-xs text-slate-500">Every external reference link captured in prompt evaluations</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by domain or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-subtle"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {recentCitations.map((c: any) => (
            <div key={c.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xs font-bold text-slate-900 font-mono">{c.domain}</span>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center space-x-1 font-semibold truncate max-w-md"
                  >
                    <span className="truncate">{c.url}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                </div>
                {c.promptText && (
                  <p className="text-xs text-slate-500 italic truncate">
                    Triggered by query: &ldquo;{c.promptText}&rdquo;
                  </p>
                )}
              </div>

              <div className="text-[11px] text-slate-400 whitespace-nowrap self-start sm:self-auto font-mono">
                {new Date(c.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}

          {recentCitations.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400">
              No citations found matching your filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
