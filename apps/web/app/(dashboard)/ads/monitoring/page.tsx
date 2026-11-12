'use client';

// Visnora — Competitor Ad Monitoring & Change Alerts Dashboard
// Strictly LIGHT MODE ONLY

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonitoringJob {
  id: string;
  competitorId: string;
  checkFrequency: string;
  sources: string[];
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus?: string;
  competitor?: {
    name: string;
    domain: string;
  };
}

interface ChangeEvent {
  id: string;
  changeType: 'NEW_AD' | 'HEADLINE_CHANGED' | 'TEXT_CHANGED' | 'CTA_CHANGED' | 'LANDING_PAGE_CHANGED' | 'REMOVED';
  fieldChanged?: string;
  previousValue?: string;
  newValue?: string;
  detectedAt: string;
  competitor?: {
    name: string;
    domain: string;
  };
  adRecord?: {
    id: string;
    headline?: string;
    platform: string;
    format: string;
  };
}

export default function AdMonitoringPage() {
  const [jobs, setJobs] = useState<MonitoringJob[]>([]);
  const [events, setEvents] = useState<ChangeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // New job modal form state
  const [selectedCompetitor, setSelectedCompetitor] = useState('comp_swiggy');
  const [frequency, setFrequency] = useState('DAILY');

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  async function fetchMonitoringData() {
    setIsLoading(true);
    try {
      const [jobsRes, eventsRes] = await Promise.all([
        fetch('/api/v1/ads/monitoring'),
        fetch('/api/v1/ads/changes'),
      ]);

      if (jobsRes.ok) {
        const json = await jobsRes.json();
        setJobs(json.data || []);
      }
      if (eventsRes.ok) {
        const json = await eventsRes.json();
        setEvents(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    setIsCreatingJob(true);
    try {
      const res = await fetch('/api/v1/ads/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: '56fef028-6276-4dd0-ad56-02ff450dc931',
          competitorId: selectedCompetitor,
          checkFrequency: frequency,
          sources: ['META_AD_LIBRARY', 'GOOGLE_ADS_TRANSPARENCY'],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setJobs((prev) => [json.data, ...prev]);
        setShowModal(false);
      }
    } catch (err) {
      console.error('Error creating monitoring job:', err);
    } finally {
      setIsCreatingJob(false);
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Radio className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Competitor Ad Monitoring & Alerts
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated snapshot tracking detecting new campaigns, revised headlines, CTA shifts, and expired offers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Configure Monitor
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-slate-500">Loading monitoring jobs and change logs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Detected Changes Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center">
                    <Bell className="h-4 w-4 mr-1.5 text-blue-600" />
                    Detected Ad Changes Feed
                  </h2>
                  <p className="text-xs text-slate-500">Real-time alerts triggered by snapshot comparison differences</p>
                </div>
                <button
                  onClick={fetchMonitoringData}
                  className="text-xs text-blue-600 hover:underline flex items-center"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                </button>
              </div>

              {events.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">No ad changes detected recently. Monitoring is active.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 transition-all hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              ev.changeType === 'NEW_AD'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ev.changeType === 'HEADLINE_CHANGED'
                                ? 'bg-blue-100 text-blue-800'
                                : ev.changeType === 'CTA_CHANGED'
                                ? 'bg-amber-100 text-amber-800'
                                : ev.changeType === 'LANDING_PAGE_CHANGED'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {ev.changeType.replace('_', ' ')}
                          </span>

                          <span className="text-xs font-bold text-slate-900">
                            {ev.competitor?.name || 'Competitor'}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-400">
                          {new Date(ev.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                          {new Date(ev.detectedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Content difference */}
                      <div className="text-xs text-slate-700 space-y-1">
                        {ev.previousValue && (
                          <div className="p-2 rounded bg-rose-50/70 border border-rose-100 text-rose-800">
                            <span className="font-semibold text-[10px] uppercase text-rose-500 block">Previous:</span>
                            <span>{ev.previousValue}</span>
                          </div>
                        )}
                        {ev.newValue && (
                          <div className="p-2 rounded bg-emerald-50/70 border border-emerald-100 text-emerald-900 font-medium">
                            <span className="font-semibold text-[10px] uppercase text-emerald-600 block">Detected:</span>
                            <span>{ev.newValue}</span>
                          </div>
                        )}
                      </div>

                      {ev.adRecord?.id && (
                        <div className="flex justify-end pt-1">
                          <Link
                            href={`/ads/${ev.adRecord.id}`}
                            className="text-[11px] font-bold text-blue-600 hover:underline flex items-center"
                          >
                            View Modified Ad <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right 1 Col: Active Monitoring Schedules */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900">Active Schedules</h2>
              <p className="text-xs text-slate-500">Scheduled checks querying public ad registries</p>

              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {job.competitor?.name || 'Competitor Monitor'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {job.checkFrequency}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <p>Platforms: Meta, Google Ads</p>
                      <p>
                        Last checked:{' '}
                        {job.lastRunAt
                          ? new Date(job.lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Pending'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-600 pt-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Monitoring Active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Monitor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Configure Competitor Ad Monitor</h3>
            <p className="text-xs text-slate-500">
              Set automated interval checks to detect creative copy shifts and new ad launches.
            </p>

            <form onSubmit={handleCreateJob} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Competitor Target</label>
                <select
                  value={selectedCompetitor}
                  onChange={(e) => setSelectedCompetitor(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3 py-2 text-slate-800 font-medium"
                >
                  <option value="comp_swiggy">Swiggy (swiggy.com)</option>
                  <option value="comp_eatsure">EatSure (eatsure.com)</option>
                  <option value="comp_magicpin">Magicpin (magicpin.in)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Check Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white rounded-xl px-3 py-2 text-slate-800 font-medium"
                >
                  <option value="DAILY">Daily (Every 24 hours)</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  className="border-slate-200 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingJob}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {isCreatingJob ? 'Creating...' : 'Activate Monitor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

