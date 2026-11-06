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
  Globe,
  Layers,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const STEPS = [
  { id: 1, title: 'Organization', subtitle: 'Primary tenant container' },
  { id: 2, title: 'Workspace', subtitle: 'Operational workspace' },
  { id: 3, title: 'First Brand', subtitle: 'Target entity for AI tracking' },
  { id: 4, title: 'Review & Launch', subtitle: 'Verification & setup' },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State (persisted across back/next)
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
      // Prefill project name and website from organization if not yet set
      if (!projectName) {
        setProjectName(orgName.trim());
      }
      if (!primaryWebsite && orgWebsite) {
        setPrimaryWebsite(orgWebsite.trim());
      }
      setStep(3);
    } else if (step === 3) {
      if (!projectName.trim()) {
        setError('Please provide a brand or project name.');
        return;
      }
      if (!primaryWebsite.trim()) {
        setError('Please provide the primary website URL.');
        return;
      }
      setStep(4);
    }
  };

  const handleFinish = async () => {
    setError(null);
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
        throw new Error(resData.error?.message || 'Failed to complete organization provisioning.');
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        <div className="inline-flex items-center space-x-3">
          <div className="h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
            V
          </div>
          <div className="text-left">
            <span className="text-2xl font-bold tracking-tight text-slate-900 block leading-tight">Visnora</span>
            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">
              Workspace Onboarding
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500 max-w-md mx-auto">
          Welcome to Visnora. Let&apos;s configure your isolated tenant environment and initialize your first AI tracking entity.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl mt-8">
        {/* Multi-Step Stepper Bar */}
        <div className="mb-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STEPS.map((s) => {
              const isCurrent = step === s.id;
              const isCompleted = step > s.id;

              return (
                <div
                  key={s.id}
                  className={`flex items-center space-x-2.5 p-2 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-blue-50 border border-blue-200 text-blue-900'
                      : isCompleted
                      ? 'bg-slate-50 text-slate-800'
                      : 'text-slate-400 opacity-70'
                  }`}
                >
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : s.id}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate leading-tight ${isCurrent ? 'text-blue-950' : 'text-slate-800'}`}>
                      {s.title}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate hidden sm:block">
                      {s.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Main Card */}
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-card border border-slate-200">
          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-800 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {/* STEP 1: ORGANIZATION SETUP */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100">
                <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Create your Organization</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your tenant container with PostgreSQL RLS data isolation and team management.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Organization Name"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Corporation, Horizon Agency"
                  helperText="This name will appear on reports, invoices, and team invitations."
                />

                <Input
                  label="Website URL (Optional)"
                  type="url"
                  value={orgWebsite}
                  onChange={(e) => setOrgWebsite(e.target.value)}
                  placeholder="https://example.com"
                  leftIcon={<Globe className="h-4 w-4" />}
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Organization Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        type: 'business',
                        title: 'Brand / Business',
                        desc: 'Tracking in-house brand visibility',
                      },
                      {
                        type: 'agency',
                        title: 'Marketing Agency',
                        desc: 'Managing multiple client workspaces',
                      },
                      {
                        type: 'other',
                        title: 'Consultancy / Other',
                        desc: 'Advisory or independent analysis',
                      },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setOrgType(item.type as any)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          orgType === item.type
                            ? 'border-blue-600 bg-blue-50/50 shadow-subtle ring-1 ring-blue-600'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <p
                          className={`text-xs font-bold leading-tight ${
                            orgType === item.type ? 'text-blue-900' : 'text-slate-800'
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {item.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleNext} className="w-full sm:w-auto">
                  <span>Continue to Workspace</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: WORKSPACE SETUP */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100">
                <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Set Up Workspace</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Organize campaigns, tracking jobs, and competitor monitors under one umbrella.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Workspace Name"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Primary Workspace"
                  helperText="You can create additional workspaces later for distinct clients or departments."
                  leftIcon={<Layers className="h-4 w-4" />}
                />

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">What is a Workspace?</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Workspaces allow you to compartmentalize prompts, competitor benchmarks, and automated tracking runs. Team members can be granted access per workspace or at the organization level.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span>Back</span>
                </Button>
                <Button onClick={handleNext}>
                  <span>Continue to First Brand</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: FIRST BRAND / PROJECT SETUP */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100">
                <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
                  <FolderKanban className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Define Your First Brand</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    The primary brand entity that Visnora will measure and benchmark in AI responses.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Brand Name"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Visnora, Acme, Nike"
                  helperText="The exact commercial name the AI search models use when referencing your brand."
                />

                <Input
                  label="Primary Website URL"
                  type="url"
                  required
                  value={primaryWebsite}
                  onChange={(e) => setPrimaryWebsite(e.target.value)}
                  placeholder="https://example.com"
                  leftIcon={<Globe className="h-4 w-4" />}
                  helperText="Used to accurately attribute cited links and domain references in Gemini and AI responses."
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Industry / Market Vertical
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="block w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-subtle focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                <Button variant="secondary" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span>Back</span>
                </Button>
                <Button onClick={handleNext}>
                  <span>Review Configuration</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & LAUNCH */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100">
                <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Review &amp; Launch Setup</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Confirm your configuration details before provisioning your tenant environment.
                  </p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Organization</span>
                    <p className="text-sm font-bold text-slate-900">{orgName}</p>
                    <p className="text-xs text-slate-500">
                      {orgWebsite || 'No website specified'} • Type: {orgType.toUpperCase()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Workspace</span>
                    <p className="text-sm font-bold text-slate-900">{workspaceName}</p>
                    <p className="text-xs text-slate-500">Isolated operational container</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Edit
                  </button>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">First Brand & Project</span>
                    <p className="text-sm font-bold text-slate-900">{projectName}</p>
                    <p className="text-xs text-slate-500">
                      {primaryWebsite} • Vertical: {industry}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Security confirmation */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center space-x-2.5 text-xs text-blue-900">
                <ShieldCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>
                  Tenant isolation is automatically enforced via PostgreSQL Row Level Security policies.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setStep(3)} disabled={loading}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span>Back</span>
                </Button>
                <Button onClick={handleFinish} isLoading={loading}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  <span>Provision &amp; Launch Dashboard</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="mt-8 text-center text-xs text-slate-400">
        Visnora Enterprise Tenant Isolation • Supabase Auth &amp; PostgreSQL
      </div>
    </div>
  );
}
