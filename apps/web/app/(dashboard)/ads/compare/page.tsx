'use client';

// Visnora — Side-by-Side Ad Comparison Screen
// Strictly LIGHT MODE ONLY

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Columns,
  Sparkles,
  Layers,
  ArrowRight,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ComparisonData {
  title: string;
  ads: Array<{
    id: string;
    advertiserName: string;
    headline?: string;
    primaryText?: string;
    platform: string;
    format: string;
    ctaText?: string;
    landingPageUrl?: string;
    analysis?: {
      positioning?: string;
      valueProposition?: string;
      emotionalVsRational?: string;
      audienceSignals?: string[];
      offerStrategy?: string;
      ctaStrategy?: string;
      messagingAngle?: string;
    };
  }>;
  aiSummary?: string;
  commonThemes: string[];
  differingThemes: string[];
}

export default function AdComparisonPage() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids');

  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchComparison();
  }, [idsParam]);

  async function fetchComparison() {
    setIsLoading(true);
    try {
      const adIds = idsParam ? idsParam.split(',').filter(Boolean) : ['demo_swiggy_1', 'demo_eatsure_1'];

      const res = await fetch('/api/v1/ads/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adIds,
          organizationId: '293e8995-0113-480e-a062-26008ee8af21',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setComparison(json.data);
      }
    } catch (err) {
      console.error('Error fetching comparison:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Columns className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Side-by-Side Ad Comparison
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Contrast creative messaging hooks, customer value propositions, and action prompts across rival campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/ads/library">
            <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50">
              <Layers className="h-4 w-4 mr-1.5 text-slate-500" />
              Pick Ads from Library
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Synthesizing side-by-side strategic comparison...</p>
        </div>
      ) : !comparison ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
          <p className="text-xs text-slate-500">Please select at least 2 advertisements to compare.</p>
          <Link href="/ads/library" className="mt-4 inline-block">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              Open Ad Library
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Comparative Synthesis Card */}
          <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-blue-700">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-sm font-bold">Synthesized AI Strategic Contrast</h2>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              {comparison.aiSummary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-900 block flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mr-1.5" />
                  Common Themes & Overlaps
                </span>
                <ul className="text-xs text-slate-600 space-y-1">
                  {comparison.commonThemes.map((theme, i) => (
                    <li key={i}>• {theme}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-900 block flex items-center">
                  <AlertCircle className="h-4 w-4 text-blue-600 mr-1.5" />
                  Strategic Angles & Divergences
                </span>
                <ul className="text-xs text-slate-600 space-y-1">
                  {comparison.differingThemes.map((diff, i) => (
                    <li key={i}>• {diff}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparison.ads.map((ad, index) => (
              <div
                key={ad.id || index}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {/* Column Header */}
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {ad.advertiserName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {ad.platform} • {ad.format}
                      </span>
                    </div>

                    <Link
                      href={`/ads/${ad.id}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> View Ad
                    </Link>
                  </div>

                  {/* Headline & Copy */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Headline
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 leading-snug">
                      {ad.headline || 'Promotional Campaign'}
                    </h3>

                    {ad.primaryText && (
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {ad.primaryText}
                      </p>
                    )}
                  </div>

                  {/* Call-to-action */}
                  {ad.ctaText && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Call to Action
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold inline-block">
                        {ad.ctaText}
                      </span>
                    </div>
                  )}

                  {/* Positioning Angle */}
                  {ad.analysis?.positioning && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Positioning Hook
                      </span>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {ad.analysis.positioning}
                      </p>
                    </div>
                  )}

                  {/* Offer Strategy */}
                  {ad.analysis?.offerStrategy && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Offer & Incentive
                      </span>
                      <p className="text-xs text-slate-700">{ad.analysis.offerStrategy}</p>
                    </div>
                  )}

                  {/* Audience Signals */}
                  {ad.analysis?.audienceSignals && ad.analysis.audienceSignals.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Target Audience Signals
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {ad.analysis.audienceSignals.map((signal, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                          >
                            {signal}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Landing Page link */}
                {ad.landingPageUrl && (
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs">
                    <a
                      href={ad.landingPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center truncate"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                      <span className="truncate">{ad.landingPageUrl}</span>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

