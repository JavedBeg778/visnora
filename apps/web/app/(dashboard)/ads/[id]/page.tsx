'use client';

// Visnora — Ad Details & 12-Dimension AI Analysis Screen
// Strictly LIGHT MODE ONLY

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Layers,
  Copy,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Zap,
  Target,
  FileText,
  Video,
  Image as ImageIcon,
  Loader2,
  Coins,
  BrainCircuit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const adId = resolvedParams.id;
  const router = useRouter();

  const [ad, setAd] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    fetchAdDetails();
  }, [adId]);

  async function fetchAdDetails() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/ads/${adId}`);
      if (res.ok) {
        const json = await res.json();
        setAd(json.data);
      }
    } catch (err) {
      console.error('Error fetching ad details:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTriggerAnalysis() {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/v1/ads/${adId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiserName: ad?.advertiserName,
          headline: ad?.headline,
          primaryText: ad?.primaryText,
          ctaText: ad?.ctaText,
          format: ad?.format,
          landingPageUrl: ad?.landingPageUrl,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setAd((prev: any) => ({
          ...prev,
          analyses: [json.data, ...(prev?.analyses || [])],
        }));
      }
    } catch (err) {
      console.error('Error triggering AI analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading advertisement & creative intelligence...</p>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Advertisement Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">The requested ad record does not exist or has been removed.</p>
        <Link href="/ads/library" className="mt-4 inline-block">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            Return to Library
          </Button>
        </Link>
      </div>
    );
  }

  const analysis = ad.analyses?.[0];

  return (
    <div className="space-y-6 pb-20">
      {/* Header with back nav */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1.5">
          <Link
            href="/ads/library"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Ad Library
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {ad.headline || `${ad.advertiserName} Campaign`}
            </h1>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                ad.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {ad.status || 'ACTIVE'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
            <span className="font-semibold text-slate-900">{ad.advertiserName}</span>
            <span>•</span>
            <span>{ad.platform}</span>
            <span>•</span>
            <span className="flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
              First seen: {ad.firstSeenAt ? new Date(ad.firstSeenAt).toLocaleDateString() : 'Recent'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={handleTriggerAnalysis}
            disabled={isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Analyzing 12 Dimensions...
              </>
            ) : (
              <>
                <BrainCircuit className="h-3.5 w-3.5 mr-1.5" />
                Re-Analyze with Gemini AI
              </>
            )}
          </Button>

          {ad.originalUrl && (
            <a
              href={ad.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Open source ad in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {/* Main Grid: Creative Left, 12-Dimension AI Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Creative Elements & Destination */}
        <div className="space-y-6">
          {/* Creative Preview Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 flex items-center">
                {ad.format === 'VIDEO' ? (
                  <Video className="h-4 w-4 mr-1.5 text-blue-600" />
                ) : ad.format === 'CAROUSEL' ? (
                  <Layers className="h-4 w-4 mr-1.5 text-purple-600" />
                ) : ad.format === 'TEXT' ? (
                  <FileText className="h-4 w-4 mr-1.5 text-amber-600" />
                ) : (
                  <ImageIcon className="h-4 w-4 mr-1.5 text-emerald-600" />
                )}
                Creative Format: {ad.format}
              </span>
              {ad.ctaText && (
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                  CTA: {ad.ctaText}
                </span>
              )}
            </div>

            {/* Creative Body */}
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Primary Ad Copy
                </span>
                <p className="text-xs text-slate-700 leading-relaxed mt-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  {ad.primaryText || 'No primary copy recorded.'}
                </p>
              </div>

              {ad.description && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Link Description
                  </span>
                  <p className="text-xs text-slate-600 mt-1">{ad.description}</p>
                </div>
              )}
            </div>

            {/* Destination Landing Page */}
            {ad.landingPageUrl && (
              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Destination Landing Page
                </span>
                <a
                  href={ad.landingPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center break-all"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                  {ad.landingPageUrl}
                </a>
              </div>
            )}

            {/* Content Hash Guard */}
            <div className="pt-3 border-t border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Canonical Content Hash (SHA-256)
              </span>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-mono text-[10px] text-slate-600 truncate max-w-[200px]">
                  {ad.contentHash}
                </span>
                <button
                  onClick={() => copyToClipboard(ad.contentHash)}
                  className="text-slate-400 hover:text-slate-700 text-xs"
                >
                  {copiedHash ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: 12-Dimension AI Intelligence Board */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center">
                  <Sparkles className="h-4 w-4 mr-1.5 text-blue-600" />
                  12-Dimension AI Strategic Creative Analysis
                </h2>
                <p className="text-xs text-slate-500">
                  Synthesized using Gemini AI across positioning, psychology, friction, and incentives.
                </p>
              </div>

              {analysis && (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold">
                    Confidence: {Math.round((analysis.confidenceScore || 0.9) * 100)}%
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {analysis.model || 'gemini-3.8-flash'}
                  </span>
                </div>
              )}
            </div>

            {analysis ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Main Message */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    1. Main Core Message
                  </span>
                  <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                    {analysis.mainMessage}
                  </p>
                </div>

                {/* 2. Value Proposition */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    2. Value Proposition
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {analysis.valueProposition}
                  </p>
                </div>

                {/* 3. Pain Points */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    3. Pain Points Addressed
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.painPoints?.map((p: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-medium"
                      >
                        • {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 4. Audience Signals */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    4. Audience Signals
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.audienceSignals?.map((a: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-blue-700 text-[11px] font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 5. Emotional vs Rational Stance */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    5. Emotional vs. Rational Balance
                  </span>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        analysis.emotionalVsRational === 'EMOTIONAL'
                          ? 'bg-rose-50 text-rose-700'
                          : analysis.emotionalVsRational === 'RATIONAL'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {analysis.emotionalVsRational}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {analysis.emotionalVsRational === 'EMOTIONAL'
                        ? 'Sensory craving & lifestyle hook'
                        : analysis.emotionalVsRational === 'RATIONAL'
                        ? 'Direct economic saving & speed calculation'
                        : 'Balanced convenience & financial reward'}
                    </span>
                  </div>
                </div>

                {/* 6. Market Positioning Angle */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    6. Market Positioning Stance
                  </span>
                  <p className="text-xs text-slate-800 font-medium">
                    {analysis.positioning}
                  </p>
                </div>

                {/* 7. Promotional Strategy */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    7. Promotional Strategy
                  </span>
                  <p className="text-xs text-slate-800">
                    {analysis.promotionalStrategy}
                  </p>
                </div>

                {/* 8. Offer Strategy */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    8. Offer Details & Incentives
                  </span>
                  <p className="text-xs text-slate-800">
                    {analysis.offerStrategy}
                  </p>
                </div>

                {/* 9. CTA Strategy */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    9. Call-To-Action Friction
                  </span>
                  <p className="text-xs text-slate-800">
                    {analysis.ctaStrategy}
                  </p>
                </div>

                {/* 10. Creative Execution */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    10. Creative Execution & Format
                  </span>
                  <p className="text-xs text-slate-800">
                    {analysis.creativeFormat}
                  </p>
                </div>

                {/* 11. Messaging Angle */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    11. Creative Angle & Hooks
                  </span>
                  <p className="text-xs text-slate-800">
                    {analysis.messagingAngle}
                  </p>
                </div>

                {/* 12. Landing Page Alignment */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    12. Landing Page Alignment
                  </span>
                  <p className="text-xs text-slate-800">
                    {analysis.landingPageRelevance || 'Standard funnel alignment.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <Sparkles className="h-8 w-8 text-blue-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900">Analysis Not Yet Generated</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click below to trigger deep 12-dimension AI analysis evaluating positioning, offer psychology, audience triggers, and messaging angles.
                </p>
                <Button
                  onClick={handleTriggerAnalysis}
                  disabled={isAnalyzing}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Generate 12-Dimension Analysis
                </Button>
              </div>
            )}

            {/* Token & Cost Accounting Strip */}
            {analysis && (
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center text-slate-700 font-semibold">
                    <Coins className="h-3.5 w-3.5 mr-1 text-amber-500" />
                    Cost: {analysis.estimatedCostPaise || 2} Paise
                  </span>
                  <span>•</span>
                  <span>Tokens: {analysis.promptTokens || 350} in / {analysis.completionTokens || 220} out</span>
                </div>

                <span className="text-slate-400">
                  Analysis completed: {analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString() : 'Just now'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

