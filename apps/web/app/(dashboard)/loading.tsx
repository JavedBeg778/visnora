import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* Header bar skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 rounded-lg" />
          <div className="h-4 w-96 bg-slate-100 rounded-md" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-xl" />
      </div>

      {/* Top Filter and Execution Bar skeleton */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-9 w-60 bg-slate-100 rounded-xl border border-slate-200" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-32 bg-slate-100 rounded-xl" />
          <div className="h-8 w-28 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* 4 Metric cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-slate-100 rounded" />
              <div className="h-8 w-8 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-8 w-20 bg-slate-200 rounded" />
            <div className="h-3 w-36 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main chart & breakdown skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-48 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
          </div>
          <div className="h-64 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center">
            <div className="h-3 w-40 bg-slate-200 rounded" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 w-28 bg-slate-100 rounded" />
                  <div className="h-3 w-10 bg-slate-200 rounded" />
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

