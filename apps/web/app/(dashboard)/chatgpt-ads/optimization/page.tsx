'use client';

import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Sparkles,
  CheckCircle2,
  XCircle,
  Play,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Filter,
} from 'lucide-react';

export default function ChatGPTAdsOptimizationPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/chatgpt-ads/recommendations');
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.data || []);
      }
    } catch {
      setErrorMsg('Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/v1/chatgpt-ads/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Generated ${data.data.count} new AI optimization recommendations.`);
        fetchRecommendations();
      } else {
        setErrorMsg(data.error?.message || 'Failed to generate recommendations.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/chatgpt-ads/recommendations/${id}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Recommendation approved.');
        fetchRecommendations();
      }
    } catch {
      setErrorMsg('Failed to approve recommendation.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/chatgpt-ads/recommendations/${id}/reject`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Recommendation rejected.');
        fetchRecommendations();
      }
    } catch {
      setErrorMsg('Failed to reject recommendation.');
    }
  };

  const handleApply = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/chatgpt-ads/recommendations/${id}/apply`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Recommendation successfully executed and applied to campaign.');
        fetchRecommendations();
      } else {
        setErrorMsg(data.error?.message || 'Failed to apply recommendation.');
      }
    } catch {
      setErrorMsg('Failed to apply recommendation.');
    }
  };

  const filtered = recommendations.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">AI Optimization Engine</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
              12 Dimensions
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Automated recommendations across conversational intent, context hints, negative exclusions, and bidding.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
        >
          <Sparkles className={`h-4 w-4 mr-1.5 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Analyzing Campaigns...' : 'Run Optimization Analysis'}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center">
            <Filter className="h-3.5 w-3.5 mr-1" /> Status:
          </span>
          {['ALL', 'PENDING', 'APPROVED', 'APPLIED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-amber-100 text-amber-800 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing {filtered.length} of {recommendations.length} recommendations
        </span>
      </div>

      {/* Recommendations Feed */}
      <div className="space-y-4">
        {filtered.length === 0 && !loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            No recommendations match your current filters. Click <strong>Run Optimization Analysis</strong> to evaluate campaigns.
          </div>
        ) : (
          filtered.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 hover:border-amber-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {rec.category?.replace(/_/g, ' ') || 'OPTIMIZATION'}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{rec.title}</span>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                      rec.status === 'APPLIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rec.status === 'APPROVED'
                        ? 'bg-blue-100 text-blue-800'
                        : rec.status === 'REJECTED'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {rec.status}
                  </span>
                  <span className="text-slate-400">| Confidence: <strong>{rec.confidence}</strong></span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-700 leading-relaxed">{rec.explanation}</p>

                {rec.expectedDirection && (
                  <div className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 w-fit">
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                    <span>Projected Impact: {rec.expectedDirection}</span>
                  </div>
                )}
              </div>

              {rec.potentialRisks && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-700">Risk Assessment: </span>
                  {rec.potentialRisks}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="text-[11px] text-slate-400">
                  Target: {rec.campaign?.name || 'All Campaigns'}
                </div>

                <div className="flex items-center space-x-2">
                  {rec.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleReject(rec.id)}
                        className="px-3 py-1.5 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleApprove(rec.id)}
                        className="px-3 py-1.5 border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApply(rec.id)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white rounded-lg shadow-sm transition-colors"
                      >
                        Apply Now
                      </button>
                    </>
                  )}

                  {rec.status === 'APPROVED' && (
                    <button
                      onClick={() => handleApply(rec.id)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white rounded-lg shadow-sm transition-colors"
                    >
                      Apply Now
                    </button>
                  )}

                  {rec.status === 'APPLIED' && (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Applied on {rec.appliedAt ? new Date(rec.appliedAt).toLocaleDateString() : 'Today'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

