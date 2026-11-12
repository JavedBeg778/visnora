'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  Activity,
} from 'lucide-react';

export default function ChatGPTAdsMonitoringPage() {
  const [monitoring, setMonitoring] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [syncRuns, setSyncRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [monRes, altRes, syncRes] = await Promise.all([
        fetch('/api/v1/chatgpt-ads/monitoring'),
        fetch('/api/v1/chatgpt-ads/alerts'),
        fetch('/api/v1/chatgpt-ads/sync-runs?limit=25'),
      ]);

      const monData = await monRes.json();
      const altData = await altRes.json();
      const syncData = await syncRes.json();

      if (monData.success) setMonitoring(monData.data);
      if (altData.success) setAlerts(altData.data || []);
      if (syncData.success) setSyncRuns(syncData.data || []);
    } catch (err) {
      console.error('Error loading monitoring data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkAlertRead = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/chatgpt-ads/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Alert acknowledged.');
        fetchData();
      }
    } catch {
      console.error('Failed to acknowledge alert');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">System Monitoring & Sync Telemetry</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
              Live Health
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Observe background worker sync status, automated anomaly triggers, and OpenAI Ads API health.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchData().finally(() => setRefreshing(false));
          }}
          className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Sync Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Sync Success Rate</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {monitoring?.health?.successRate ?? 100}%
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {monitoring?.health?.completedRuns || 0} completed / {monitoring?.health?.totalRuns || 0} total
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Failed Runs</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {monitoring?.health?.failedRuns || 0}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Zero drop tolerance</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Active Alerts</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {alerts.filter((a) => !a.isRead).length}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Anomaly detection active</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Last Sync Execution</span>
          <div className="text-sm font-bold text-slate-900 mt-2">
            {monitoring?.health?.lastRunAt ? new Date(monitoring.health.lastRunAt).toLocaleTimeString() : 'Idle'}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Status: <strong className="text-slate-700">{monitoring?.health?.lastRunStatus || 'IDLE'}</strong>
          </span>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Active System Alerts & Anomaly Warnings
        </h2>

        {alerts.length === 0 && !loading ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No system alerts. All OpenAI Ads advertiser accounts and sync runners are operating normally.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alt) => (
              <div
                key={alt.id}
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                  alt.severity === 'CRITICAL'
                    ? 'bg-red-50/70 border-red-200 text-red-950'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${alt.severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold">{alt.title}</h4>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/70">
                        {alt.severity}
                      </span>
                    </div>
                    <p className="text-xs mt-1 text-slate-700 leading-relaxed">{alt.message}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Account: {alt.account?.name || 'All'} | Triggered: {new Date(alt.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!alt.isRead && (
                  <button
                    onClick={() => handleMarkAlertRead(alt.id)}
                    className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold whitespace-nowrap shadow-2xs"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Sync Runs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Recent Synchronization Runs
        </h2>

        {syncRuns.length === 0 && !loading ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No synchronization run history recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Account</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Records Synced</th>
                  <th className="py-2.5 px-3">Started At</th>
                  <th className="py-2.5 px-3">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {syncRuns.map((r) => {
                  const durationSec = r.completedAt
                    ? Math.round((new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) / 1000)
                    : null;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{r.account?.name || 'System'}</td>
                      <td className="py-3 px-3">{r.syncType}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            r.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'RUNNING'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">{r.recordsSynced || 0}</td>
                      <td className="py-3 px-3 text-slate-500">{new Date(r.startedAt).toLocaleTimeString()}</td>
                      <td className="py-3 px-3 text-slate-400">{durationSec !== null ? `${durationSec}s` : 'In progress'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

