'use client';

// Visnora — Competitor Ad Intelligence Analysis Screen
// Strictly LIGHT MODE ONLY

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target,
  BarChart3,
  Layers,
  ArrowRight,
  TrendingUp,
  Tag,
  MessageSquare,
  Globe2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompetitorSummary {
  competitorId: string;
  competitorName: string;
  competitorDomain: string;
  totalAdsDiscovered: number;
  activeAdsCount: number;
  platformDistribution: Array<{ platform: string; count: number; percentage: number }>;
  formatDistribution: Array<{ format: string; count: number; percentage: number }>;
  topCtas: Array<{ cta: string; count: number }>;
  activeOffers: string[];
  commonMessagingThemes: string[];
  topLandingPages: Array<{ domain: string; url: string; count: number }>;
}

export default function CompetitorsAdIntelligencePage() {
  const [competitors, setCompetitors] = useState<Array<{ id: string; name: string; domain: string }>>([]);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>('all');
  const [summary, setSummary] = useState<CompetitorSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompetitors();
  }, []);

  useEffect(() => {
    fetchAnalytics(selectedCompetitorId);
  }, [selectedCompetitorId]);

  async function fetchCompetitors() {
    try {
      const res = await fetch('/api/v1/ads/competitors');
      if (res.ok) {
        const json = await res.json();
        setCompetitors(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching competitors:', err);
    }
  }

  async function fetchAnalytics(compId: string) {
    setIsLoading(true);
    try {
      const url = compId === 'all'
        ? '/api/v1/ads/analytics'
        : `/api/v1/ads/analytics?competitorId=${compId}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setSummary(json.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Target className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Competitor Ad Footprint & Aggregates
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated intelligence across channel distribution, creative formats, top CTAs, and active offers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/ads/library">
            <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50">
              <Layers className="h-4 w-4 mr-1.5 text-slate-500" />
              Ad Library
            </Button>
          </Link>
        </div>
      </div>

      {/* Competitor Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCompetitorId('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            selectedCompetitorId === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Competitors Overview
        </button>

        {competitors.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCompetitorId(c.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              selectedCompetitorId === c.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{c.name}</span>
            <span className="text-[10px] opacity-75">({c.domain})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-12 text-center space-y-2">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-slate-500">Calculating competitor intelligence analytics...</p>
        </div>
      ) : !summary ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500">No ad intelligence data available for this competitor.</p>
        </div>
      ) : (
        <>
          {/* Key Metrics Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Total Ads Tracked</span>
              <span className="text-3xl font-extrabold text-slate-900 mt-2 block">
                {summary.totalAdsDiscovered}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">In indexed library</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Active Campaigns</span>
              <span className="text-3xl font-extrabold text-emerald-600 mt-2 block">
                {summary.activeAdsCount}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Currently serving</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Dominant Channel</span>
              <span className="text-xl font-bold text-blue-600 mt-2 block truncate">
                {summary.platformDistribution[0]?.platform || 'META_ADS'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {summary.platformDistribution[0]?.percentage || 0}% of campaign volume
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Top CTA Trigger</span>
              <span className="text-xl font-bold text-slate-900 mt-2 block truncate">
                {summary.topCtas[0]?.cta || 'Order Now'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Used in {summary.topCtas[0]?.count || 0} ads
              </span>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Platform Distribution</h3>
                <p className="text-xs text-slate-500">Ad deployment mix across marketing channels</p>
              </div>

              <div className="space-y-3 pt-2">
                {summary.platformDistribution.map((item) => (
                  <div key={item.platform} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800">{item.platform}</span>
                      <span className="text-slate-500">
                        {item.count} ads ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creative Format Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Creative Format Breakdown</h3>
                <p className="text-xs text-slate-500">Visual asset mix (Image, Video, Carousel, Text)</p>
              </div>

              <div className="space-y-3 pt-2">
                {summary.formatDistribution.map((item) => (
                  <div key={item.format} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800">{item.format}</span>
                      <span className="text-slate-500">
                        {item.count} ads ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Frequent CTAs */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Top Call-To-Actions</h3>
                <p className="text-xs text-slate-500">Observed call-to-actions across rival ad creatives</p>
              </div>

              <div className="space-y-2 pt-1">
                {summary.topCtas.map((c, i) => (
                  <div
                    key={c.cta}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-bold text-slate-900">{c.cta}</span>
                    </div>
                    <span className="font-semibold text-slate-500">{c.count} ads</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Offers & Discounts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Active Promotional Offers</h3>
                <p className="text-xs text-slate-500">Public discounts and incentives identified in ad copy</p>
              </div>

              <div className="space-y-2 pt-1">
                {summary.activeOffers.length > 0 ? (
                  summary.activeOffers.map((offer, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center space-x-2 text-xs text-amber-900 font-semibold"
                    >
                      <Tag className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span>{offer}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 p-3">No specific discount codes detected.</p>
                )}
              </div>
            </div>

            {/* Common Messaging Themes */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Extracted Messaging Themes</h3>
                <p className="text-xs text-slate-500">Core psychological value hooks emphasized in creatives</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {summary.commonMessagingThemes.map((theme, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                    <span>{theme}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Top Landing Pages */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Top Destination Landing Pages</h3>
                <p className="text-xs text-slate-500">Funnels receiving the highest observed creative distribution</p>
              </div>

              <div className="space-y-2 pt-1">
                {summary.topLandingPages.map((lp, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate mr-3">
                      <Globe2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{lp.url}</span>
                    </div>
                    <span className="font-bold text-slate-600 flex-shrink-0">{lp.count} ads</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

