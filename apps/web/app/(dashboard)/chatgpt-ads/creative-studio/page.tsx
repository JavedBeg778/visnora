'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  ExternalLink,
  Plus,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Eye,
} from 'lucide-react';

export default function ChatGPTAdsCreativeStudioPage() {
  const [adGroups, setAdGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Creative form
  const [adGroupId, setAdGroupId] = useState('');
  const [name, setName] = useState('Conversational Intent Ad');
  const [headline, setHeadline] = useState('Visnora — AI Search Visibility Leader');
  const [adCopy, setAdCopy] = useState(
    'Discover what ChatGPT and Gemini say about your brand. Track 10+ prompts, monitor competitors, and optimize your presence.'
  );
  const [advertiserName, setAdvertiserName] = useState('Visnora Inc.');
  const [destinationUrl, setDestinationUrl] = useState('https://visnora.vercel.app');
  const [callToAction, setCallToAction] = useState('Start Free Trial');

  // AI Suggestions Drawer
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [brandName, setBrandName] = useState('Visnora');
  const [productDescription, setProductDescription] = useState(
    'AI Visibility SaaS that analyzes brand citations and recommendations across ChatGPT and Gemini.'
  );
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/chatgpt-ads/ad-groups')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          setAdGroups(data.data);
          setAdGroupId(data.data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateAi = async () => {
    setGeneratingAi(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/chatgpt-ads/creatives/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          productDescription,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiSuggestions(data.data.suggestions || []);
      } else {
        setErrorMsg(data.error?.message || 'Failed to generate AI suggestions.');
      }
    } catch {
      setErrorMsg('Error generating creative suggestions.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleApplyVariation = (v: any) => {
    setHeadline(v.headline);
    setAdCopy(v.adCopy);
    if (v.callToAction) setCallToAction(v.callToAction);
    setAiModalOpen(false);
    setSuccessMsg(`Applied "${v.variant}" copy variation.`);
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adGroupId) {
      setErrorMsg('Please select or create an Ad Group first.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const selectedAg = adGroups.find((ag) => ag.id === adGroupId);

    try {
      const res = await fetch('/api/v1/chatgpt-ads/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adGroupId,
          accountId: selectedAg?.accountId || selectedAg?.campaign?.accountId,
          name,
          headline,
          adCopy,
          advertiserName,
          destinationUrl,
          landingPageUrl: destinationUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Ad "${name}" created successfully with default PAUSED status.`);
      } else {
        setErrorMsg(data.error?.message || 'Failed to create ad.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Creation error.');
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
            <h1 className="text-2xl font-bold text-slate-900">Creative Studio & In-Thread Preview</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
              Interactive Simulation
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Author conversational ad units and preview exactly how they appear natively inside ChatGPT response dialogues.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setAiModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          AI Creative Suggestions
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

      {/* Main Studio Grid: Form (Left) & ChatGPT Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>Creative Parameters</span>
            <span className="text-[11px] font-medium text-slate-400">Strictly Defaults PAUSED</span>
          </h2>

          <form onSubmit={handleCreateAd} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Ad Group *</label>
              <select
                value={adGroupId}
                onChange={(e) => setAdGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
              >
                {adGroups.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.campaign?.name || 'Campaign'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Internal Ad Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Advertiser Brand Name *</label>
              <input
                type="text"
                required
                value={advertiserName}
                onChange={(e) => setAdvertiserName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Headline (Max 60 chars) *</label>
              <input
                type="text"
                maxLength={60}
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium"
              />
              <span className="text-[10px] text-slate-400 float-right mt-0.5">{headline.length}/60</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Conversational Ad Copy *</label>
              <textarea
                rows={3}
                required
                value={adCopy}
                onChange={(e) => setAdCopy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Keep copy helpful, authentic, and naturally conversational.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Call To Action</label>
                <select
                  value={callToAction}
                  onChange={(e) => setCallToAction(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 bg-white"
                >
                  <option value="Start Free Trial">Start Free Trial</option>
                  <option value="Learn More">Learn More</option>
                  <option value="Explore Live Demo">Explore Live Demo</option>
                  <option value="Calculate ROI">Calculate ROI</option>
                  <option value="Sign Up Free">Sign Up Free</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Destination URL *</label>
                <input
                  type="url"
                  required
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving Creative...' : 'Save & Register Creative'}
              </button>
            </div>
          </form>
        </div>

        {/* ChatGPT In-Thread Conversational Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Simulated ChatGPT In-Thread Result</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Desktop & Mobile View</span>
            </div>

            {/* ChatGPT Dialogue Shell */}
            <div className="bg-slate-100/70 p-6 rounded-2xl space-y-6 font-sans">
              {/* User Bubble */}
              <div className="flex items-start space-x-3 justify-end">
                <div className="bg-slate-200/80 px-4 py-2.5 rounded-2xl rounded-tr-none text-xs text-slate-800 max-w-sm">
                  What are the top software solutions for measuring AI visibility and brand citations?
                </div>
                <div className="h-7 w-7 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 text-xs font-bold">
                  U
                </div>
              </div>

              {/* ChatGPT Response with Sponsored Card */}
              <div className="flex items-start space-x-3">
                <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="space-y-3.5 flex-1 max-w-xl">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Based on market benchmarks, modern brands monitor their presence across generative AI engines using automated visibility telemetry. Here is a highly recommended solution:
                  </p>

                  {/* SPONSORED IN-THREAD AD CARD */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5 hover:border-emerald-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="h-5 w-5 rounded bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {advertiserName.charAt(0) || 'V'}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{advertiserName}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        Sponsored
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 hover:text-emerald-700 transition-colors">
                        {headline}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{adCopy}</p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400 truncate max-w-[200px]">
                        {destinationUrl.replace(/^https?:\/\//, '')}
                      </span>
                      <a
                        href={destinationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-3 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <span>{callToAction}</span>
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    Would you like to compare Visnora against other visibility tracking alternatives?
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Creative Suggestions Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <span>AI Conversational Ad Variations</span>
              </h3>
              <button onClick={() => setAiModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Objective</label>
                  <input
                    type="text"
                    disabled
                    value="Conversational Lead & Conversion Acquisition"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Description</label>
                <textarea
                  rows={2}
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={generatingAi}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {generatingAi ? 'Generating Ideas...' : 'Generate 3 Variations'}
                </button>
              </div>
            </div>

            {aiSuggestions.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Generated Variations
                </h4>
                {aiSuggestions.map((v, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {v.variant}
                      </span>
                      <button
                        onClick={() => handleApplyVariation(v)}
                        className="inline-flex items-center text-xs font-bold text-emerald-700 hover:underline"
                      >
                        <span>Use this variation</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </button>
                    </div>

                    <h5 className="text-xs font-bold text-slate-900">{v.headline}</h5>
                    <p className="text-xs text-slate-600">{v.adCopy}</p>
                    <div className="text-[11px] text-slate-400 italic">
                      Rationale: {v.rationale}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

