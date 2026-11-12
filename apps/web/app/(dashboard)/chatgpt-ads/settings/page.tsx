'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  KeyRound,
  ShieldCheck,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ExternalLink,
} from 'lucide-react';

export default function ChatGPTAdsSettingsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [rotateModalOpen, setRotateModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [openaiAccountId, setOpenaiAccountId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Key rotation state
  const [newApiKey, setNewApiKey] = useState('');

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/chatgpt-ads/accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data || []);
      }
    } catch {
      setErrorMessage('Failed to load accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/v1/chatgpt-ads/accounts/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          openaiAccountId,
          apiKey,
          currency,
          timezone,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('OpenAI Ads advertiser account connected successfully.');
        setConnectModalOpen(false);
        setName('');
        setOpenaiAccountId('');
        setApiKey('');
        fetchAccounts();
      } else {
        setErrorMessage(data.error?.message || 'Failed to connect account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRotateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !newApiKey) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/chatgpt-ads/accounts/${selectedAccountId}/rotate-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newApiKey }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('API key successfully rotated and verified.');
        setRotateModalOpen(false);
        setNewApiKey('');
        fetchAccounts();
      } else {
        setErrorMessage(data.error?.message || 'Key rotation failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Key rotation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account? Live campaign synchronizations will be stopped.')) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/chatgpt-ads/accounts/${accountId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Account disconnected successfully.');
        fetchAccounts();
      } else {
        setErrorMessage(data.error?.message || 'Failed to disconnect account.');
      }
    } catch {
      setErrorMessage('Disconnect action failed.');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">ChatGPT Ads Account Settings</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
              AES-256 Vault Protected
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your connected OpenAI Ads advertiser credentials, API keys, and synchronization policies.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMessage(null);
            setConnectModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Connect New Account
        </button>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex items-start space-x-2">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Security & Credentials Architecture Info Banner */}
      <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl flex items-start space-x-3 text-xs text-blue-900">
        <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-blue-950 text-sm">Enterprise Credential Vaulting Standards</h3>
          <p>
            Visnora stores OpenAI Ads API keys using hardware-grade AES-256-GCM authenticated encryption with unique initialization vectors. Plaintext keys are never stored, logged, or exposed in client responses.
          </p>
          <p className="text-blue-700 pt-1">
            Official Developer Documentation: <a href="https://developers.openai.com/ads/" target="_blank" rel="noreferrer" className="underline font-semibold inline-flex items-center">OpenAI Ads API Reference <ExternalLink className="h-3 w-3 ml-1" /></a>
          </p>
        </div>
      </div>

      {/* Connected Accounts List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Connected Advertiser Accounts</h2>
            <p className="text-xs text-slate-500">Authorized OpenAI Ads accounts linked to your Visnora organization.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600">
            {accounts.length} Account(s)
          </span>
        </div>

        {accounts.length === 0 && !loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No accounts connected yet. Click <strong>Connect New Account</strong> above to authenticate your OpenAI Ads account.
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{acc.name}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        acc.status === 'CONNECTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : acc.status === 'ERROR'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {acc.status}
                    </span>
                    {acc.reviewStatus && (
                      <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                        {acc.reviewStatus}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Account ID: <strong className="text-slate-700">{acc.openaiAccountId}</strong></span>
                    <span>Currency: <strong className="text-slate-700">{acc.currency}</strong></span>
                    <span>Timezone: <strong className="text-slate-700">{acc.timezone}</strong></span>
                    <span>Vaulted Key: <code className="bg-white px-1.5 py-0.5 border border-slate-200 rounded text-slate-700">{acc.maskedKey || 'Encrypted'}</code></span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Last Synced: {acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleString() : 'Never'}
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-center">
                  <button
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setRotateModalOpen(true);
                    }}
                    className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg shadow-sm transition-colors"
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1" />
                    Rotate Key
                  </button>
                  <button
                    onClick={() => handleDisconnect(acc.id)}
                    className="inline-flex items-center px-3 py-1.5 bg-white border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg shadow-sm transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect Account Modal */}
      {connectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Bot className="h-5 w-5 text-emerald-600" />
                <span>Connect OpenAI Ads Account</span>
              </h3>
              <button
                onClick={() => setConnectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Friendly Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Visnora Production Ads"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  OpenAI Advertiser Account ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="act_12345678"
                  value={openaiAccountId}
                  onChange={(e) => setOpenaiAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Found in your OpenAI Ads Developer dashboard.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Advertiser API Key *
                </label>
                <input
                  type="password"
                  required
                  placeholder="oa_ads_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Protected with AES-256-GCM. Never enter consumer ChatGPT Plus/Pro session keys.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Verifying & Vaulting...' : 'Connect & Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rotate Key Modal */}
      {rotateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Rotate OpenAI Ads API Key</h3>
            <p className="text-xs text-slate-500">
              Provide a newly issued API key. The existing credential will be automatically revoked.
            </p>

            <form onSubmit={handleRotateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New API Key *
                </label>
                <input
                  type="password"
                  required
                  placeholder="oa_ads_..."
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRotateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Rotating...' : 'Rotate & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

