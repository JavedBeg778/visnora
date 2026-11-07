'use client';

import React, { useState } from 'react';
import {
  TerminalSquare,
  Plus,
  Sparkles,
  Play,
  RotateCw,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  Clock,
  Check,
  ChevronRight,
  Database,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { EmptyState } from '../ui/empty-state';

const CATEGORIES = [
  'All Categories',
  'Brand Discovery',
  'Product Discovery',
  'Service Discovery',
  'Recommendation Queries',
  'Comparison Queries',
  'Technical / Feature Queries',
  'Pricing & Value Queries',
  'Industry / Sector Queries',
  'Troubleshooting / Alternative Queries',
];

interface PromptsClientProps {
  initialPrompts: any[];
  promptGroups: any[];
  projects: any[];
  currentProjectId: string;
  organizationId: string;
}

export function PromptsClient({
  initialPrompts,
  promptGroups,
  projects,
  currentProjectId: initialProjectId,
  organizationId,
}: PromptsClientProps) {
  const [prompts, setPrompts] = useState<any[]>(initialPrompts);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Create Form State
  const [formData, setFormData] = useState({
    promptText: '',
    category: 'Brand Discovery',
    stage: 'CONSIDERATION',
    targetModel: 'gemini-3.8-flash',
    targetProvider: 'google-gemini',
    targetLocale: 'en-IN',
    cadence: 'DAILY',
  });

  const refreshPrompts = async (projId: string) => {
    try {
      const res = await fetch(`/api/v1/prompts?projectId=${projId}`, {
        headers: { 'x-organization-id': organizationId },
      });
      const json = await res.json();
      if (json.success) setPrompts(json.data);
    } catch {
      // Keep existing
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedProjectId(newId);
    setSelectedPromptIds([]);
    refreshPrompts(newId);
  };

  const filteredPrompts = prompts.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All Categories' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery || p.promptText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          ...formData,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to create prompt');
      setIsCreateOpen(false);
      setFormData({
        promptText: '',
        category: 'Brand Discovery',
        stage: 'CONSIDERATION',
        targetModel: 'gemini-3.8-flash',
        targetProvider: 'google-gemini',
        targetLocale: 'en-IN',
        cadence: 'DAILY',
      });
      await refreshPrompts(selectedProjectId);
      setMessage('Prompt successfully added to tracking catalog.');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    setSuggestLoading(true);
    setSuggestions([]);
    setSelectedSuggestions([]);
    try {
      const res = await fetch('/api/v1/prompts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          count: 8,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuggestions(json.data);
        setSelectedSuggestions(json.data.map((_: any, idx: number) => idx));
      }
    } catch {
      // Handle error
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleAddSuggestions = async () => {
    setLoading(true);
    try {
      for (const idx of selectedSuggestions) {
        const item = suggestions[idx];
        await fetch('/api/v1/prompts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': organizationId,
          },
          body: JSON.stringify({
            projectId: selectedProjectId,
            promptText: item.promptText,
            category: item.category,
            stage: item.stage,
            topicTags: item.topicTags,
            targetProvider: 'google-gemini',
            targetModel: 'gemini-3.8-flash',
            targetLocale: 'en-IN',
            cadence: 'DAILY',
          }),
        });
      }
      setIsSuggestOpen(false);
      await refreshPrompts(selectedProjectId);
      setMessage(`Added ${selectedSuggestions.length} AI-suggested prompt query(s).`);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedBenchmark = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/prompts/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          count: 10,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await refreshPrompts(selectedProjectId);
        setMessage(`Seeded ${json.data.seeded} benchmark search prompts!`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunTracking = async (promptIdsToRun?: string[]) => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/tracking/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          promptIds: promptIdsToRun && promptIdsToRun.length > 0 ? promptIdsToRun : undefined,
          provider: 'google-gemini',
          model: 'gemini-3.8-flash',
          enableGrounding: false,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const totalPrompts = json.data.promptCount || json.data.summary?.totalPrompts || (promptIdsToRun ? promptIdsToRun.length : 10);
        setMessage(`Tracking analysis initiated! Evaluating ${totalPrompts} prompt query sample(s) in background.`);
        await refreshPrompts(selectedProjectId);
      } else {
        setMessage(`Notice: ${json.error?.message || 'Run incomplete'}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to archive this prompt?')) return;
    try {
      await fetch(`/api/v1/prompts/${id}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': organizationId },
      });
      await refreshPrompts(selectedProjectId);
    } catch {
      // Ignore
    }
  };

  const toggleSelectPrompt = (id: string) => {
    setSelectedPromptIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPromptIds.length === filteredPrompts.length) {
      setSelectedPromptIds([]);
    } else {
      setSelectedPromptIds(filteredPrompts.map((p) => p.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <label htmlFor="project-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Project:
          </label>
          <select
            id="project-select"
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-subtle"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSeedBenchmark}
            disabled={loading}
          >
            <Database className="h-4 w-4 mr-1.5 text-slate-500" />
            <span>Load Dataset</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsSuggestOpen(true);
              handleGenerateSuggestions();
            }}
            disabled={loading}
          >
            <Sparkles className="h-4 w-4 mr-1.5 text-blue-600" />
            <span>AI Suggest</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Add Prompt</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleRunTracking(selectedPromptIds.length > 0 ? selectedPromptIds : undefined)}
            disabled={running || prompts.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {running ? (
              <RotateCw className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1.5" />
            )}
            <span>
              {selectedPromptIds.length > 0
                ? `Run Selected (${selectedPromptIds.length})`
                : 'Run All Prompts'}
            </span>
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-medium text-blue-800 flex items-center space-x-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-subtle">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 ml-1" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search prompt queries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-subtle"
          />
        </div>
      </div>

      {/* Prompts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredPrompts.length > 0 &&
                      selectedPromptIds.length === filteredPrompts.length
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-5 py-3.5 font-bold">Tracked Search Query</th>
                <th className="px-5 py-3.5 font-bold">Category</th>
                <th className="px-5 py-3.5 font-bold">Buying Stage</th>
                <th className="px-5 py-3.5 font-bold">Target Model</th>
                <th className="px-5 py-3.5 font-bold">Last Run</th>
                <th className="px-5 py-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPrompts.map((p) => {
                const isSelected = selectedPromptIds.includes(p.id);
                const lastRun = p.runs && p.runs[0];
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectPrompt(p.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900 max-w-md">
                      <span className="leading-snug">{p.promptText}</span>
                      {p.topicTags && p.topicTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.topicTags.map((t: string, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                        {p.stage}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-700">{p.targetModel}</td>
                    <td className="px-5 py-4 text-slate-500">
                      {lastRun ? (
                        <span className="flex items-center space-x-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              lastRun.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{new Date(lastRun.executedAt).toLocaleDateString()}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Never</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRunTracking([p.id])}
                        disabled={running}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePrompt(p.id)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {filteredPrompts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400">
                    No prompts found matching your criteria. Use &ldquo;AI Suggest&rdquo; or &ldquo;Load Dataset&rdquo; to populate initial search queries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Prompt */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-modal max-w-md w-full p-6 sm:p-8 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Add Tracked Search Prompt</h2>
            <p className="text-xs text-slate-500">
              Input a realistic query that prospective customers type into AI search engines.
            </p>

            <form onSubmit={handleCreatePrompt} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Prompt Query *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.promptText}
                  onChange={(e) => setFormData({ ...formData, promptText: e.target.value })}
                  placeholder="e.g. Which platforms offer AI visibility tracking for marketing teams in India?"
                  className="block w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl shadow-subtle focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-subtle"
                  >
                    {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Buying Stage
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-subtle"
                  >
                    <option value="AWARENESS">AWARENESS</option>
                    <option value="CONSIDERATION">CONSIDERATION</option>
                    <option value="DECISION">DECISION</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Target Model
                  </label>
                  <select
                    value={formData.targetModel}
                    onChange={(e) => setFormData({ ...formData, targetModel: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-subtle"
                  >
                    <option value="gemini-3.8-flash">gemini-3.8-flash (Primary)</option>
                    <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Cost Saver)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Cadence
                  </label>
                  <select
                    value={formData.cadence}
                    onChange={(e) => setFormData({ ...formData, cadence: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-subtle"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MANUAL">Manual Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={loading}>
                  Add Prompt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: AI Suggest Prompts */}
      {isSuggestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-modal max-w-lg w-full p-6 sm:p-8 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>AI Prompt Generation</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Realistic, categorized search queries generated from your brand identity & context.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGenerateSuggestions}
                disabled={suggestLoading}
              >
                <RotateCw className={`h-3.5 w-3.5 ${suggestLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {suggestLoading ? (
                <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center">
                  <RotateCw className="h-6 w-6 animate-spin text-blue-600 mb-2" />
                  <span>Analyzing brand context and crafting high-intent search queries...</span>
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((item, idx) => {
                  const isChecked = selectedSuggestions.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() =>
                        setSelectedSuggestions((prev) =>
                          prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                        )
                      }
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/50 shadow-subtle ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 mt-0.5"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 leading-snug">
                            {item.promptText}
                          </p>
                          <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-slate-500">
                            <span className="font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                              {item.category}
                            </span>
                            <span>•</span>
                            <span className="font-medium text-slate-600">{item.stage}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No suggestions generated yet. Click the refresh button to trigger queries.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-semibold">
                {selectedSuggestions.length} of {suggestions.length} selected
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsSuggestOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddSuggestions}
                  disabled={loading || selectedSuggestions.length === 0}
                  isLoading={loading}
                >
                  Add Selected ({selectedSuggestions.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
