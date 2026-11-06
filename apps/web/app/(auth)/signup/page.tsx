'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  AlertCircle,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Password Strength Evaluation
  const passwordCriteria = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasNumberOrSymbol: /[\d\W]/.test(password),
      hasUpperAndLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
      matches: password.length > 0 && password === confirmPassword,
    };
  }, [password, confirmPassword]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordCriteria.minLength) score += 1;
    if (passwordCriteria.hasNumberOrSymbol) score += 1;
    if (passwordCriteria.hasUpperAndLower) score += 1;
    if (password.length >= 12) score += 1;
    return score;
  }, [password, passwordCriteria]);

  const strengthLabel = useMemo(() => {
    if (!password) return { text: '', color: 'bg-slate-200' };
    if (strengthScore <= 1) return { text: 'Weak', color: 'bg-red-500' };
    if (strengthScore === 2) return { text: 'Fair', color: 'bg-amber-500' };
    if (strengthScore === 3) return { text: 'Good', color: 'bg-blue-500' };
    return { text: 'Strong', color: 'bg-emerald-500' };
  }, [password, strengthScore]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!fullName.trim()) {
      setError('Please provide your full name.');
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError('Please provide a valid work email.');
      setLoading(false);
      return;
    }

    if (!passwordCriteria.minLength) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      setLoading(false);
      return;
    }

    if (!agreeTerms) {
      setError('Please agree to the Terms of Service to create an account.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });

      if (authError) {
        throw authError;
      }

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('This email address is already registered. Please sign in instead.');
        return;
      }

      if (data.session) {
        // Direct auto sign-in supported
        router.push('/onboarding');
      } else {
        // Confirmation email dispatched
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Get started with multi-model AI visibility intelligence in seconds.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-800 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Alex Morgan"
          leftIcon={<User className="h-4 w-4" />}
        />

        <Input
          label="Work Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alex@company.com"
          leftIcon={<Mail className="h-4 w-4" />}
        />

        <div className="space-y-1.5">
          <label
            htmlFor="signup-password"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            Password
          </label>
          <div className="relative rounded-lg shadow-subtle">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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

          {/* Password Strength Meter */}
          {password && (
            <div className="pt-1.5 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Strength:</span>
                <span className="font-semibold text-slate-700">{strengthLabel.text}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex space-x-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      strengthScore >= step ? strengthLabel.color : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="signup-confirm-password"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            Confirm Password
          </label>
          <div className="relative rounded-lg shadow-subtle">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <input
              id="signup-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors py-2 pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Dynamic Requirements Indicators */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px] text-slate-600">
          <div className="flex items-center space-x-2">
            <div
              className={`h-3.5 w-3.5 rounded-full flex items-center justify-center ${
                passwordCriteria.minLength ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
              }`}
            >
              <Check className="h-2.5 w-2.5" />
            </div>
            <span className={passwordCriteria.minLength ? 'text-slate-800 font-medium' : 'text-slate-500'}>
              At least 8 characters
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`h-3.5 w-3.5 rounded-full flex items-center justify-center ${
                passwordCriteria.hasNumberOrSymbol ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
              }`}
            >
              <Check className="h-2.5 w-2.5" />
            </div>
            <span className={passwordCriteria.hasNumberOrSymbol ? 'text-slate-800 font-medium' : 'text-slate-500'}>
              Contains number or special character
            </span>
          </div>
          {confirmPassword && (
            <div className="flex items-center space-x-2">
              <div
                className={`h-3.5 w-3.5 rounded-full flex items-center justify-center ${
                  passwordCriteria.matches ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                }`}
              >
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className={passwordCriteria.matches ? 'text-slate-800 font-medium' : 'text-red-500'}>
                {passwordCriteria.matches ? 'Passwords match' : 'Passwords do not match'}
              </span>
            </div>
          )}
        </div>

        <div className="pt-1">
          <label className="flex items-start space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-xs text-slate-600 select-none leading-tight">
              I agree to Visnora&apos;s Terms of Service and acknowledge the Privacy Policy.
            </span>
          </label>
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={loading}>
          <span>Create Account</span>
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </form>

      <div className="pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
