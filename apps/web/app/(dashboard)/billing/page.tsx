'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Download,
  Calendar,
  Shield,
  FileText,
  Clock,
  RefreshCw,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { EmptyState } from '../../../components/ui/empty-state';

interface SubscriptionData {
  subscription: {
    id: string;
    organizationId: string;
    planTier: string;
    billingCycle: 'MONTHLY' | 'ANNUAL';
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    effectiveCancellationDate?: string;
    planDefinition: {
      slug: string;
      name: string;
      description: string;
      monthlyPricePaise: number;
      annualPricePaise: number;
      quotas: {
        monthlyPromptLimit: number;
        brandLimit: number;
        workspaceLimit: number;
        competitorLimit: number;
      };
      features: string[];
    };
  };
  entitlements: {
    planTier: string;
    planName: string;
    status: string;
    entitlements: Record<string, boolean>;
  };
}

interface UsageSummary {
  periodStart: string;
  periodEnd: string;
  promptRunsUsed: number;
  promptRunsReserved: number;
  promptRunsLimit: number;
  promptRunsRemaining: number;
  usagePercentage: number;
  isNearLimit: boolean;
  isExceeded: boolean;
  isWarning80?: boolean;
  isWarning100?: boolean;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  totalFormatted: string;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface PaymentItem {
  id: string;
  providerPaymentId: string;
  amountPaise: number;
  amountFormatted: string;
  currency: string;
  status: string;
  paymentMethod?: string;
  createdAt: string;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string>('');

  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelImmediate, setCancelImmediate] = useState(false);
  const [cancelReason, setCancelReason] = useState('Pricing / budget constraints');
  const [canceling, setCanceling] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  const fetchBillingData = async () => {
    setLoading(true);
    setError(null);
    try {
      let orgId = '';
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      if (match) {
        orgId = match[1];
      }

      if (!orgId) {
        const orgRes = await fetch('/api/v1/organizations');
        const orgJson = await orgRes.json();
        if (orgJson.success && orgJson.data?.length > 0) {
          orgId = orgJson.data[0].id;
        }
      }

      if (!orgId) {
        setError('No active organization found.');
        setLoading(false);
        return;
      }

      setActiveOrgId(orgId);

      const headers = { 'x-organization-id': orgId };

      const [subRes, usageRes, invRes, payRes] = await Promise.all([
        fetch('/api/v1/billing/subscription', { headers }),
        fetch('/api/v1/billing/usage', { headers }),
        fetch('/api/v1/billing/invoices', { headers }),
        fetch('/api/v1/billing/payments', { headers }),
      ]);

      const [subJson, usageJson, invJson, payJson] = await Promise.all([
        subRes.json(),
        usageRes.json(),
        invRes.json(),
        payRes.json(),
      ]);

      if (subJson.success) setSubData(subJson.data);
      if (usageJson.success) setUsage(usageJson.data);
      if (invJson.success) setInvoices(invJson.data || []);
      if (payJson.success) setPayments(payJson.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load billing information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleCancelSubscription = async () => {
    if (!activeOrgId) return;
    setCanceling(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/billing/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': activeOrgId,
        },
        body: JSON.stringify({
          immediate: cancelImmediate,
          reason: cancelReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to cancel subscription.');
      }

      setSuccess(data.data?.message || 'Subscription canceled.');
      setCancelModalOpen(false);
      fetchBillingData();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel subscription.');
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!activeOrgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/billing/subscription/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': activeOrgId,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to reactivate subscription.');
      }

      setSuccess(data.data?.message || 'Subscription reactivated.');
      fetchBillingData();
    } catch (err: any) {
      setError(err?.message || 'Failed to reactivate subscription.');
      setLoading(false);
    }
  };

  const formatPrice = (paise: number) => {
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && !subData) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="h-48 bg-slate-100 rounded-xl border border-slate-200 animate-pulse" />
          <div className="h-48 bg-slate-100 rounded-xl border border-slate-200 animate-pulse" />
          <div className="h-48 bg-slate-100 rounded-xl border border-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  const currentPlan = subData?.subscription?.planDefinition;
  const subStatus = subData?.subscription?.status || 'TRIAL';
  const isCanceled = subData?.subscription?.cancelAtPeriodEnd || subStatus === 'CANCELLED';
  const effectiveCancellationDate = subData?.subscription?.effectiveCancellationDate;
  const cycle = subData?.subscription?.billingCycle || 'MONTHLY';
  const pricePaise = cycle === 'ANNUAL' ? currentPlan?.annualPricePaise || 0 : currentPlan?.monthlyPricePaise || 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Billing & Subscription</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your subscription tier, track prompt quota usage, and download tax invoices.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/billing/pricing">
            <Button variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs">
              <Zap className="h-4 w-4 mr-2" />
              Compare All Plans
            </Button>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Quota Exceeded Warning Banner */}
      {usage && usage.isExceeded && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Monthly Prompt Execution Quota Exceeded</p>
              <p className="text-xs text-rose-700 mt-0.5">
                You have reached your limit of {usage.promptRunsLimit} prompt runs for the current cycle. New tracking
                runs will be paused until your quota resets on {formatDate(usage.periodEnd)}.
              </p>
            </div>
          </div>
          <Link href="/billing/pricing" className="shrink-0">
            <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-xs">
              Upgrade Quota
            </Button>
          </Link>
        </div>
      )}

      {/* 80% Quota Warning Banner */}
      {usage && usage.isNearLimit && !usage.isExceeded && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Approaching Monthly Quota Limit</p>
              <p className="text-xs text-amber-700 mt-0.5">
                You have consumed {usage.usagePercentage}% of your prompt execution quota ({usage.promptRunsUsed} /{' '}
                {usage.promptRunsLimit} runs).
              </p>
            </div>
          </div>
          <Link href="/billing/pricing" className="shrink-0">
            <Button size="sm" variant="outline" className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100">
              Upgrade Plan
            </Button>
          </Link>
        </div>
      )}

      {/* Cancellation Notice Banner */}
      {isCanceled && (
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Subscription Scheduled for Cancellation</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Your subscription will remain active until the end of your billing cycle on{' '}
                <span className="font-medium text-slate-900">
                  {formatDate(effectiveCancellationDate || subData?.subscription?.currentPeriodEnd)}
                </span>
                . After that, your workspace will revert to the Free plan.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleReactivateSubscription}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shrink-0"
          >
            Reactivate Subscription
          </Button>
        </div>
      )}

      {/* Overview 3-Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Active Subscription */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Plan</span>
              <Badge
                variant={
                  subStatus === 'ACTIVE'
                    ? 'success'
                    : subStatus === 'TRIAL'
                    ? 'primary'
                    : subStatus === 'CANCELLED'
                    ? 'warning'
                    : 'error'
                }
              >
                {subStatus}
              </Badge>
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-3xl font-bold text-slate-900">{currentPlan?.name || 'Starter Plan'}</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {pricePaise > 0 ? `${formatPrice(pricePaise)} / ${cycle.toLowerCase()}` : 'Free Tier'}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between">
                <span>Billing Cycle:</span>
                <span className="font-medium text-slate-800">{cycle}</span>
              </div>
              <div className="flex justify-between">
                <span>{subStatus === 'TRIAL' ? 'Trial Ends:' : 'Current Period End:'}</span>
                <span className="font-medium text-slate-800">
                  {formatDate(subData?.subscription?.currentPeriodEnd)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link href="/billing/pricing" className="w-full mr-2">
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Change Plan
              </Button>
            </Link>
            {!isCanceled && subStatus === 'ACTIVE' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelModalOpen(true)}
                className="text-slate-600 hover:text-rose-600 border-slate-200 hover:border-rose-200"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Card 2: Prompt Quota Meter */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prompt Runs Usage</span>
              <span className="text-xs font-semibold text-slate-700">
                {usage?.usagePercentage || 0}% used
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-bold text-slate-900">{usage?.promptRunsUsed || 0}</span>
                <span className="text-slate-400 font-medium">/ {usage?.promptRunsLimit || 100}</span>
                <span className="text-xs text-slate-500 ml-1">runs</span>
              </div>
            </div>

            {/* Gauge Progress Bar */}
            <div className="mt-3 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  (usage?.usagePercentage || 0) >= 100
                    ? 'bg-rose-500'
                    : (usage?.usagePercentage || 0) >= 80
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, usage?.usagePercentage || 0)}%` }}
              />
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-semibold text-slate-800">{usage?.promptRunsRemaining || 0} runs</span>
              </div>
              <div className="flex justify-between">
                <span>Reserved (In-Flight):</span>
                <span className="font-medium text-slate-800">{usage?.promptRunsReserved || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Resets On:</span>
                <span className="font-medium text-slate-800">{formatDate(usage?.periodEnd)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link href="/runs">
              <Button size="sm" variant="outline" className="w-full text-slate-700">
                View Tracking Runs
              </Button>
            </Link>
          </div>
        </div>

        {/* Card 3: Plan Features & Limits */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Entitlements</span>
              <Shield className="h-4 w-4 text-blue-600" />
            </div>

            <div className="mt-3">
              <span className="text-base font-semibold text-slate-900">Included Capabilities</span>
            </div>

            <div className="mt-3 space-y-2 text-xs text-slate-700">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Track up to <strong className="text-slate-900">{currentPlan?.quotas.brandLimit || 1}</strong> Brand Profiles
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Compare up to <strong className="text-slate-900">{currentPlan?.quotas.competitorLimit || 3}</strong> Competitors
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  {subData?.entitlements?.entitlements?.scheduled_tracking ? 'Automated Tracking Schedules' : 'Manual Run Pipeline'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Citation & Recommendation Intelligence</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  {subData?.entitlements?.entitlements?.csv_json_export ? 'Full CSV & JSON Data Export' : 'Standard Analytics'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link href="/billing/pricing">
              <Button size="sm" variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                View Plan Comparison <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* History Tabs Section: Invoices & Payments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center border-b border-slate-200 px-6 pt-4 space-x-6">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'invoices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Invoices & GST Receipts ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === 'payments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Payment Transactions ({payments.length})
          </button>
        </div>

        {/* Tab 1: Invoices */}
        {activeTab === 'invoices' && (
          <div className="p-6">
            {invoices.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="No Invoices Yet"
                description="Tax invoices will appear here after your first completed subscription or plan upgrade."
                action={
                  <Link href="/billing/pricing">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Upgrade Plan
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Billing Date</th>
                      <th className="py-3 px-4">Subtotal</th>
                      <th className="py-3 px-4">GST (18%)</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-900">{inv.invoiceNumber}</td>
                        <td className="py-3.5 px-4 text-slate-600">{formatDate(inv.createdAt)}</td>
                        <td className="py-3.5 px-4 text-slate-600">{formatPrice(inv.subtotalPaise)}</td>
                        <td className="py-3.5 px-4 text-slate-600">{formatPrice(inv.taxPaise)}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{inv.totalFormatted}</td>
                        <td className="py-3.5 px-4">
                          <Badge variant={inv.status === 'PAID' ? 'success' : 'neutral'}>{inv.status}</Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <a
                            href={`/api/v1/billing/invoices/${inv.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50">
                              <Download className="h-4 w-4 mr-1.5" /> HTML Receipt
                            </Button>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Payments */}
        {activeTab === 'payments' && (
          <div className="p-6">
            {payments.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="h-6 w-6" />}
                title="No Payment Transactions"
                description="Payment attempts and receipts will be recorded here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Transaction Reference</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-900 text-xs">
                          {p.providerPaymentId || p.id}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{formatDate(p.createdAt)}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{p.amountFormatted}</td>
                        <td className="py-3.5 px-4">
                          <Badge variant={p.status === 'SUCCESS' ? 'success' : 'error'}>{p.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">Cancel Subscription?</h3>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to cancel your <span className="font-semibold text-slate-800">{currentPlan?.name}</span> plan?
              Your team will lose access to premium prompt limits, automated schedules, and deep citation analytics.
            </p>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-slate-700 block">Cancellation Timing</label>
              <div className="space-y-2">
                <label className="flex items-start space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="cancelTiming"
                    checked={!cancelImmediate}
                    onChange={() => setCancelImmediate(false)}
                    className="mt-0.5 text-blue-600"
                  />
                  <span>
                    <strong>At end of billing cycle</strong> (Recommended: keep access until{' '}
                    {formatDate(subData?.subscription?.currentPeriodEnd)})
                  </span>
                </label>
                <label className="flex items-start space-x-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="cancelTiming"
                    checked={cancelImmediate}
                    onChange={() => setCancelImmediate(true)}
                    className="mt-0.5 text-rose-600"
                  />
                  <span>
                    <strong>Immediately</strong> (instantly revert to Free tier)
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reason for canceling</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 text-slate-800 bg-white"
                >
                  <option value="Pricing / budget constraints">Pricing / budget constraints</option>
                  <option value="Temporary project completed">Temporary project completed</option>
                  <option value="Missing features">Missing features</option>
                  <option value="Switching to another tool">Switching to another tool</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelModalOpen(false)}
                disabled={canceling}
              >
                Keep Subscription
              </Button>
              <Button
                size="sm"
                onClick={handleCancelSubscription}
                disabled={canceling}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {canceling ? 'Canceling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
