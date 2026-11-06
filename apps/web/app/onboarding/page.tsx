'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Briefcase,
  FolderKanban,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [orgName, setOrgName] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgType, setOrgType] = useState<'business' | 'agency' | 'other'>('business');
  const [workspaceName, setWorkspaceName] = useState('Primary Workspace');
  const [projectName, setProjectName] = useState('');
  const [primaryWebsite, setPrimaryWebsite] = useState('');
  const [industry, setIndustry] = useState('Technology & SaaS');

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!orgName.trim() || orgName.trim().length < 2) {
        setError('Please enter a valid organization name (minimum 2 characters).');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!workspaceName.trim()) {
        setError('Please provide a workspace name.');
        return;
      }
      // Prefill project name from org name if empty
      if (!projectName) {
        setProjectName(orgName);
      }
      if (!primaryWebsite && orgWebsite) {
        setPrimaryWebsite(orgWebsite);
      }
      setStep(3);
    }
  };

  const handleFinish = async () => {
    setError(null);
    if (!projectName.trim()) {
      setError('Please provide a brand or project name.');
      return;
    }
    if (!primaryWebsite.trim()) {
      setError('Please provide the primary website URL.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/v1/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName.trim(),
          website: orgWebsite.trim() || undefined,
          orgType,
          workspaceName: workspaceName.trim(),
          projectName: projectName.trim(),
          primaryWebsite: primaryWebsite.trim(),
          industry,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error?.message || 'Failed to complete onboarding provisioning.');
      }

      // Set cookie for active org
      if (resData.data?.organization?.id) {
        document.cookie = `visnora_active_org=${resData.data.organization.id}; path=/; max-age=2592000; SameSite=Lax`;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during onboarding.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center mb-8">
        <div className="inline-flex items-center space-x-2.5">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            V
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">Visnora</span>
        </div>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
          Account Setup & Onboarding Wizard
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Progress Bar */}
        <div className="mb-6 flex items-center justify-between px-2">
          {[
            { s: 1, label: 'Organization' },
            { s: 2, label: 'Workspace' },
            { s: 3, label: 'First Brand' },
          ].map((item) => (
            <div key={item.s} className="flex items-center space-x-2">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === item.s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : step > item.s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {step > item.s ? '✓' : item.s}
              </div>
              <span className={`text-xs font-medium ${step >= item.s ? 'text-slate-800' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Wizard Card */}
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-card border border-slate-200">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Organization Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create your Organization</h3>
                  <p className="text-xs text-slate-500">The primary tenant container for your team and billing.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Organization Name"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Marketing, Nexus Agency"
                />

                <Input
                  label="Website (Optional)"
                  type="url"
                  value={orgWebsite}
                  onChange={(e) => setOrgWebsite(e.target.value)}
                  placeholder="https://example.com"
                />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                    Organization Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: 'business', label: 'Brand / Business' },
                      { type: 'agency', label: 'Marketing Agency' },
                      { type: 'other', label: 'Consultant / Other' },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setOrgType(item.type as any)}
                        className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                          orgType === item.type
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleNext} className="w-full sm:w-auto">
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: First Workspace */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create your First Workspace</h3>
                  <p className="text-xs text-slate-500">Group projects and campaigns by client, team, or department.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Workspace Name"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Primary Workspace"
                  helperText="You can create multiple workspaces later for different clients or business units."
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span>Back</span>
                </Button>
                <Button onClick={handleNext}>
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: First Project & Brand */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Set Up your First Brand</h3>
                  <p className="text-xs text-slate-500">The primary brand entity you want to monitor across AI Search.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Brand / Project Name"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Acme, Visnora"
                />

                <Input
                  label="Primary Website URL"
                  type="url"
                  required
                  value={primaryWebsite}
                  onChange={(e) => setPrimaryWebsite(e.target.value)}
                  placeholder="https://example.com"
                  helperText="Used to accurately identify domain citations in AI search responses."
                />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Industry / Vertical
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="block w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Technology & SaaS">Technology & SaaS</option>
                    <option value="E-commerce & Retail">E-commerce & Retail</option>
                    <option value="Digital Marketing & SEO">Digital Marketing & SEO</option>
                    <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                    <option value="Finance & FinTech">Finance & FinTech</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Education & EdTech">Education & EdTech</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setStep(2)} disabled={loading}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span>Back</span>
                </Button>
                <Button onClick={handleFinish} isLoading={loading}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  <span>Complete Setup</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

