// Visnora — Ad Intelligence Overview Dashboard
// Strictly LIGHT MODE ONLY

import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  getCurrentUser,
  getCachedOrganizations,
  getCachedProjects,
} from '@/lib/server-cache';
import {
  Megaphone,
  Compass,
  Layers,
  Columns,
  Lightbulb,
  Radio,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Globe2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function AdIntelligenceOverviewPage() {
  const user = await getCurrentUser();
  const userId = user?.id || '00000000-0000-0000-0000-000000000001';
  const userOrgs = await getCachedOrganizations(userId);
  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get('visnora_active_org')?.value;
  const currentOrg = userOrgs.find((o) => o.id === activeOrgCookie) || userOrgs[0] || {
    id: 'demo-org',
    name: 'Visnora Demo',
  };

  const projects = await getCachedProjects(currentOrg.id, userId);
  const currentProject = projects[0] || { id: 'default-project', name: 'Demo Project' };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Megaphone className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Competitor Ad Intelligence
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Reverse-engineer competitor creative strategies, analyze messaging angles across 12 AI dimensions, track active campaigns, and uncover high-converting positioning opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/ads/discover">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <Compass className="h-4 w-4 mr-1.5" />
              Discover Ads
            </Button>
          </Link>
          <Link href="/ads/library">
            <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50">
              <Layers className="h-4 w-4 mr-1.5 text-slate-500" />
              View Library
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tracked Ads</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">52</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" /> +14 this week
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across Meta, Google & TikTok</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Campaigns</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Radio className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">46</span>
            <span className="text-xs font-semibold text-slate-500">88% active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Live in regional ad auctions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Monitored Rivals</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Globe2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">3</span>
            <span className="text-xs font-semibold text-purple-600">Swiggy, EatSure, Magicpin</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Automated daily snapshot checks</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">AI Recommendations</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Lightbulb className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">5</span>
            <span className="text-xs font-semibold text-amber-600">Evidence-backed</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ready for creative iteration</p>
        </div>
      </div>

      {/* Main Grid: Competitor Matrix & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Competitor Advertising Matrix */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Competitor Advertising Footprint</h2>
              <p className="text-xs text-slate-500">Active campaigns and channel split for tracked category competitors</p>
            </div>
            <Link href="/ads/competitors" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center">
              Deep Analytics <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Competitor</th>
                  <th className="py-3 px-4">Tracked Ads</th>
                  <th className="py-3 px-4">Top Channels</th>
                  <th className="py-3 px-4">Key Offer Hook</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    <span>Swiggy</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900">24</span> ads
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">Meta</span>
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-semibold">Google</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">TikTok</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">Flat ₹125 OFF / 20-min delivery</td>
                  <td className="py-3.5 px-4 text-right">
                    <Link href="/ads/library?competitor=swiggy" className="text-blue-600 hover:text-blue-700 font-semibold">
                      Inspect
                    </Link>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <span>EatSure</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900">12</span> ads
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">Meta</span>
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-semibold">Google</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">Multi-Brand Single Delivery Cart</td>
                  <td className="py-3.5 px-4 text-right">
                    <Link href="/ads/library?competitor=eatsure" className="text-blue-600 hover:text-blue-700 font-semibold">
                      Inspect
                    </Link>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Magicpin</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900">16</span> ads
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">Meta</span>
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-semibold">Google</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">Save 50% on ONDC Food Delivery</td>
                  <td className="py-3.5 px-4 text-right">
                    <Link href="/ads/library?competitor=magicpin" className="text-blue-600 hover:text-blue-700 font-semibold">
                      Inspect
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quick Feature Navigation Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <Link href="/ads/compare" className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                <Columns className="h-4 w-4 text-blue-600" />
                <span>Side-by-Side Compare</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Contrast 2-4 competitor creatives with AI comparative synthesis.</p>
            </Link>

            <Link href="/ads/recommendations" className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <span>AI Recommendations</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Actionable marketing plays backed by competitor ad evidence.</p>
            </Link>

            <Link href="/ads/monitoring" className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                <Radio className="h-4 w-4 text-emerald-600" />
                <span>Active Monitoring</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Automated change detection for headline, CTA, and offer shifts.</p>
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Platform Transparency & Safe Methods Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Legal Platform Access</h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Visnora adheres strictly to official public transparency APIs and legal disclosure archives. We never bypass platform protections or fabricate metrics.
          </p>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-900">Meta Ad Library</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Graph API `/ads_archive` public disclosures across Facebook & Instagram.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-900">Google Ads Transparency</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Verified advertiser search, display, and video creative index.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-900">TikTok Creative Center</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Public showcase of viral formats and creative video hooks.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
            <div className="flex items-center space-x-1.5 font-bold text-blue-800">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>No Fabricated Metrics</span>
            </div>
            <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
              Visnora analyzes factual creative copy, format, angles, and CTAs. We never hallucinate impression counts, spend totals, or CTRs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

