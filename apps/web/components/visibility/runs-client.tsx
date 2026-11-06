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
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

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
        setMessage(`New tracking run completed! ${json.data.summary.successCount} prompt(s) processed.`);
        await refreshRuns(selectedProjectId);
      } else {
        setMessage(`Run notice: ${json.error?.message || 'Could not complete tracking run'}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message || 'Run failed'}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <label htmlFor="project-select" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Project:
          </label>
          <select
            id="project-select"
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
        >
          {running ? <RotateCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
          <span>{running ? 'Running Pipeline...' : 'Start New Tracking Run'}</span>
        </Button>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Runs Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 font-semibold">Run ID & Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Model / Provider</th>
                <th className="px-4 py-3 font-semibold text-center">Prompts</th>
                <th className="px-4 py-3 font-semibold text-right">Tokens</th>
                <th className="px-4 py-3 font-semibold text-right">Cost (Paise / ₹)</th>
                <th className="px-4 py-3 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => {
                const isSuccess = run.status === 'COMPLETED';
                const isPartial = run.status === 'PARTIAL';
                const isFailed = run.status === 'FAILED';

                const totalTokens = (run.totalInputTokens || 0) + (run.totalOutputTokens || 0);
                const costPaise = run.actualCostPaise ?? run.estimatedCostPaise ?? 0;
                const costInr = (costPaise / 100).toFixed(3);

                return (
                  <tr key={run.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 font-mono text-[11px]">
                        {run.id.slice(0, 8)}...
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(run.createdAt).toLocaleString()}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSuccess
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isPartial
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isSuccess && <CheckCircle2 className="h-3 w-3" />}
                        {isPartial && <AlertTriangle className="h-3 w-3" />}
                        {isFailed && <XCircle className="h-3 w-3" />}
                        <span>{run.status}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">{run.model}</div>
                      <div className="text-[10px] text-slate-400">{run.provider}</div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-slate-900">{run.successCount}</span>
                      <span className="text-slate-400"> / {run.promptCount}</span>
                      {run.failedCount > 0 && (
                        <div className="text-[10px] text-rose-600 font-medium">
                          ({run.failedCount} failed)
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                      {totalTokens.toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="font-bold text-slate-900">₹{costInr}</div>
                      <div className="text-[10px] text-slate-400">{costPaise} paise</div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/runs/${run.id}`}>
                        <Button variant="secondary" size="sm" className="text-xs">
                          <span>Inspect</span>
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-500">
                    No tracking runs executed yet. Click &ldquo;Start New Tracking Run&rdquo; to analyze your tracked prompts against Gemini.
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
