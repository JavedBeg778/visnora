'use client';

// Visnora — Ad Discovery & Safe Manual Submission Hub
// Strictly LIGHT MODE ONLY

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Search,
  Link2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  Loader2,
  Globe2,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdDiscoveryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'search' | 'url'>('search');

  // Search discovery state
  const [sourceType, setSourceType] = useState('META_AD_LIBRARY');
  const [searchQuery, setSearchQuery] = useState('Swiggy');
  const [country, setCountry] = useState('IN');
  const [limit, setLimit] = useState(10);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual URL state
  const [manualUrl, setManualUrl] = useState('');
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);
  const [manualResult, setManualResult] = useState<any>(null);

  async function handleStartCollection(e: React.FormEvent) {
    e.preventDefault();
    setIsDiscovering(true);
    setError(null);
    setDiscoveryResult(null);

    try {
      const res = await fetch('/api/v1/ads/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          query: searchQuery,
          country,
          limit,
          autoAnalyze,
          projectId: '56fef028-6276-4dd0-ad56-02ff450dc931',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Ad collection failed');
      }

      setDiscoveryResult(json.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to complete ad collection run');
    } finally {
      setIsDiscovering(false);
    }
  }

  async function handleManualUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualUrl) return;

    setIsSubmittingUrl(true);
    setError(null);
    setManualResult(null);

    try {
      const res = await fetch('/api/v1/ads/submit-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: manualUrl,
          projectId: '56fef028-6276-4dd0-ad56-02ff450dc931',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Manual URL submission failed');
      }

      setManualResult(json.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to ingest advertisement URL');
    } finally {
      setIsSubmittingUrl(false);
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Compass className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Ad Discovery & Ingestion Hub
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Discover active competitor campaigns through official public transparency archives or safely submit individual ad URLs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/ads/library">
            <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50">
              <Layers className="h-4 w-4 mr-1.5 text-slate-500" />
              Ad Library
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'search'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Transparency Archive Discovery</span>
        </button>

        <button
          onClick={() => setActiveTab('url')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'url'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Link2 className="h-4 w-4" />
          <span>Manual Ad URL Submission</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab 1: Transparency Archive Search */}
      {activeTab === 'search' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <form onSubmit={handleStartCollection} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Source Transparency Archive
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  >
                    <option value="META_AD_LIBRARY">Meta Ad Library (Facebook & Instagram)</option>
                    <option value="GOOGLE_ADS_TRANSPARENCY">Google Ads Transparency Center</option>
                    <option value="TIKTOK_CREATIVE_CENTER">TikTok Creative Center</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Region / Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  >
                    <option value="IN">India (IN)</option>
                    <option value="US">United States (US)</option>
                    <option value="GB">United Kingdom (UK)</option>
                    <option value="ALL">All Regions (Global)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Competitor Brand Name or Search Query
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Swiggy, EatSure, Magicpin, food delivery"
                    className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="text-[11px] text-slate-400">Quick suggestions:</span>
                  {['Swiggy', 'EatSure', 'Magicpin'].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setSearchQuery(s)}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Batch Ingestion Limit: <span className="text-blue-600">{limit} ads</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    step="5"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <input
                    type="checkbox"
                    id="autoAnalyze"
                    checked={autoAnalyze}
                    onChange={(e) => setAutoAnalyze(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="autoAnalyze" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Auto-analyze 12 AI dimensions on ingestion
                  </label>
                </div>
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={isDiscovering}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-xs"
                >
                  {isDiscovering ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Discovering & Ingesting Campaigns...
                    </>
                  ) : (
                    <>
                      <Compass className="h-4 w-4 mr-2" />
                      Start Collection Pipeline
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Results card */}
            {discoveryResult && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3 animate-in fade-in">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-sm font-bold">Collection Run Completed</h3>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs bg-white/70 p-3 rounded-xl border border-emerald-100">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Discovered</span>
                    <span className="text-lg font-bold text-slate-900">{discoveryResult.totalFound}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Ingested & Stored</span>
                    <span className="text-lg font-bold text-emerald-600">{discoveryResult.totalIngested}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">New Ads</span>
                    <span className="text-lg font-bold text-blue-600">{discoveryResult.newAdsCount || 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-600">
                    Creatives normalized and available in your library.
                  </span>
                  <Link href="/ads/library">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                      Explore In Ad Library <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Platform info card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Access Rules & Policy</h2>
            </div>

            <ul className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <li className="flex items-start space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                <span>
                  <strong>Official transparency queries:</strong> Queries are executed through documented public transparency endpoints without bypassing authorization gates.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                <span>
                  <strong>Deterministic deduplication:</strong> SHA-256 canonical hashing prevents duplicate ad records across multiple runs.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                <span>
                  <strong>Strict non-fabrication:</strong> We never synthesize false impression counts or confidential advertiser spend data.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: Safe Manual URL Submission */}
      {activeTab === 'url' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Direct Ad URL Ingestion</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter any public competitor landing page or ad URL. Visnora will validate the URL against SSRF threats, parse meta cards, and extract creative elements.
              </p>
            </div>

            <form onSubmit={handleManualUrlSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Public Advertisement or Landing Page URL
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="url"
                    required
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="https://www.competitor.com/landing-page-or-ad"
                    className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="text-[11px] text-slate-400">Sample test URL:</span>
                  <button
                    type="button"
                    onClick={() => setManualUrl('https://www.swiggy.com/restaurants')}
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    https://www.swiggy.com/restaurants
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmittingUrl}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-xs"
                >
                  {isSubmittingUrl ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Validating & Ingesting URL...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Ingest & Analyze URL
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Manual submission result */}
            {manualResult && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-bold">URL Verified & Ingested</span>
                  </div>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                    {manualResult.extracted?.contentHash?.slice(0, 16)}...
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    {manualResult.extracted?.headline || 'Captured Campaign'}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {manualResult.extracted?.primaryText || 'Metadata extracted from destination page.'}
                  </p>

                  <div className="flex items-center gap-2 pt-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                      CTA: {manualResult.extracted?.ctaText}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      Format: {manualResult.extracted?.format}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Link href={`/ads/${manualResult.ad?.id || 'demo_ad_1'}`}>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                      Inspect 12-Dimension AI Analysis <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Anti-SSRF Security Guarantee */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Anti-SSRF Protection</h2>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Every manual submission is filtered through Visnora&apos;s cryptographic URL validation firewall before network dispatch:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-emerald-800">
                ✓ <strong>Loopback addresses blocked:</strong> 127.0.0.1, localhost
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-emerald-800">
                ✓ <strong>Private RFC 1918 subnets blocked:</strong> 10.x, 172.16.x, 192.168.x
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-emerald-800">
                ✓ <strong>Cloud metadata IP blocked:</strong> 169.254.169.254
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-emerald-800">
                ✓ <strong>Protocol restriction:</strong> Only public HTTPS/HTTP permitted
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

