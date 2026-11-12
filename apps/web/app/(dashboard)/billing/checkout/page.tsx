'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Zap,
  Info,
  Building,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';

interface PlanDetails {
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
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planSlug = (searchParams.get('plan') || 'starter').toLowerCase();
  const cycleParam = (searchParams.get('cycle') || 'MONTHLY').toUpperCase() as 'MONTHLY' | 'ANNUAL';

  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>(cycleParam);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState<string>('');

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');

  // Simulation Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlanAndOrg() {
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

        // Fetch plans
        const res = await fetch('/api/v1/billing/plans');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const matched = json.data.find((p: any) => p.slug.toLowerCase() === planSlug) || json.data[1];
          setPlan(matched);
        }

        // Fetch user profile for default billing info
        const userRes = await fetch('/api/v1/users/me');
        const userJson = await userRes.json();
        if (userJson.success && userJson.data) {
          setCustomerEmail(userJson.data.email || '');
          setCustomerName(userJson.data.name || userJson.data.email?.split('@')[0] || '');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to initialize checkout.');
      } finally {
        setLoading(false);
      }
    }
    loadPlanAndOrg();
  }, [planSlug]);

  const basePricePaise =
    billingCycle === 'ANNUAL' ? plan?.annualPricePaise || 0 : plan?.monthlyPricePaise || 0;
  const gstRate = 0.18; // 18% GST
  const taxPaise = Math.round(basePricePaise * gstRate);
  const totalPaise = basePricePaise + taxPaise;

  const formatPrice = (paise: number) => {
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  };

  const handleSimulatePayment = async (shouldFail: boolean) => {
    if (!activeOrgId || !plan) return;
    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Create checkout session
      const sessionRes = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': activeOrgId,
        },
        body: JSON.stringify({
          planSlug: plan.slug,
          billingCycle,
        }),
      });

      const sessionJson = await sessionRes.json();
      if (!sessionRes.ok || !sessionJson.success) {
        throw new Error(sessionJson.error?.message || 'Failed to initialize checkout session.');
      }

      const sessionId = sessionJson.data.sessionId;

      // 2. Simulate payment verification
      const verifyRes = await fetch('/api/v1/billing/dev/simulate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': activeOrgId,
        },
        body: JSON.stringify({
          sessionId,
          simulateFailure: shouldFail,
          failureReason: shouldFail
            ? 'Test Mode: Simulated insufficient balance / card declined'
            : undefined,
        }),
      });

      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || !verifyJson.success || verifyJson.data?.success === false) {
        throw new Error(
          verifyJson.data?.errorMessage ||
            verifyJson.error?.message ||
            'Payment simulation declined. Please try again.'
        );
      }

      setSuccess(`Payment verified successfully! Your subscription to the ${plan.name} plan is now active.`);
      setTimeout(() => {
        router.push('/billing?status=upgraded');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Payment simulation failed.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Back button */}
      <div>
        <Link
          href="/billing/pricing"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Plans
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Secure Checkout</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review your order summary and complete subscription activation.
          </p>
        </div>
        <div className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200">
          <ShieldCheck className="h-4 w-4 mr-1" /> 256-Bit SSL Encrypted
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Development Mode Notice */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start space-x-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block text-blue-900">
            Development Billing Sandbox
          </strong>
          <span>
            Real payment gateway credentials are not configured. You can simulate instant successful payment
            or card failure below to test subscription provisioning and quota allocation safely.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Customer & Billing Information (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <Building className="h-4 w-4 mr-2 text-slate-600" /> Billing Details
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Billing Name / Business Entity
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Acme Innovations Pvt Ltd"
                  className="bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Billing Email
                </label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="billing@example.com"
                  className="bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  GSTIN (Optional, for Indian B2B Invoices)
                </label>
                <Input
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  className="bg-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Registered Address
                </label>
                <Input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Street, City, State, PIN"
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          {/* Development Payment Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <CreditCard className="h-4 w-4 mr-2 text-blue-600" /> Payment Simulation
            </h2>
            <p className="text-xs text-slate-500">
              Select an action to test the complete billing pipeline without charging real cards.
            </p>

            <div className="space-y-3 pt-2">
              <Button
                onClick={() => handleSimulatePayment(false)}
                disabled={processing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 shadow-xs flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {processing ? 'Processing Simulation...' : `Simulate Successful Payment (${formatPrice(totalPaise)})`}
                </span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSimulatePayment(true)}
                disabled={processing}
                className="w-full text-rose-700 border-rose-200 hover:bg-rose-50 flex items-center justify-center space-x-2"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Simulate Card Decline / Failure</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5 sticky top-6">
            <h2 className="text-base font-bold text-slate-900">Order Summary</h2>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{plan?.name} Plan</span>
                  <span className="text-xs text-slate-500 block">{billingCycle} Billing</span>
                </div>
                <span className="font-semibold text-slate-900">{formatPrice(basePricePaise)}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Included Prompt Runs:</span>
                  <strong className="text-slate-800">
                    {plan?.quotas.monthlyPromptLimit.toLocaleString('en-IN')} / mo
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Tracked Brands:</span>
                  <strong className="text-slate-800">{plan?.quotas.brandLimit}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Competitors:</span>
                  <strong className="text-slate-800">{plan?.quotas.competitorLimit}</strong>
                </div>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 text-sm text-slate-700 pt-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(basePricePaise)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>GST (18% - CGST 9% + SGST 9%)</span>
                <span>{formatPrice(taxPaise)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-bold text-slate-900 text-lg">
                <span>Total Due</span>
                <span className="text-blue-600">{formatPrice(totalPaise)}</span>
              </div>
            </div>

            <div className="pt-3 text-[11px] text-slate-500 space-y-1">
              <p>• Tax invoices and GST receipts are generated automatically upon confirmation.</p>
              <p>• You can cancel or switch plans at any time from your billing dashboard.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-4xl mx-auto space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

