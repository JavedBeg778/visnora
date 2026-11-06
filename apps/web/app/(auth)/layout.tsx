import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  BarChart2,
  Lock,
} from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Mobile Header */}
      <header className="lg:hidden border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4">
        <Link href="/" className="inline-flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            V
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Visnora</span>
        </Link>
      </header>

      {/* Main Split Layout Container */}
      <div className="flex-1 flex items-stretch">
        {/* Left Branding / Value Proposition Column (Desktop) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 bg-white border-r border-slate-200 flex-col justify-between p-12 relative overflow-hidden">
          {/* Subtle geometric background pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                V
              </div>
              <div>
                <span className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">Visnora</span>
                <span className="block text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                  AI Visibility Intelligence
                </span>
              </div>
            </Link>
          </div>

          {/* Center Showcase Content */}
          <div className="relative z-10 my-auto py-8 space-y-8 max-w-lg">
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>Next-Generation Brand Intelligence</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Measure, benchmark, and scale your brand presence across AI Search.
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Join forward-thinking enterprise marketing and SEO teams tracking Share of Voice across Google Gemini, OpenAI, Claude, and Perplexity.
              </p>
            </div>

            {/* Core Capability Cards */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Multi-Model LLM Search Coverage</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automated tracking across leading generative engines with prompt citation extraction.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Competitive Share of Voice</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Compare head-to-head visibility scores, sentiment analysis, and ranking positions.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Strict Multi-Tenant Security</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    PostgreSQL Row Level Security (RLS) ensures complete cryptographic data isolation.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="pt-2 flex items-center space-x-6 text-xs text-slate-500 font-medium">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Zero Hallucination Analytics</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Row-Level Tenant Isolation</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Footer */}
          <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>Enterprise Grade Security</span>
            </div>
            <span>© {new Date().getFullYear()} Visnora Inc.</span>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-12 xl:px-16">
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white py-9 px-7 sm:px-10 rounded-2xl shadow-card border border-slate-200">
              {children}
            </div>

            <div className="mt-8 text-center text-xs text-slate-400 space-y-1">
              <p>Protected by Visnora Enterprise Tenant Isolation &amp; Supabase SSR</p>
              <div className="flex items-center justify-center space-x-4 pt-1">
                <Link href="/" className="hover:text-slate-600 transition-colors">Home</Link>
                <span>•</span>
                <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
                <span>•</span>
                <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
