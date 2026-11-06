'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { Button } from '../../../components/ui/button';
import {
  Mail,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'your email';

  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending || !email || email === 'your email') return;

    setResending(true);
    setResendStatus(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });

      if (error) throw error;

      setResendStatus({
        type: 'success',
        message: 'A fresh verification email has been sent. Please check your inbox.',
      });
      setCooldown(60);
    } catch (err: any) {
      setResendStatus({
        type: 'error',
        message: err?.message || 'Unable to resend email. Please try again shortly.',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      {/* Icon Graphic */}
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 shadow-subtle">
        <Mail className="h-8 w-8 text-blue-600 animate-pulse" />
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Check your email</h2>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          We&apos;ve sent an activation link to{' '}
          <span className="font-semibold text-slate-800 break-all">{email}</span>. Click the link to complete your account setup.
        </p>
      </div>

      {resendStatus && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 text-left ${
            resendStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {resendStatus.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{resendStatus.message}</span>
        </div>
      )}

      {/* Resend Action */}
      <div className="pt-2">
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          isLoading={resending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${resending ? 'animate-spin' : ''}`} />
          <span>
            {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
          </span>
        </Button>
      </div>

      {/* Troubleshooting card */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 space-y-2">
        <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
          <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
          <span>Didn&apos;t receive an email?</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px] leading-relaxed">
          <li>Check your spam, promotions, or junk folders.</li>
          <li>Verify that <strong className="text-slate-700">{email}</strong> is spelled correctly.</li>
          <li>Allow up to 2 minutes for email routing and filtering.</li>
        </ul>
      </div>

      {/* Footer Navigation */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <Link
          href="/signup"
          className="inline-flex items-center text-slate-500 hover:text-slate-800 hover:underline transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Change email
        </Link>
        <Link
          href="/login"
          className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          Sign in to your account
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
          Loading verification status...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
