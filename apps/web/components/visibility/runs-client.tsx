'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  History,
  Play,
  RotateCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Coins,
  Cpu,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EmptyState } from '../ui/empty-state';

interface RunsClientProps {
  initialRuns: any[];
  projects: any[];
  currentProjectId: string;
  organizationId: string;
}

export function RunsClient({
  initialRuns,
  projects,
  currentProjectId: initialProjectId,
  organizationId,
}: RunsClientProps) {
  const [runs, setRuns] = useState<any[]>(initialRuns);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshRuns = async (projId: string) => {
    try {
      const res = await fetch(`/api/v1/tracking/runs?projectId=${projId}`, {
        headers: { 'x-organization-id': organizationId },
      });
      const json = await res.json();
      if (json.success) setRuns(json.data.runs || json.data);
    } catch {
      // Keep existing
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedProjectId(newId);
    refreshRuns(newId);
  };

  const handleStartRun = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/tracking/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          provider: 'google-gemini',
          model: 'gemini-3.8-flash',
          enableGrounding: false,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const totalPrompts = json.data.promptCount || json.data.summary?.totalPrompts || 10;
        setMessage(`Tracking run pipeline initiated! Evaluating ${totalPrompts} prompt query sample(s) in background.`);
        await refreshRuns(selectedProjectId);

        const runId = json.data.id || json.data.trackingRunId;
        if (runId) {
          let attempts = 0;
          const maxAttempts = 24;
          const pollInterval = setInterval(async () => {
            attempts++;
            try {
              const runRes = await fetch(`/api/v1/tracking/runs/${runId}`, {
                headers: { 'x-organization-id': organizationId },
              });
              const runJson = await runRes.json();
              if (runJson.success && runJson.data) {
                const r = runJson.data;
                if (r.status === 'COMPLETED' || r.status === 'PARTIALLY_COMPLETED' || r.status === 'PARTIAL' || r.status === 'FAILED') {
                  clearInterval(pollInterval);
                  setRunning(false);
                  await refreshRuns(selectedProjectId);
                  setMessage(`Tracking run complete! Evaluated ${r.successCount}/${r.promptCount} prompt query sample(s).`);
                }
              }
            } catch {
              // Ignore
            }

            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              setRunning(false);
              await refreshRuns(selectedProjectId);
            }
          }, 2500);
        } else {
          setRunning(false);
        }
      } else {
        setRunning(false);
        setMessage(`Run notice: ${json.error?.message || 'Could not complete tracking run'}`);
      }
    } catch (err: any) {
      setRunning(false);
      setMessage(`Error: ${err.message || 'Run execution failed'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <label htmlFor="project-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Project:
          </label>
          <select
            id="project-select"
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-subtle"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          size="sm"
          onClick={handleStartRun}
          disabled={running}
          className="self-end sm:self-auto"
        >
          {running ? (
            <RotateCw className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-1.5" />
          )}
          <span>{running ? 'Evaluating Pipeline...' : 'Start New Tracking Run'}</span>
        </Button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-medium text-blue-800 flex items-center space-x-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Runs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3.5 font-bold">Run ID &amp; Timestamp</th>
                <th className="px-6 py-3.5 font-bold">Execution Status</th>
                <th className="px-6 py-3.5 font-bold">Model &amp; Provider</th>
                <th className="px-6 py-3.5 font-bold text-center">Evaluated Prompts</th>
                <th className="px-6 py-3.5 font-bold text-right">Tokens</th>
                <th className="px-6 py-3.5 font-bold text-right">Cost (Paise / ₹)</th>
                <th className="px-6 py-3.5 font-bold text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => {
                const isSuccess = run.status === 'COMPLETED';
                const isRunning = run.status === 'RUNNING' || run.status === 'QUEUED';
                const isPartial = run.status === 'PARTIALLY_COMPLETED' || run.status === 'PARTIAL';
                const isFailed = run.status === 'FAILED';

                const totalTokens = (run.totalInputTokens || 0) + (run.totalOutputTokens || 0);
                const costPaise = run.actualCostPaise ?? run.estimatedCostPaise ?? 0;
                const costInr = (costPaise / 100).toFixed(3);

                return (
                  <tr key={run.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 font-mono text-xs">
                        {run.id.slice(0, 8)}...
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(run.createdAt).toLocaleString()}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSuccess
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isRunning
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : isPartial
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isSuccess && <CheckCircle2 className="h-3 w-3" />}
                        {isRunning && <RotateCw className="h-3 w-3 animate-spin" />}
                        {isPartial && <AlertTriangle className="h-3 w-3" />}
                        {isFailed && <XCircle className="h-3 w-3" />}
                        <span>{run.status}</span>
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{run.model}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{run.provider}</div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-slate-900">{run.successCount ?? 0}</span>
                      <span className="text-slate-400"> / {run.promptCount ?? 0}</span>
                      {(run.failedCount ?? 0) > 0 && (
                        <div className="text-[10px] text-rose-600 font-bold">
                          ({run.failedCount} failed)
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right font-mono text-slate-700 font-medium">
                      {totalTokens.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-slate-900">₹{costInr}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{costPaise} paise</div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link href={`/runs/${run.id}`}>
                        <Button variant="secondary" size="sm">
                          <span>Inspect</span>
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400">
                    No tracking runs executed yet. Click &ldquo;Start New Tracking Run&rdquo; to analyze your prompt catalog against Google Gemini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
