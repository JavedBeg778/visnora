'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, ArrowLeft } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'your email';

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 text-blue-600">
        <Mail className="h-6 w-6" />
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Verify your email address</h2>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          We&apos;ve sent a confirmation link to <span className="font-semibold text-slate-800">{email}</span>. Please click the link inside to activate your account.
        </p>
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 space-y-2">
        <p className="font-semibold text-slate-800">Didn&apos;t receive the email?</p>
        <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px]">
          <li>Check your spam or junk folder.</li>
          <li>Make sure you entered the correct email address.</li>
          <li>Allow up to 2-3 minutes for network delivery.</li>
        </ul>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <Link
          href="/login"
          className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-slate-400">
          Loading verification details...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
