'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Play,
  Pause,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';

export default function ChatGPTAdsCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Creation wizard modal
  const [wizardOpen, setWizardOpen] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('CONVERSIONS');
  const [dailyBudget, setDailyBudget] = useState('50');
  const [contextTargeting, setContextTargeting] = useState('enterprise software, visibility tools');
  const [negativeContexts, setNegativeContexts] = useState('free download, coupon');
  const [financialConfirmation, setFinancialConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Resume confirmation modal
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [campaignToResume, setCampaignToResume] = useState<any | null>(null);
  const [confirmResumeChecked, setConfirmResumeChecked] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const [cRes, aRes] = await Promise.all([
        fetch('/api/v1/chatgpt-ads/campaigns'),
        fetch('/api/v1/chatgpt-ads/accounts'),
      ]);
      const cData = await cRes.json();
      const aData = await aRes.json();

      if (cData.success) setCampaigns(cData.data || []);
      if (aData.success) {
        setAccounts(aData.data || []);
        if (aData.data?.length > 0 && !accountId) {
          setAccountId(aData.data[0].id);
        }
      }
    } catch {
      setErrorMsg('Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!financialConfirmation) {
      setErrorMsg('You must check the financial confirmation before creating this campaign.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const budgetPaise = Math.round(parseFloat(dailyBudget) * 100);

    try {
      const res = await fetch('/api/v1/chatgpt-ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          name,
          objective,
          budgetAmountPaise: budgetPaise,
          budgetType: 'DAILY',
          currency: 'USD',
          contextTargeting: contextTargeting.split(',').map((s) => s.trim()).filter(Boolean),
          negativeContexts: negativeContexts.split(',').map((s) => s.trim()).filter(Boolean),
          financialConfirmation: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Campaign "${name}" created successfully in PAUSED status.`);
        setWizardOpen(false);
        setName('');
        setFinancialConfirmation(false);
        fetchCampaigns();
      } else {
        setErrorMsg(data.error?.message || 'Failed to create campaign.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Creation error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/chatgpt-ads/campaigns/${id}/pause`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Campaign paused.');
        fetchCampaigns();
      }
    } catch {
      setErrorMsg('Failed to pause campaign.');
    }
  };

  const handleConfirmResume = async () => {
    if (!campaignToResume || !confirmResumeChecked) return;

    try {
      const res = await fetch(`/api/v1/chatgpt-ads/campaigns/${campaignToResume.id}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ financialConfirmation: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Campaign "${campaignToResume.name}" activated.`);
        setResumeModalOpen(false);
        setCampaignToResume(null);
        setConfirmResumeChecked(false);
        fetchCampaigns();
      } else {
        setErrorMsg(data.error?.message || 'Failed to activate campaign.');
      }
    } catch {
      setErrorMsg('Failed to activate campaign.');
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns Orchestration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Build and optimize conversational ChatGPT ad campaigns. New campaigns strictly default to <strong>PAUSED</strong>.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setWizardOpen(true);
          }}
          disabled={accounts.length === 0}
          className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Create Campaign
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Safety Notice */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start space-x-3 text-xs text-amber-900">
        <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-950">Safety Standard: Bounded Campaign Activation</h4>
          <p className="mt-0.5 text-amber-800">
            To prevent unintended ad spend, Visnora enforces that all newly created campaigns begin in a <strong>PAUSED</strong> status. Activating campaigns requires explicit financial authorization.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAUSED">PAUSED</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredCampaigns.length === 0 && !loading ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            No campaigns found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Objective</th>
                  <th className="py-3 px-4">Daily Budget</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Ad Groups</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {camp.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          camp.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {camp.objective}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      ${(Number(camp.budgetAmountPaise || 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {camp.account?.name || 'Default'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {camp._count?.adGroups || 0}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {camp.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handlePause(camp.id)}
                          className="inline-flex items-center px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-semibold text-[11px] transition-colors"
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setCampaignToResume(camp);
                            setConfirmResumeChecked(false);
                            setResumeModalOpen(true);
                          }}
                          className="inline-flex items-center px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-semibold text-[11px] transition-colors"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Resume
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create ChatGPT Ads Campaign</h3>
              <button onClick={() => setWizardOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Account *</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.openaiAccountId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Conversational Intent Capture"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Objective *</label>
                  <select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                  >
                    <option value="CONVERSIONS">CONVERSIONS</option>
                    <option value="TRAFFIC">TRAFFIC</option>
                    <option value="BRAND_AWARENESS">BRAND_AWARENESS</option>
                    <option value="ENGAGEMENT">ENGAGEMENT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Daily Budget (USD) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Context Hints & Conversational Targeting
                </label>
                <input
                  type="text"
                  placeholder="Comma separated topics, e.g. enterprise software, visibility tools"
                  value={contextTargeting}
                  onChange={(e) => setContextTargeting(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Negative Context Exclusions
                </label>
                <input
                  type="text"
                  placeholder="Comma separated exclusions, e.g. free, cracked, student"
                  value={negativeContexts}
                  onChange={(e) => setNegativeContexts(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              {/* Mandatory financial confirmation */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={financialConfirmation}
                    onChange={(e) => setFinancialConfirmation(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span>
                    I authorize campaign creation. I understand the campaign will be created in a <strong>PAUSED</strong> status and will not incur ad spend until explicitly activated.
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !financialConfirmation}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Campaign (PAUSED)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resume Confirmation Modal */}
      {resumeModalOpen && campaignToResume && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span>Confirm Campaign Activation</span>
            </h3>
            <p className="text-xs text-slate-600">
              You are about to activate campaign <strong>&ldquo;{campaignToResume.name}&rdquo;</strong> with a daily budget of <strong>${(Number(campaignToResume.budgetAmountPaise || 0) / 100).toFixed(2)}</strong>. This will enable real conversational ad serving and incur advertising spend on your OpenAI Ads account.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={confirmResumeChecked}
                  onChange={(e) => setConfirmResumeChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span>
                  I confirm that I want to activate this campaign and authorize conversational ad spend.
                </span>
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setResumeModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResume}
                disabled={!confirmResumeChecked}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
              >
                Activate Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

