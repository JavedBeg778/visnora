'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Shield,
  Save,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Globe,
  Mail,
  Lock,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { createClient } from '../../../lib/supabase/client';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'org' | 'profile'>('org');
  const [loading, setLoading] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [orgError, setOrgError] = useState<string | null>(null);
  const [orgSuccess, setOrgSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Organization Form State
  const [orgId, setOrgId] = useState<string>('');
  const [orgName, setOrgName] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgType, setOrgType] = useState('business');
  const [billingEmail, setBillingEmail] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [userRole, setUserRole] = useState<string>('MEMBER');

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [company, setCompany] = useState('');

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const canEditOrg = userRole === 'OWNER' || userRole === 'ADMIN';

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setLoading(true);
    setOrgError(null);
    setProfileError(null);

    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const activeOrgId = match ? match[1] : '';

      // Fetch Organization and Profile in parallel
      const orgPromise = activeOrgId
        ? fetch(`/api/v1/organizations/${activeOrgId}`)
            .then(async (r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve(null);

      const profPromise = fetch('/api/v1/users/me')
        .then(async (r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const [orgData, profData] = await Promise.all([orgPromise, profPromise]);

      if (orgData && orgData.success && orgData.data) {
        const org = orgData.data;
        setOrgId(org.id);
        setOrgName(org.name || '');
        setOrgWebsite(org.website || '');
        setOrgType(org.orgType || 'business');
        setBillingEmail(org.billingEmail || '');
        setCountryCode(org.countryCode || 'IN');
        setUserRole(org.role || 'MEMBER');
      }

      if (profData && profData.success && profData.data) {
        const profile = profData.data;
        setFullName(profile.fullName || '');
        setUserEmail(profile.email || '');
        setCompany(profile.company || '');
      } else {
        // Fallback to Supabase client if API profile not yet synced
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          setUserEmail(authData.user.email || '');
          setFullName(authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || '');
        }
      }
    } catch {
      setOrgError('Failed to load settings data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditOrg) return;

    setSavingOrg(true);
    setOrgError(null);
    setOrgSuccess(null);

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName.trim(),
          website: orgWebsite.trim() || undefined,
          orgType,
          billingEmail: billingEmail.trim(),
          countryCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update organization');
      }

      setOrgSuccess('Organization settings successfully saved.');
      setTimeout(() => setOrgSuccess(null), 4000);
    } catch (err: any) {
      setOrgError(err.message || 'An error occurred while saving organization settings.');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await fetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          company: company.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update user profile');
      }

      setProfileSuccess('Profile updated successfully.');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'An error occurred while updating profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setPasswordSuccess('Password successfully changed.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-xs text-slate-500 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your organization configuration, team preferences, and personal security.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-8">
        <button
          onClick={() => setActiveTab('org')}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'org'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Organization Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="h-4 w-4" />
          <span>User Profile & Security</span>
        </button>
      </div>

      {/* TAB 1: Organization Settings */}
      {activeTab === 'org' && (
        <div className="space-y-6">
          {!canEditOrg && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-amber-900">Read-Only Organization Settings</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your role is <strong className="font-bold">{userRole}</strong>. Only organization Owners and Admins can modify organization configuration.
                </p>
              </div>
            </div>
          )}

          {orgSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>{orgSuccess}</span>
            </div>
          )}

          {orgError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-800 text-xs font-medium">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{orgError}</span>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organization Profile</CardTitle>
                  <CardDescription>
                    Configure core enterprise identifiers and billing details.
                  </CardDescription>
                </div>
                <Badge variant={userRole === 'OWNER' ? 'blue' : 'outline'}>
                  Your Role: {userRole}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSaveOrganization} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Organization Name"
                    required
                    value={orgName}
                    disabled={!canEditOrg}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                  />

                  <Input
                    label="Primary Website"
                    type="url"
                    value={orgWebsite}
                    disabled={!canEditOrg}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Organization Type
                    </label>
                    <select
                      value={orgType}
                      disabled={!canEditOrg}
                      onChange={(e) => setOrgType(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="business">Direct Brand / Business</option>
                      <option value="agency">Agency / Marketing Consultancy</option>
                      <option value="enterprise">Multi-Entity Enterprise</option>
                    </select>
                  </div>

                  <Input
                    label="Billing Email"
                    type="email"
                    required
                    value={billingEmail}
                    disabled={!canEditOrg}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="billing@example.com"
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Country Jurisdiction
                    </label>
                    <select
                      value={countryCode}
                      disabled={!canEditOrg}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="IN">India (IN)</option>
                      <option value="US">United States (US)</option>
                      <option value="GB">United Kingdom (GB)</option>
                      <option value="CA">Canada (CA)</option>
                      <option value="AU">Australia (AU)</option>
                      <option value="DE">Germany (DE)</option>
                      <option value="SG">Singapore (SG)</option>
                      <option value="AE">United Arab Emirates (AE)</option>
                    </select>
                  </div>
                </div>

                {canEditOrg && (
                  <div className="pt-4 flex justify-end">
                    <Button type="submit" isLoading={savingOrg}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Organization Changes
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: User Profile & Security */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {profileSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-800 text-xs font-medium">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Personal Profile</CardTitle>
              <CardDescription>
                Update your account details and profile information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                  />

                  <Input
                    label="Company / Department"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Marketing Operations"
                  />

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="email"
                        disabled
                        value={userEmail}
                        className="flex-1 px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
                      />
                      <Badge variant="outline">Verified via Supabase Auth</Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Email updates require re-verification through the identity provider.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" isLoading={savingProfile}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security & Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-blue-600" />
                <span>Security & Credentials</span>
              </CardTitle>
              <CardDescription>
                Update your authentication password and manage login credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {passwordSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-emerald-800 text-xs font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <Input
                  label="New Password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />

                <div className="pt-2">
                  <Button type="submit" variant="outline" isLoading={changingPassword}>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Session Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-slate-600" />
                <span>Authentication & Access Information</span>
              </CardTitle>
              <CardDescription>
                Details regarding your identity provider and session context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <dt className="text-slate-500 font-medium">Auth Provider</dt>
                  <dd className="text-slate-900 font-bold mt-1">Supabase SSR Auth</dd>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <dt className="text-slate-500 font-medium">Session Policy</dt>
                  <dd className="text-slate-900 font-bold mt-1">HTTP-Only SameSite Cookie</dd>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <dt className="text-slate-500 font-medium">Role Level</dt>
                  <dd className="text-blue-700 font-bold mt-1 uppercase">{userRole}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
