'use client';

import React, { useState } from 'react';
import {
  Lightbulb,
  CheckCircle2,
  Clock,
  Archive,
  ArrowRight,
  Filter,
  AlertCircle,
  Tag,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EmptyState } from '../ui/empty-state';

interface RecommendationsClientProps {
  initialRecommendations: any[];
  projects: any[];
  currentProjectId: string;
  organizationId: string;
}

export function RecommendationsClient({
  initialRecommendations,
  projects,
  currentProjectId: initialProjectId,
  organizationId,
}: RecommendationsClientProps) {
  const [recommendations, setRecommendations] = useState<any[]>(initialRecommendations);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const refreshRecommendations = async (projId: string) => {
    try {
      const res = await fetch(`/api/v1/recommendations?projectId=${projId}`, {
        headers: { 'x-organization-id': organizationId },
      });
      const json = await res.json();
      if (json.success) setRecommendations(json.data);
    } catch {
      // Keep existing
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedProjectId(newId);
    refreshRecommendations(newId);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/recommendations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
        );
      }
    } catch {
      // Ignore
    }
  };

  const filtered = recommendations.filter((r) =>
    statusFilter === 'ALL' ? true : r.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
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

        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold self-end sm:self-auto">
          {['ALL', 'NEW', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === st
                  ? 'bg-white text-blue-700 shadow-subtle font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL' ? 'All' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations Cards List */}
      <div className="space-y-5">
        {filtered.map((rec) => {
          const isHigh = rec.priority === 'HIGH';
          const isMedium = rec.priority === 'MEDIUM';

          return (
            <div
              key={rec.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all space-y-4"
            >
              {/* Header: Title, Priority, Status */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-start space-x-3.5">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-100 shadow-subtle">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{rec.title}</h2>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isHigh
                            ? 'bg-rose-100 text-rose-800'
                            : isMedium
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {rec.priority} Priority
                      </span>
                      {rec.relatedMetric && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          {rec.relatedMetric}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {rec.explanation}
                    </p>
                  </div>
                </div>

                {/* Status Switcher Dropdown */}
                <select
                  value={rec.status}
                  onChange={(e) => handleStatusUpdate(rec.id, e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-subtle self-start sm:self-auto"
                >
                  <option value="NEW">Status: New</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
              </div>

              {/* Evidence Quote */}
              {rec.evidence && (
                <div className="bg-slate-50 border-l-4 border-blue-500 p-3.5 rounded-r-xl text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900 block mb-1">Observed Search Output Evidence:</span>
                  <p className="italic">&ldquo;{rec.evidence}&rdquo;</p>
                </div>
              )}

              {/* Suggested Action */}
              <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-4 text-xs flex items-start space-x-3">
                <ArrowRight className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-950">Actionable GEO Strategy: </span>
                  <span className="text-blue-900 leading-relaxed">{rec.suggestedAction}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title="No recommendations found"
            description="Strategic visibility recommendations are generated automatically based on competitor gaps and citation discrepancies from tracking runs."
            actionLabel="View Dashboard"
            onAction={() => {}}
          />
        )}
      </div>
    </div>
  );
}
