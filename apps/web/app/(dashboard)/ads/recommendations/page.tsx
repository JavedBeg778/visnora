'use client';

// Visnora — Evidence-Backed AI Ad Recommendations Board
// Strictly LIGHT MODE ONLY

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lightbulb,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  ThumbsUp,
  XCircle,
  Loader2,
  Filter,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Recommendation {
  id: string;
  category: string;
  title: string;
  explanation: string;
  evidenceSummary: string;
  expectedBenefit: string;
  confidence: string;
  suggestedAction: string;
  status: 'NEW' | 'REVIEWED' | 'APPLIED' | 'DISMISSED';
  createdAt: string;
}

export default function AdRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    fetchRecommendations();
  }, [selectedCategory]);

  async function fetchRecommendations() {
    setIsLoading(true);
    try {
      const url = selectedCategory === 'ALL'
        ? '/api/v1/ads/recommendations'
        : `/api/v1/ads/recommendations?category=${selectedCategory}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setRecommendations(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateFresh() {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/v1/ads/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: '56fef028-6276-4dd0-ad56-02ff450dc931',
          brandName: 'Zomato',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setRecommendations(json.data || []);
      }
    } catch (err) {
      console.error('Error generating recommendations:', err);
    } finally {
      setIsGenerating(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    // Optimistic UI update
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: status as any } : r))
    );

    try {
      await fetch(`/api/v1/ads/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  const categories = [
    'ALL',
    'CTA',
    'OFFER',
    'POSITIONING',
    'CREATIVE',
    'LANDING_PAGE',
    'MESSAGING',
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Lightbulb className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              AI Ad Strategy Recommendations
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data-backed advertising suggestions synthesized from competitor creative messaging and landing page tactics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={handleGenerateFresh}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Synthesizing Plays...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Regenerate Recommendations
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat === 'ALL' ? 'All Plays' : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Recommendations List */}
      {isLoading ? (
        <div className="p-16 text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-slate-500">Retrieving actionable recommendations...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
          <p className="text-xs text-slate-500">No recommendations found in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 transition-all hover:border-slate-300"
            >
              {/* Card Header: Category, Title, Confidence */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                    {rec.category}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{rec.title}</h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rec.confidence === 'HIGH'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {rec.confidence} CONFIDENCE
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      rec.status === 'APPLIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rec.status === 'REVIEWED'
                        ? 'bg-blue-100 text-blue-800'
                        : rec.status === 'DISMISSED'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {rec.status}
                  </span>
                </div>
              </div>

              {/* Strategic Explanation */}
              <p className="text-xs text-slate-700 leading-relaxed">
                {rec.explanation}
              </p>

              {/* Evidence & Expected Benefit Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 text-[11px] block">
                    Observed Market Evidence:
                  </span>
                  <p className="text-slate-600 leading-relaxed">{rec.evidenceSummary}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                  <span className="font-bold text-emerald-900 text-[11px] block flex items-center">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                    Expected Benefit:
                  </span>
                  <p className="text-emerald-800 leading-relaxed">{rec.expectedBenefit}</p>
                </div>
              </div>

              {/* Concrete Suggested Action */}
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-start space-x-2">
                <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-blue-800 block text-[11px]">Recommended Play:</span>
                  <p className="mt-0.5 font-medium">{rec.suggestedAction}</p>
                </div>
              </div>

              {/* Status Switcher Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                <span className="text-[11px] text-slate-400">
                  Synthesized from active competitor intelligence
                </span>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => updateStatus(rec.id, 'APPLIED')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors ${
                      rec.status === 'APPLIED'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Apply</span>
                  </button>

                  <button
                    onClick={() => updateStatus(rec.id, 'REVIEWED')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors ${
                      rec.status === 'REVIEWED'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Review</span>
                  </button>

                  <button
                    onClick={() => updateStatus(rec.id, 'DISMISSED')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors ${
                      rec.status === 'DISMISSED'
                        ? 'bg-slate-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                    }`}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

