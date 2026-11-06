import React from 'react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center space-x-2.5">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            V
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">Visnora</span>
        </Link>
        <p className="mt-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
          AI-Powered Marketing & Visibility Intelligence
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card border border-slate-200 rounded-2xl sm:px-10">
          {children}
        </div>
        <div className="mt-6 text-center text-xs text-slate-400">
          Protected by Visnora Enterprise Security & Tenant Isolation
        </div>
      </div>
    </div>
  );
}

