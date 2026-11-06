'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Mail,
  KeyRound,
  RotateCcw,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.trim()) {
      setError('Please provide your registered account email.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Reset your password</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Enter your email to receive recovery instructions.
          </p>
        </div>
      </div>

      {submitted ? (
        <div className="space-y-5">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-800">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span className="font-bold text-sm text-emerald-900">Reset instructions dispatched</span>
            </div>
            <p className="text-emerald-800 leading-relaxed pl-7">
              If an active account exists for <strong className="font-semibold text-emerald-950">{email}</strong>, you will receive a secure password recovery link shortly.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800">Next steps:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px]">
              <li>Check your inbox and click the reset link.</li>
              <li>The recovery link is valid for 1 hour.</li>
              <li>Ensure you configure a strong, unique password.</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Try a different email
            </button>
            <Link
              href="/login"
              className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Return to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-800 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <Input
            label="Registered Work Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            leftIcon={<Mail className="h-4 w-4" />}
            helperText="We will send a single-use secure reset link to this address."
          />

          <Button type="submit" className="w-full mt-2" isLoading={loading}>
            Send Reset Instructions
          </Button>

          <div className="pt-3 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
