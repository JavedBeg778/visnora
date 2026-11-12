'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Tag,
  DollarSign,
  Search,
} from 'lucide-react';

export default function ChatGPTAdsAdGroupsPage() {
  const [adGroups, setAdGroups] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form
  const [campaignId, setCampaignId] = useState('');
  const [name, setName] = useState('');
  const [bidAmount, setBidAmount] = useState('1.50');
  const [contextHintsInput, setContextHintsInput] = useState('enterprise seo, ai search visibility');
  const [bidStrategy, setBidStrategy] = useState('MAXIMIZE_CLICKS');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agRes, cRes] = await Promise.all([
        fetch('/api/v1/chatgpt-ads/ad-groups'),
        fetch('/api/v1/chatgpt-ads/campaigns'),
      ]);
      const agData = await agRes.json();
      const cData = await cRes.json();

      if (agData.success) setAdGroups(agData.data || []);
      if (cData.success) {
        setCampaigns(cData.data || []);
        if (cData.data?.length > 0 && !campaignId) {
          setCampaignId(cData.data[0].id);
        }
      }
    } catch {
      setErrorMsg('Failed to load ad groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAdGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !name) return;

    setSubmitting(true);
    setErrorMsg(null);

    const selectedCamp = campaigns.find((c) => c.id === campaignId);
    if (!selectedCamp) {
      setErrorMsg('Invalid campaign selected.');
      setSubmitting(false);
      return;
    }

    const bidPaise = Math.round(parseFloat(bidAmount || '1') * 100);
    const hints = contextHintsInput.split(',').map((s) => s.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/v1/chatgpt-ads/ad-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          accountId: selectedCamp.accountId,
          name,
          bidAmountPaise: bidPaise,
          contextHints: hints,
          bidStrategy,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Ad group "${name}" created.`);
        setModalOpen(false);
        setName('');
        fetchData();
      } else {
        setErrorMsg(data.error?.message || 'Failed to create ad group.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = adGroups.filter((ag) =>
    search ? ag.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ad Groups & Context Hints</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure conversational context hints, bids, and target audience segments for ChatGPT prompt sessions.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setModalOpen(true);
          }}
          disabled={campaigns.length === 0}
          className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Create Ad Group
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

      {/* Context Hints Guidance Card */}
      <div className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-2xl flex items-start space-x-3 text-xs text-emerald-950">
        <HelpCircle className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-emerald-900 text-sm">How Context Hints Work in ChatGPT Ads</h4>
          <p>
            Unlike traditional keyword matching, ChatGPT Ads utilizes semantic context hints to identify conversational moments when users ask exploratory, evaluative, or solution-seeking questions.
          </p>
          <p className="text-emerald-800 pt-0.5">
            Example: Supplying hints like <code>&ldquo;best food delivery app&rdquo;</code> or <code>&ldquo;compare dining options&rdquo;</code> triggers sponsored cards when ChatGPT generates relevant comparative responses.
          </p>
        </div>
      </div>

      {/* Ad Groups List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ad groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg self-start sm:self-auto">
            {filtered.length} Ad Group(s)
          </span>
        </div>

        {filtered.length === 0 && !loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No ad groups found. Create an ad group under an active campaign to start serving ads.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((ag) => (
              <div
                key={ag.id}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900">{ag.name}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        ag.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ag.status}
                    </span>
                    <span className="text-[11px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      Campaign: <strong>{ag.campaign?.name || 'Unknown'}</strong>
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 font-semibold">
                    Bid: ${ag.bidAmountPaise ? (Number(ag.bidAmountPaise) / 100).toFixed(2) : 'Auto'}
                  </div>
                </div>

                {/* Context Hints Tags */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Tag className="h-3 w-3" />
                    <span>Configured Context Hints ({ag.contextHints?.length || 0})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ag.contextHints?.length > 0 ? (
                      ag.contextHints.map((hint: string, i: number) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-2xs"
                        >
                          {hint}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No context hints set</span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>Strategy: {ag.bidStrategy}</span>
                  <span>{ag.ads?.length || 0} Creative(s) Linked</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Ad Group Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Ad Group</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Parent Campaign *</label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ad Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise AI Search Intent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max CPC Bid (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bid Strategy</label>
                  <select
                    value={bidStrategy}
                    onChange={(e) => setBidStrategy(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                  >
                    <option value="MAXIMIZE_CLICKS">MAXIMIZE_CLICKS</option>
                    <option value="TARGET_CPA">TARGET_CPA</option>
                    <option value="MANUAL_CPC">MANUAL_CPC</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Context Hints</label>
                <input
                  type="text"
                  placeholder="Comma separated topics or user intent queries"
                  value={contextHintsInput}
                  onChange={(e) => setContextHintsInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Topics matched against conversational ChatGPT user prompts.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Ad Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

