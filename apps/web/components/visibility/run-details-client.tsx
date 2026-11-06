'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Coins,
  Cpu,
  Clock,
  ExternalLink,
  Link2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface RunDetailsClientProps {
  initialRun: any;
  organizationId: string;
}

export function RunDetailsClient({ initialRun, organizationId }: RunDetailsClientProps) {
  const [run, setRun] = useState(initialRun);
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRetryFailed = async () => {
    setRetrying(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/tracking/runs/${run.id}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
      });
      const json = await res.json();
      if (json.success) {
        setMessage(`Retry finished! Success: ${json.data.summary.successCount}, Failed: ${json.data.summary.failedCount}`);
        // Refresh run details
        const refreshed = await fetch(`/api/v1/tracking/runs/${run.id}`, {
          headers: { 'x-organization-id': organizationId },
        });
        const refJson = await refreshed.json();
        if (refJson.success) setRun(refJson.data);
      } else {
        setMessage(`Retry notice: ${json.error?.message || 'Failed to retry'}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setRetrying(false);
    }
  };

  const isSuccess = run.status === 'COMPLETED';
  const isPartial = run.status === 'PARTIAL';
  const isFailed = run.status === 'FAILED';
  const totalTokens = (run.totalInputTokens || 0) + (run.totalOutputTokens || 0);
  const costPaise = run.actualCostPaise ?? run.estimatedCostPaise ?? 0;
  const costInr = (costPaise / 100).toFixed(3);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link href="/runs">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Back to All Runs</span>
            </Button>
          </Link>
          <span className="font-mono text-xs text-slate-500 font-semibold">Run ID: {run.id}</span>
        </div>

        {run.failedCount > 0 && (
          <Button
            size="sm"
            onClick={handleRetryFailed}
            disabled={retrying}
            className="bg-amber-600 hover:bg-amber-700 text-white self-end sm:self-auto"
          >
            <RotateCw className={`h-4 w-4 mr-1.5 ${retrying ? 'animate-spin' : ''}`} />
            <span>{retrying ? 'Retrying Failed Prompts...' : `Retry Failed Prompts (${run.failedCount})`}</span>
          </Button>
        )}
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-medium text-blue-800 flex items-center space-x-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Execution Status</span>
          <div className="mt-2 flex items-center space-x-1.5">
            <span
              className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isSuccess
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isPartial
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {isSuccess && <CheckCircle2 className="h-3.5 w-3.5" />}
              {isPartial && <AlertTriangle className="h-3.5 w-3.5" />}
              {isFailed && <XCircle className="h-3.5 w-3.5" />}
              <span>{run.status}</span>
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {new Date(run.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">AI Model Engine</span>
          <div className="mt-2 font-bold text-slate-900 text-sm font-mono">{run.model}</div>
          <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">{run.provider}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Token Consumption</span>
          <div className="mt-2 font-bold text-slate-900 text-sm font-mono">{totalTokens.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            In: {run.totalInputTokens?.toLocaleString()} | Out: {run.totalOutputTokens?.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Execution Cost</span>
          <div className="mt-2 font-bold text-slate-900 text-sm">₹{costInr}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">{costPaise} paise computed</div>
        </div>
      </div>

      {/* Prompts Executions Breakdown */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Prompt Executions &amp; Verbatim Evidence ({run.promptRuns?.length || 0})
        </h2>

        <div className="space-y-4">
          {run.promptRuns?.map((pr: any, idx: number) => {
            const resp = pr.aiResponse;
            const isPrSuccess = pr.status === 'COMPLETED';

            return (
              <div
                key={pr.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4"
              >
                {/* Header: Prompt Text & Metadata */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5 pb-4 border-b border-slate-100">
                  <div className="flex items-start space-x-3">
                    <span className="text-xs font-mono font-bold text-slate-400 mt-0.5">#{idx + 1}</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        &ldquo;{pr.prompt?.promptText}&rdquo;
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full font-semibold text-slate-700">
                          {pr.prompt?.category || 'General'}
                        </span>
                        <span>•</span>
                        <span className="font-medium">{pr.prompt?.stage || 'CONSIDERATION'}</span>
                        <span>•</span>
                        <span className="font-mono">Latency: {pr.latencyMs ? `${pr.latencyMs}ms` : '—'}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start ${
                      isPrSuccess
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {isPrSuccess ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    <span>{pr.status}</span>
                  </span>
                </div>

                {/* Error Banner if Failed */}
                {pr.errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs font-medium border border-red-200">
                    Execution Error: {pr.errorMessage}
                  </div>
                )}

                {/* Verbatim AI Answer */}
                {resp?.rawText && (
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Verbatim AI Search Output:
                    </span>
                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                      {resp.rawText}
                    </div>
                  </div>
                )}

                {/* Extracted Mentions & Sentiments */}
                {resp?.mentions && resp.mentions.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Extracted Brand &amp; Competitor Mentions:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {resp.mentions.map((m: any) => {
                        const isPrimary = Boolean(m.brandId);
                        const isRecommended = m.isRecommendation;

                        return (
                          <div
                            key={m.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center space-x-2.5 ${
                              isPrimary
                                ? 'bg-blue-50/70 border-blue-200 text-blue-900 shadow-subtle'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <span className="font-bold">
                              {isPrimary ? '★ Primary Brand' : m.competitor?.canonicalName || 'Competitor'}
                            </span>
                            {m.position && (
                              <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-slate-600">
                                Pos #{m.position}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                m.sentiment === 'POSITIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.sentiment === 'NEGATIVE'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {m.sentiment}
                            </span>
                            {isRecommended && (
                              <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                                Recommended
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Verified Citations */}
                {resp?.citations && resp.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Verified Domain Citations ({resp.citations.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {resp.citations.map((c: any) => (
                        <a
                          key={c.id}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-semibold transition-colors shadow-subtle"
                        >
                          <Link2 className="h-3.5 w-3.5 text-purple-600" />
                          <span>{c.domain}</span>
                          <ExternalLink className="h-3 w-3 text-purple-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
