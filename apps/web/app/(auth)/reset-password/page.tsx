'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { Button } from '../../../components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login?message=Your password has been updated. Please sign in with your new credentials.');
      }, 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Recovery link may have expired or already been used.');
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
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Set new password</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Choose a strong, secure password for your account.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-emerald-900">Password updated successfully!</p>
            <p className="mt-1 text-emerald-700">Redirecting you to the sign-in page...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-800 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{error}</span>
        </div>
      )}

      {!success && (
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="new-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              New Password
            </label>
            <div className="relative rounded-lg shadow-subtle">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="new-password"
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
              htmlFor="confirm-new-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Confirm New Password
            </label>
            <div className="relative rounded-lg shadow-subtle">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <input
                id="confirm-new-password"
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

          {/* Validation Checklist */}
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

          <Button type="submit" className="w-full mt-2" isLoading={loading}>
            Save New Password
          </Button>
        </form>
      )}
    </div>
  );
}
