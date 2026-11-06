'use client';

import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Cpu,
  RotateCw,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../ui/button';

interface ScheduleClientProps {
  initialSchedule: any;
  projects: any[];
  currentProjectId: string;
  organizationId: string;
}

export function ScheduleClient({
  initialSchedule,
  projects,
  currentProjectId: initialProjectId,
  organizationId,
}: ScheduleClientProps) {
  const [schedule, setSchedule] = useState(initialSchedule);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [frequency, setFrequency] = useState(initialSchedule?.frequency || 'DAILY');
  const [model, setModel] = useState(initialSchedule?.model || 'gemini-3.8-flash');
  const [isEnabled, setIsEnabled] = useState(initialSchedule?.isEnabled ?? true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleProjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedProjectId(newId);
    try {
      const res = await fetch(`/api/v1/tracking/schedules?projectId=${newId}`, {
        headers: { 'x-organization-id': organizationId },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSchedule(json.data);
        setFrequency(json.data.frequency || 'DAILY');
        setModel(json.data.model || 'gemini-3.8-flash');
        setIsEnabled(json.data.isEnabled ?? true);
      }
    } catch {
      // Keep existing
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/tracking/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          frequency,
          model,
          provider: 'google-gemini',
          isEnabled,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to save schedule');

      setSchedule(json.data);
      setMessage('Tracking schedule cadence successfully updated.');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Project Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex items-center space-x-3">
        <label htmlFor="project-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Brand Project:
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

      {message && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-medium text-blue-800 flex items-center space-x-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Schedule Configuration Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-card space-y-6">
        <form onSubmit={handleSave} className="space-y-6 text-xs">
          {/* Active Toggle */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Automated Pipeline Cadence</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically execute prompt runs on a scheduled interval
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Frequency */}
          <div>
            <label className="font-bold text-slate-700 block mb-2 uppercase tracking-wider text-[11px]">
              Execution Cadence
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'HOURLY', label: 'Hourly', desc: 'Frequent auditing' },
                { value: 'DAILY', label: 'Daily (Recommended)', desc: 'Standard production cadence' },
                { value: 'WEEKLY', label: 'Weekly', desc: 'Cost-conservative summary' },
              ].map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => setFrequency(opt.value)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    frequency === opt.value
                      ? 'border-blue-600 bg-blue-50/50 shadow-subtle ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`font-bold text-xs ${frequency === opt.value ? 'text-blue-900' : 'text-slate-900'}`}>
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="font-bold text-slate-700 block mb-2 uppercase tracking-wider text-[11px]">
              Target Evaluation Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-subtle"
            >
              <option value="gemini-3.8-flash">Google Gemini 3.8 Flash (Primary Standard)</option>
              <option value="gemini-3.5-flash-lite">Google Gemini 3.5 Flash-Lite (Low Latency / Cost Saver)</option>
            </select>
          </div>

          {/* Execution Timestamps Info */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Next Scheduled Run:</span>
              <span className="font-bold text-slate-900 font-mono">
                {schedule?.nextRunAt
                  ? new Date(schedule.nextRunAt).toLocaleString()
                  : 'Pending next scheduler tick'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Last Run Execution:</span>
              <span className="font-medium text-slate-700 font-mono">
                {schedule?.lastRunAt
                  ? new Date(schedule.lastRunAt).toLocaleString()
                  : 'Never executed'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" isLoading={loading}>
              Save Tracking Schedule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
