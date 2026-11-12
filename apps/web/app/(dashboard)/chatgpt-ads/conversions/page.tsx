'use client';

import React, { useState, useEffect } from 'react';
import {
  Target,
  Code2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Send,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function ChatGPTAdsConversionsPage() {
  const [pixelSnippet, setPixelSnippet] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Test event modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEventName, setTestEventName] = useState('PURCHASE');
  const [testValue, setTestValue] = useState('99.00');
  const [testEmail, setTestEmail] = useState('customer@example.com');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pixRes, evtRes] = await Promise.all([
        fetch('/api/v1/chatgpt-ads/conversions/pixel'),
        fetch('/api/v1/chatgpt-ads/conversions?limit=30'),
      ]);

      const pixData = await pixRes.json();
      const evtData = await evtRes.json();

      if (pixData.success) setPixelSnippet(pixData.data.snippet);
      if (evtData.success) setEvents(evtData.data || []);
    } catch {
      setErrorMsg('Failed to load conversion tracking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(pixelSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTestEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const valuePaise = Math.round(parseFloat(testValue || '0') * 100);

    try {
      const res = await fetch('/api/v1/chatgpt-ads/conversions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: testEventName,
          valuePaise,
          userEmail: testEmail,
          eventSource: 'SERVER',
          currency: 'USD',
          metadata: { orderId: `TEST_${Date.now()}` },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Test event dispatched. Status: ${data.data.status} (Dedup ID: ${data.data.deduplicationId.slice(0, 12)}...)`);
        setTestModalOpen(false);
        fetchData();
      } else {
        setErrorMsg(data.error?.message || 'Failed to dispatch test conversion.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">Conversion Tracking & Conversions API (CAPI)</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
              SHA-256 Deduplicated
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Capture attribution signals across web Measurement Pixel and server-to-server Conversions API.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setSuccessMsg(null);
            setTestModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Send className="h-4 w-4 mr-1.5" />
          Send Test Event
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

      {/* Two Column Setup: Pixel Snippet (Left) & CAPI Setup (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pixel Snippet */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Code2 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Visnora Measurement Pixel</h2>
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? 'Copied' : 'Copy Code'}
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Embed this lightweight JavaScript snippet in the <code>&lt;head&gt;</code> tag of your website. It automatically records page views and provides conversational conversion helpers.
          </p>

          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-[11px] overflow-x-auto font-mono">
            {pixelSnippet || '<!-- Loading pixel snippet... -->'}
          </pre>

          <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <strong>Client Event Helper:</strong><br />
            <code>visnoraAds(&apos;track&apos;, &apos;Purchase&apos;, &#123; value: 99.00, currency: &apos;USD&apos; &#125;);</code>
          </div>
        </div>

        {/* Server-Side CAPI */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Conversions API (CAPI) Integration</h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Deliver mission-critical server-side transactions (purchases, subscriptions, CRM leads) directly to Visnora&apos;s CAPI gateway with zero ad-blocker dropoff.
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-700">HTTP Endpoint:</span>
              <code className="text-emerald-700 font-mono text-[11px]">POST /api/v1/chatgpt-ads/conversions</code>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-700">Deduplication:</span>
              <span className="text-slate-600">Automatic 48-Hour Hash Window</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-700">Identifier Privacy:</span>
              <span className="text-slate-600">Normalized SHA-256 Hashing</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-[11px] text-blue-900">
            Events sent via both Pixel and Server are automatically deduplicated using the order ID or transaction timestamp.
          </div>
        </div>
      </div>

      {/* Conversion Event Diagnostics Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Conversion Telemetry & Event Log</h2>
            <p className="text-xs text-slate-500">Live stream of ingested and dispatched conversion events.</p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </button>
        </div>

        {events.length === 0 && !loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No conversion events received yet. Click <strong>Send Test Event</strong> to verify your pipeline.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Event Name</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Value</th>
                  <th className="py-2.5 px-3">Deduplication ID</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900">{evt.eventName}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {evt.eventSource}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {evt.value !== null ? `$${evt.value.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {evt.deduplicationId?.slice(0, 16)}...
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          evt.status === 'SENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : evt.status === 'DEDUPLICATED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(evt.eventTimestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Test Event Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Send Test Conversion Event</h3>
              <button onClick={() => setTestModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleSendTestEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Name *</label>
                <select
                  value={testEventName}
                  onChange={(e) => setTestEventName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                >
                  <option value="PURCHASE">PURCHASE</option>
                  <option value="SIGN_UP">SIGN_UP</option>
                  <option value="LEAD">LEAD</option>
                  <option value="PAGE_VIEW">PAGE_VIEW</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Conversion Value (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Email (Will be hashed)</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-xl text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Dispatching...' : 'Dispatch Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

