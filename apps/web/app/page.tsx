import Link from 'next/link';
import { ArrowRight, Sparkles, Shield, BarChart3, Search } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            V
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Visnora</span>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Next-Generation AI Search & Visibility Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Understand Your Brand&apos;s Visibility in the Age of{' '}
          <span className="text-blue-600">AI Search</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Visnora empowers modern brands, digital agencies, and marketers to track their brand presence, source citations, and competitor share of voice across Google Gemini and AI engines.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-md hover:bg-blue-700 transition-all"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
          >
            Sign In to Dashboard
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">AI Visibility Intelligence</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Track prompt discovery rankings, domain citation extraction, and brand presence across frontier models.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Ad Intelligence</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Consolidate Google Ads, Meta Ad Library, and first-party campaign reporting into a unified intelligence hub.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Multi-Tenant Architecture</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Enterprise-grade PostgreSQL Row Level Security, role-based access control, and workspace isolation for agencies.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-400">
        © 2026 Visnora. All rights reserved. Enterprise B2B SaaS Platform.
      </footer>
    </div>
  );
}

