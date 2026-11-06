'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const message = searchParams.get('message');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both your email address and password.');
      setLoading(false);
      return;
    }

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
      setError(
        err?.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please verify your credentials and try again.'
          : err?.message || 'Failed to sign in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Enter your work email and password to access your workspaces.
        </p>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-800 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Work Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          leftIcon={<Mail className="h-4 w-4" />}
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative rounded-lg shadow-subtle">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors py-2 pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-xs text-slate-600 select-none">Remember this device</span>
          </label>
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={loading}>
          <span>Sign In</span>
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </form>

      <div className="pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500">
          Don&apos;t have an account yet?{' '}
          <Link
            href="/signup"
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
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
