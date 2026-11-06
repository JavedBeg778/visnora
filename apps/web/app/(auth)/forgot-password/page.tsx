'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
      setError(err?.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Reset your password</h2>
        <p className="mt-1 text-xs text-slate-500">
          We&apos;ll send a password recovery link to your registered email.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Reset instructions sent!</p>
              <p className="mt-1 text-emerald-700">
                If an account exists for <span className="font-medium text-emerald-900">{email}</span>, you will receive an email shortly with instructions to reset your password.
              </p>
            </div>
          </div>
          <Link href="/login" className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Return to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Registered Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
          />

          <Button type="submit" className="w-full mt-2" isLoading={loading}>
            Send reset instructions
          </Button>

          <div className="text-center pt-2">
            <Link href="/login" className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

