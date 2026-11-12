'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Zap,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Building,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';

interface PlanDefinition {
  slug: string;
  name: string;
  description: string;
  monthlyPricePaise: number;
  annualPricePaise: number;
  currency: string;
  quotas: {
    monthlyPromptLimit: number;
    brandLimit: number;
    workspaceLimit: number;
    competitorLimit: number;
  };
  features: string[];
}

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [currentPlanSlug, setCurrentPlanSlug] = useState<string>('starter');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [loading, setLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState<string>('');
  const [downgradeModalOpen, setDowngradeModalOpen] = useState(false);
  const [targetDowngradeSlug, setTargetDowngradeSlug] = useState<string>('');
  const [downgrading, setDowngrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let orgId = '';
        const match = document.cookie.match(/visnora_active_org=([^;]+)/);
        if (match) orgId = match[1];

        if (!orgId) {
          const orgRes = await fetch('/api/v1/organizations');
          const orgJson = await orgRes.json();
          if (orgJson.success && orgJson.data?.length > 0) {
            orgId = orgJson.data[0].id;
          }
        }
        if (orgId) setActiveOrgId(orgId);

        const [plansRes, subRes] = await Promise.all([
          fetch('/api/v1/billing/plans'),
          orgId
            ? fetch('/api/v1/billing/subscription', { headers: { 'x-organization-id': orgId } })
            : Promise.resolve(null),
        ]);

        const plansJson = await plansRes.json();
        if (plansJson.success) {
          setPlans(plansJson.data || []);
        }

        if (subRes) {
          const subJson = await subRes.json();
          if (subJson.success && subJson.data?.subscription) {
            setCurrentPlanSlug(subJson.data.subscription.planTier?.toLowerCase() || 'starter');
            setBillingCycle(subJson.data.subscription.billingCycle || 'MONTHLY');
          }
        }
      } catch (err: any) {
        console.error('Failed to load pricing data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDowngrade = async () => {
    if (!activeOrgId || !targetDowngradeSlug) return;
    setDowngrading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/billing/subscription/downgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': activeOrgId,
        },
        body: JSON.stringify({
          planSlug: targetDowngradeSlug,
          billingCycle,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to downgrade plan.');
      }

      setDowngradeModalOpen(false);
      router.push('/billing?status=downgraded');
    } catch (err: any) {
      setError(err?.message || 'Failed to downgrade plan.');
    } finally {
      setDowngrading(false);
    }
  };

  const formatPrice = (paise: number) => {
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  };

  const getTierRank = (slug: string) => {
    switch (slug.toLowerCase()) {
      case 'free':
        return 0;
      case 'starter':
        return 1;
      case 'pro':
        return 2;
      case 'agency':
        return 3;
      default:
        return 1;
    }
  };

  const currentRank = getTierRank(currentPlanSlug);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-10 bg-slate-50 min-h-screen">
      {/* Back to Billing link */}
      <div>
        <Link
          href="/billing"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Billing & Subscription
        </Link>
      </div>

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
          Transparent, Predictable Pricing
        </Badge>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
          Supercharge Your Brand&apos;s AI Visibility
        </h1>
        <p className="text-base text-slate-600">
          Scale from single-brand monitoring to enterprise multi-workspace competitive intelligence.
          Change or cancel your plan at any time.
        </p>

        {/* Monthly vs Annual Toggle */}
        <div className="pt-4 flex items-center justify-center space-x-3">
          <span
            className={`text-sm font-semibold cursor-pointer ${
              billingCycle === 'MONTHLY' ? 'text-slate-900' : 'text-slate-500'
            }`}
            onClick={() => setBillingCycle('MONTHLY')}
          >
            Monthly Billing
          </span>
          <button
            type="button"
            onClick={() => setBillingCycle(billingCycle === 'MONTHLY' ? 'ANNUAL' : 'MONTHLY')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              billingCycle === 'ANNUAL' ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                billingCycle === 'ANNUAL' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center space-x-1.5">
            <span
              className={`text-sm font-semibold cursor-pointer ${
                billingCycle === 'ANNUAL' ? 'text-slate-900' : 'text-slate-500'
              }`}
              onClick={() => setBillingCycle('ANNUAL')}
            >
              Annual Billing
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Save 17% (2 Months Free)
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-xl mx-auto p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
        {plans.map((plan) => {
          const isCurrent = plan.slug.toLowerCase() === currentPlanSlug.toLowerCase();
          const planRank = getTierRank(plan.slug);
          const isHigher = planRank > currentRank;
          const isPopular = plan.slug.toLowerCase() === 'pro';

          const pricePaise = billingCycle === 'ANNUAL' ? plan.annualPricePaise : plan.monthlyPricePaise;
          const displayPrice =
            billingCycle === 'ANNUAL' && pricePaise > 0
              ? formatPrice(Math.round(pricePaise / 12))
              : formatPrice(pricePaise);

          return (
            <div
              key={plan.slug}
              className={`relative bg-white rounded-2xl border transition-all duration-200 p-6 flex flex-col justify-between shadow-xs ${
                isPopular
                  ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  {isCurrent && (
                    <Badge variant="success" className="text-[11px]">
                      Current
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</p>

                {/* Price */}
                <div className="mt-5 pb-5 border-b border-slate-100">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-extrabold text-slate-900">{displayPrice}</span>
                    {pricePaise > 0 && (
                      <span className="text-xs font-semibold text-slate-500 ml-1">/ month</span>
                    )}
                  </div>
                  {billingCycle === 'ANNUAL' && pricePaise > 0 && (
                    <p className="text-[11px] text-emerald-700 font-medium mt-1">
                      Billed annually at {formatPrice(pricePaise)} / yr
                    </p>
                  )}
                  {pricePaise === 0 && (
                    <p className="text-[11px] text-slate-500 font-medium mt-1">Free forever for evaluation</p>
                  )}
                </div>

                {/* Quotas & Features */}
                <div className="mt-6 space-y-3 text-xs text-slate-700">
                  <div className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
                    Included Quotas
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong className="text-slate-900">
                        {plan.quotas.monthlyPromptLimit.toLocaleString('en-IN')}
                      </strong>{' '}
                      prompt runs / month
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong className="text-slate-900">{plan.quotas.brandLimit}</strong> Brand Profile
                      {plan.quotas.brandLimit > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong className="text-slate-900">{plan.quotas.competitorLimit}</strong> Competitors
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong className="text-slate-900">{plan.quotas.workspaceLimit}</strong> Workspace
                      {plan.quotas.workspaceLimit > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="pt-2 font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
                    Key Capabilities
                  </div>
                  <div className="space-y-2">
                    {plan.features.slice(0, 4).map((f) => (
                      <div key={f} className="flex items-start space-x-2">
                        <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="capitalize">{f.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4 border-t border-slate-100">
                {isCurrent ? (
                  <Button disabled variant="outline" className="w-full text-slate-500 bg-slate-50 border-slate-200">
                    <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" /> Current Plan
                  </Button>
                ) : isHigher ? (
                  <Link
                    href={`/billing/checkout?plan=${plan.slug}&cycle=${billingCycle}`}
                    className="w-full block"
                  >
                    <Button
                      className={`w-full font-semibold shadow-xs ${
                        isPopular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      Upgrade to {plan.name}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTargetDowngradeSlug(plan.slug);
                      setDowngradeModalOpen(true);
                    }}
                    className="w-full text-slate-700 border-slate-200 hover:bg-slate-50"
                  >
                    Downgrade to {plan.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Downgrade Confirmation Modal */}
      {downgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Confirm Plan Downgrade</h3>
            <p className="text-sm text-slate-600">
              Downgrading to the <span className="font-semibold text-slate-800 capitalize">{targetDowngradeSlug}</span> plan
              will lower your prompt limit and brand allocations for subsequent billing cycles.
            </p>
            <p className="text-xs text-slate-500">
              If your current cycle usage exceeds the new plan&apos;s limit, the downgrade will take effect upon cycle reset.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDowngradeModalOpen(false)}
                disabled={downgrading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDowngrade}
                disabled={downgrading}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                {downgrading ? 'Downgrading...' : 'Confirm Downgrade'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
