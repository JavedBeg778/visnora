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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Link href="/runs">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span>All Runs</span>
            </Button>
          </Link>
          <span className="font-mono text-xs text-slate-500">Run ID: {run.id}</span>
        </div>

        {run.failedCount > 0 && (
          <Button
            size="sm"
            onClick={handleRetryFailed}
            disabled={retrying}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
          >
            <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${retrying ? 'animate-spin' : ''}`} />
            <span>{retrying ? 'Retrying Failed Prompts...' : `Retry Failed Prompts (${run.failedCount})`}</span>
          </Button>
        )}
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Status</span>
          <div className="mt-1 flex items-center space-x-1.5">
            <span
              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-bold ${
                isSuccess
                  ? 'bg-emerald-50 text-emerald-700'
                  : isPartial
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {isSuccess && <CheckCircle2 className="h-3.5 w-3.5" />}
              {isPartial && <AlertTriangle className="h-3.5 w-3.5" />}
              {isFailed && <XCircle className="h-3.5 w-3.5" />}
              <span>{run.status}</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            {new Date(run.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">AI Engine</span>
          <div className="mt-1 font-bold text-slate-900 text-sm">{run.model}</div>
          <div className="text-[10px] text-slate-400 mt-1">{run.provider}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Tokens Consumed</span>
          <div className="mt-1 font-bold text-slate-900 text-sm font-mono">{totalTokens.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            In: {run.totalInputTokens?.toLocaleString()} | Out: {run.totalOutputTokens?.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Cost</span>
          <div className="mt-1 font-bold text-slate-900 text-sm">₹{costInr}</div>
          <div className="text-[10px] text-slate-400 mt-1">{costPaise} paise</div>
        </div>
      </div>

      {/* Prompts Executions Breakdown */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">
          Prompt Executions & Verbatim Responses ({run.promptRuns?.length || 0})
        </h2>

        <div className="space-y-4">
          {run.promptRuns?.map((pr: any, idx: number) => {
            const resp = pr.aiResponse;
            const isPrSuccess = pr.status === 'COMPLETED';

            return (
              <div
                key={pr.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3"
              >
                {/* Header: Prompt Text & Execution Metadata */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-start space-x-2.5">
                    <span className="text-xs font-mono font-bold text-slate-400 mt-0.5">#{idx + 1}</span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-snug">
                        &ldquo;{pr.prompt?.promptText}&rdquo;
                      </h3>
                      <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-500">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                          {pr.prompt?.category || 'General'}
                        </span>
                        <span>•</span>
                        <span>{pr.prompt?.stage || 'CONSIDERATION'}</span>
                        <span>•</span>
                        <span>Latency: {pr.latencyMs ? `${pr.latencyMs}ms` : '—'}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold self-start ${
                      isPrSuccess
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {isPrSuccess ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    <span>{pr.status}</span>
                  </span>
                </div>

                {/* Error Banner if Failed */}
                {pr.errorMessage && (
                  <div className="p-2.5 rounded bg-rose-50 text-rose-700 text-xs font-semibold">
                    Error: {pr.errorMessage}
                  </div>
                )}

                {/* Verbatim AI Answer */}
                {resp?.rawText && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Verbatim AI Response:
                    </span>
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                      {resp.rawText}
                    </div>
                  </div>
                )}

                {/* Extracted Mentions & Sentiments */}
                {resp?.mentions && resp.mentions.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                      Extracted Brand & Competitor Mentions:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {resp.mentions.map((m: any) => {
                        const isPrimary = Boolean(m.brandId);
                        const isRecommended = m.isRecommendation;

                        return (
                          <div
                            key={m.id}
                            className={`p-2 rounded-lg border text-xs flex items-center space-x-2.5 ${
                              isPrimary
                                ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <span className="font-bold">
                              {isPrimary ? '★ Primary Brand' : m.competitor?.canonicalName || 'Competitor'}
                            </span>
                            {m.position && (
                              <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded font-mono">
                                Pos #{m.position}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
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
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1 py-0.2 rounded">
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
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                      Verified Citations & Sources ({resp.citations.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {resp.citations.map((c: any) => (
                        <a
                          key={c.id}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-medium transition-colors"
                        >
                          <Link2 className="h-3 w-3 text-purple-600" />
                          <span>{c.domain}</span>
                          <ExternalLink className="h-2.5 w-2.5 text-purple-400" />
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

