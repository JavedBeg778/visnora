'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  Shield,
  BarChart3,
  Search,
  CheckCircle2,
  TrendingUp,
  Percent,
  Link2,
  Award,
  Globe2,
  Users2,
  Clock,
  ChevronRight,
  Database,
  Lock,
  Layers,
  Terminal,
  Activity,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-30 shadow-subtle">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-blue-700 transition-colors">
              V
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-bold tracking-tight text-slate-900">Visnora</span>
              <Badge variant="brand" size="sm" className="hidden sm:inline-flex">
                AI Search Intelligence
              </Badge>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">
              Platform Features
            </a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
              How It Works
            </a>
            <a href="#preview" className="hover:text-blue-600 transition-colors">
              Live Preview
            </a>
            <a href="#security" className="hover:text-blue-600 transition-colors">
              Enterprise Security
            </a>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-all"
          >
            Start Free Trial
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-8 shadow-subtle animate-in fade-in slide-in-from-top-2">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Empowering B2B Brands in Frontier AI Search & Discovery</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Measure & Optimize Your Brand in{' '}
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Search Engines
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            As consumers migrate from traditional search to conversational AI, Visnora continuously tracks brand mentions, domain citations, and competitor share of voice across Google Gemini and AI engines.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-md hover:bg-blue-700 active:bg-blue-800 transition-all"
            >
              Start 14-Day Free Trial
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl shadow-subtle hover:bg-slate-50 transition-all"
            >
              Explore Demo Dashboard
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center space-x-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Full Gemini 3.8 & Flash support</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>PostgreSQL RLS security</span>
            </div>
          </div>

          {/* Genuine UI Intelligence Preview Card */}
          <div id="preview" className="mt-16 sm:mt-20 max-w-5xl mx-auto bg-white border border-slate-200/90 rounded-2xl shadow-modal overflow-hidden text-left">
            <div className="h-11 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs font-semibold text-slate-500">visnora.app/dashboard</span>
              </div>
              <Badge variant="success" size="sm" dot>
                Live Intelligence Engine Active
              </Badge>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Header metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Visibility Score</span>
                    <Award className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-slate-900">78.4</span>
                    <span className="text-xs font-semibold text-emerald-600">+4.2%</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">Top quartile in SaaS</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Mention Rate</span>
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-slate-900">84.2%</span>
                    <span className="text-xs font-semibold text-emerald-600">+6.1%</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">126 mentions / 150 runs</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Share of Voice</span>
                    <Percent className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-slate-900">41.8%</span>
                    <span className="text-xs font-semibold text-emerald-600">+2.5%</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">vs 3 tracked competitors</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Citation Rate</span>
                    <Link2 className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-slate-900">62.5%</span>
                    <span className="text-xs font-semibold text-emerald-600">+8.0%</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">Domain link attributed</div>
                </div>
              </div>

              {/* Sample Evidence Stream */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-3">
                  <div className="flex items-center space-x-2">
                    <Terminal className="h-3.5 w-3.5 text-blue-600" />
                    <span>Sample Prompt Query Evidence</span>
                  </div>
                  <Badge variant="purple" size="sm">Gemini 3.8 Flash Grounded</Badge>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs text-slate-800 space-y-2 font-mono">
                  <p className="text-slate-500 font-sans">
                    <span className="font-bold text-slate-700">Prompt:</span> &quot;What are the top enterprise tools for monitoring brand presence in AI search?&quot;
                  </p>
                  <p className="text-slate-900 font-sans bg-slate-50 p-2.5 rounded border border-slate-200/70">
                    &quot;Leading platforms include <span className="bg-blue-100 font-bold text-blue-900 px-1 rounded">Visnora</span> for continuous AI discovery scoring and citation extraction, along with Semrush for search data...&quot;
                  </p>
                  <div className="flex items-center space-x-4 pt-1 font-sans text-[11px] text-slate-500">
                    <span className="text-emerald-700 font-semibold">Mention: Primary Brand (Position #1)</span>
                    <span className="text-blue-600">Citation: https://visnora.com</span>
                    <span className="text-emerald-600 font-medium">Sentiment: Positive (0.92)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 bg-white border-y border-slate-200/90">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge variant="brand" size="md">
                Workflow
              </Badge>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                How Visnora Measures AI Discovery
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                A structured, statistical methodology designed to provide repeatable, actionable search intelligence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm mb-4">
                  01
                </div>
                <h3 className="text-base font-bold text-slate-900">Define Brand & Prompts</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Establish your brand profile, competitor domains, and curate high-intent prompts mapped across Awareness, Consideration, and Decision buying stages.
                </p>
              </div>

              <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm mb-4">
                  02
                </div>
                <h3 className="text-base font-bold text-slate-900">Execute Model Queries</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Query frontier models (including Google Gemini 3.8 and Flash) with deterministic sampling to capture raw model outputs, URLs, citations, and ranking order.
                </p>
              </div>

              <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm mb-4">
                  03
                </div>
                <h3 className="text-base font-bold text-slate-900">Act on Strategic Insights</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  View aggregated visibility scores, monitor competitor share of voice, detect sentiment shifts, and follow targeted recommendations to build authority.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section id="features" className="py-20 max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="brand" size="md">
              Platform Capabilities
            </Badge>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Enterprise-Grade AI Search Intelligence
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Everything marketing leaders, digital agencies, and brand managers need to understand generative discovery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">AI Visibility Scoring</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Compute unified 0–100 visibility scores combining observed mention rate, rank position, competitor share of voice, and citation rates.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Link2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Citation & Source Attribution</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Pinpoint exact URLs and external web domains referenced by AI engines when formulating answers about your product category.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Users2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Competitor Share of Voice</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Directly compare head-to-head visibility against rival brands to discover which prompts you dominate and where competitors lead.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Sentiment & Context Tagging</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Automatically classify AI responses as Positive, Neutral, Negative, or Mixed to ensure brand reputation is accurately conveyed.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Automated Cadence Tracking</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Configure execution cadences (daily, weekly, or on-demand) to detect visibility fluctuations before they impact inbound pipelines.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Tenant Isolation</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Enterprise tenant architecture backed by PostgreSQL Row Level Security (RLS) ensuring strict workspace separation for agency clients.
              </p>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="py-16 bg-slate-100/70 border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 shadow-card flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl space-y-3">
                <Badge variant="purple" size="md">
                  Security & Architecture
                </Badge>
                <h3 className="text-2xl font-bold text-slate-900">
                  Built on Enterprise PostgreSQL & Supabase SSR
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Visnora implements role-based access control (RBAC), cryptographically signed server sessions, and isolated schema boundaries to uphold rigorous enterprise data governance.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <Lock className="h-5 w-5 text-blue-600 mx-auto mb-1.5" />
                  <span className="text-xs font-bold text-slate-900 block">Row-Level Security</span>
                  <span className="text-[10px] text-slate-500">PostgreSQL RLS</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <Database className="h-5 w-5 text-emerald-600 mx-auto mb-1.5" />
                  <span className="text-xs font-bold text-slate-900 block">Prisma Engine</span>
                  <span className="text-[10px] text-slate-500">Strongly Typed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Conversion CTA Banner */}
        <section className="py-20 max-w-6xl mx-auto px-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-14 text-white text-center shadow-modal relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                Ready to Understand Your AI Brand Presence?
              </h2>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                Join forward-thinking marketing teams monitoring citations, mentions, and competitive visibility in generative search.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold text-blue-600 bg-white rounded-xl shadow-lg hover:bg-blue-50 transition-all"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold text-white bg-blue-700/60 border border-blue-400/40 rounded-xl hover:bg-blue-700 transition-all"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-xs">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <div className="h-6 w-6 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                V
              </div>
              <span className="font-bold text-slate-900 text-sm">Visnora</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              AI Search Visibility & Competitive Intelligence SaaS Platform.
            </p>
          </div>

          <div>
            <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-3">Platform</p>
            <ul className="space-y-2 text-slate-600">
              <li><a href="#features" className="hover:text-blue-600 transition-colors">Visibility Scoring</a></li>
              <li><a href="#features" className="hover:text-blue-600 transition-colors">Citation Tracking</a></li>
              <li><a href="#features" className="hover:text-blue-600 transition-colors">Competitor Benchmark</a></li>
              <li><a href="#how-it-works" className="hover:text-blue-600 transition-colors">Methodology</a></li>
            </ul>
          </div>

          <div>
            <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-3">Navigation</p>
            <ul className="space-y-2 text-slate-600">
              <li><Link href="/login" className="hover:text-blue-600 transition-colors">Sign In</Link></li>
              <li><Link href="/signup" className="hover:text-blue-600 transition-colors">Create Account</Link></li>
              <li><Link href="/onboarding" className="hover:text-blue-600 transition-colors">Workspace Setup</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-3">Security & Legal</p>
            <ul className="space-y-2 text-slate-600">
              <li><span className="text-slate-500">PostgreSQL 16 RLS</span></li>
              <li><span className="text-slate-500">Supabase SSR Auth</span></li>
              <li><span className="text-slate-500">Enterprise Isolation</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-[11px]">
          <p>© 2026 Visnora. All rights reserved. Enterprise B2B SaaS Platform.</p>
          <p className="mt-2 sm:mt-0 font-medium text-slate-500">Strictly Light Mode • Production Grade</p>
        </div>
      </footer>
    </div>
  );
}
