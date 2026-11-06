'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const message = searchParams.get('message');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        throw authError;
      }

      if (data.user) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Sign in to your account</h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter your email and password to access your workspaces.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
        />

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="block w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={loading}>
          Sign in
        </Button>
      </form>

      <div className="text-center pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-slate-400">
          Loading sign in...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
