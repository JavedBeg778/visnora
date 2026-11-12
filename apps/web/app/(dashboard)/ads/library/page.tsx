'use client';

// Visnora — Searchable Ad Library Screen
// Strictly LIGHT MODE ONLY

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Search,
  Filter,
  Compass,
  Columns,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Eye,
  CheckCircle2,
  Calendar,
  Image as ImageIcon,
  Video,
  FileText,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdItem {
  id: string;
  platform: string;
  externalAdId: string;
  advertiserName: string;
  headline?: string;
  primaryText?: string;
  ctaText?: string;
  format: string;
  landingPageUrl?: string;
  status: string;
  firstSeenAt?: string;
  creatives?: Array<{ mediaType: string; caption?: string }>;
  landingPages?: Array<{ normalizedDomain: string; url: string }>;
  analyses?: Array<{ positioning: string; emotionalVsRational: string; confidenceScore: number }>;
}

export default function AdLibraryPage() {
  const router = useRouter();
  const [ads, setAds] = useState<AdItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');
  const [selectedFormat, setSelectedFormat] = useState('ALL');
  const [selectedCompetitor, setSelectedCompetitor] = useState('ALL');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  useEffect(() => {
    fetchAds();
  }, [selectedPlatform, selectedFormat, selectedCompetitor]);

  async function fetchAds() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedPlatform !== 'ALL') params.set('platform', selectedPlatform);
      if (selectedFormat !== 'ALL') params.set('format', selectedFormat);
      if (selectedCompetitor !== 'ALL') params.set('competitorId', selectedCompetitor);

      const res = await fetch(`/api/v1/ads?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setAds(json.data?.ads || []);
      }
    } catch (err) {
      console.error('Failed to load ads library:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleCompare(id: string) {
    setSelectedForCompare((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function launchComparison() {
    if (selectedForCompare.length >= 2) {
      router.push(`/ads/compare?ids=${selectedForCompare.join(',')}`);
    }
  }

  const filteredAds = ads.filter((ad) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ad.advertiserName.toLowerCase().includes(q) ||
      (ad.headline && ad.headline.toLowerCase().includes(q)) ||
      (ad.primaryText && ad.primaryText.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Layers className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Ad Creative Library
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, and review indexed competitor advertisements across Meta, Google, and TikTok.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/ads/discover">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <Compass className="h-4 w-4 mr-1.5" />
              Discover More Ads
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by brand, copy, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Platform pills */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {['ALL', 'META_ADS', 'GOOGLE_ADS', 'TIKTOK_ADS'].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPlatform(p)}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    selectedPlatform === p
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p === 'ALL'
                    ? 'All Channels'
                    : p === 'META_ADS'
                    ? 'Meta'
                    : p === 'GOOGLE_ADS'
                    ? 'Google'
                    : 'TikTok'}
                </button>
              ))}
            </div>

            {/* Format filter */}
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="text-xs border border-slate-200 bg-white rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Formats</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="CAROUSEL">Carousel</option>
              <option value="TEXT">Search Text</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ads Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse space-y-4"
            >
              <div className="h-4 bg-slate-100 rounded w-1/3" />
              <div className="h-6 bg-slate-100 rounded w-3/4" />
              <div className="h-20 bg-slate-100 rounded" />
              <div className="h-8 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center max-w-xl mx-auto shadow-sm">
          <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">No advertisements found</h2>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search filters or discover new campaigns from public transparency sources.
          </p>
          <Link href="/ads/discover" className="mt-4 inline-block">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              Discover Ads Now
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAds.map((ad) => {
            const isCompared = selectedForCompare.includes(ad.id);
            return (
              <div
                key={ad.id}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-sm ${
                  isCompared ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-5 space-y-3.5">
                  {/* Header: Platform & Advertiser */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          ad.platform === 'META_ADS'
                            ? 'bg-blue-50 text-blue-700'
                            : ad.platform === 'GOOGLE_ADS'
                            ? 'bg-red-50 text-red-700'
                            : ad.platform === 'TIKTOK_ADS'
                            ? 'bg-slate-100 text-slate-900'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {ad.platform === 'META_ADS'
                          ? 'Meta Ad'
                          : ad.platform === 'GOOGLE_ADS'
                          ? 'Google Ad'
                          : ad.platform === 'TIKTOK_ADS'
                          ? 'TikTok'
                          : 'Manual'}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {ad.advertiserName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-1 cursor-pointer text-[11px] font-medium text-slate-500 hover:text-blue-600">
                        <input
                          type="checkbox"
                          checked={isCompared}
                          onChange={() => toggleCompare(ad.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                        />
                        <span>Compare</span>
                      </label>
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {ad.headline || `${ad.advertiserName} Promotional Campaign`}
                  </h3>

                  {/* Creative Snippet */}
                  {ad.primaryText && (
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {ad.primaryText}
                    </p>
                  )}

                  {/* Media Format & CTA tag */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="flex items-center space-x-1 text-slate-500 font-medium text-[11px]">
                      {ad.format === 'VIDEO' ? (
                        <Video className="h-3.5 w-3.5 text-blue-500" />
                      ) : ad.format === 'CAROUSEL' ? (
                        <Layers className="h-3.5 w-3.5 text-purple-500" />
                      ) : ad.format === 'TEXT' ? (
                        <FileText className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      <span>{ad.format}</span>
                    </span>

                    {ad.ctaText && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold">
                        {ad.ctaText}
                      </span>
                    )}
                  </div>

                  {/* AI Analysis Preview Tag if analyzed */}
                  {ad.analyses && ad.analyses.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 space-y-1">
                      <div className="flex items-center space-x-1 font-semibold text-blue-700">
                        <Sparkles className="h-3 w-3" />
                        <span>AI Positioning Angle</span>
                      </div>
                      <p className="text-slate-700 line-clamp-2">
                        {ad.analyses[0].positioning}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {ad.firstSeenAt ? new Date(ad.firstSeenAt).toLocaleDateString() : 'Active'}
                  </span>

                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/ads/${ad.id}`}
                      className="inline-flex items-center font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Inspect & Analyze
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Multi-Compare Bar */}
      {selectedForCompare.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-xl flex items-center space-x-4 border border-slate-800 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center space-x-2 text-xs font-semibold">
            <Columns className="h-4 w-4 text-blue-400" />
            <span>{selectedForCompare.length} ads selected for comparison</span>
          </div>

          <Button
            size="sm"
            onClick={launchComparison}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
          >
            Compare Now <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>

          <button
            onClick={() => setSelectedForCompare([])}
            className="text-xs text-slate-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

