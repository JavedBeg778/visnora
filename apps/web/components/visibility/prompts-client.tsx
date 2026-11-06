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
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

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
      setMessage('Prompt created successfully.');
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
      setMessage(`Added ${selectedSuggestions.length} suggested prompt(s).`);
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
        setMessage(`Seeded ${json.data.seeded} benchmark prompts from dataset!`);
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
        setMessage(`Tracking run completed! ${json.data.summary.successCount} prompt(s) evaluated.`);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <label htmlFor="project-select" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Project:
          </label>
          <select
            id="project-select"
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSeedBenchmark}
            disabled={loading}
            className="text-xs"
          >
            <Database className="h-3.5 w-3.5 mr-1 text-slate-500" />
            <span>Load M0 Dataset</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsSuggestOpen(true);
              handleGenerateSuggestions();
            }}
            disabled={loading}
            className="text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-blue-600" />
            <span>AI Suggest Prompts</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span>Add Prompt</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleRunTracking(selectedPromptIds.length > 0 ? selectedPromptIds : undefined)}
            disabled={running || prompts.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
          >
            {running ? <RotateCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
            <span>
              {selectedPromptIds.length > 0
                ? `Run Selected (${selectedPromptIds.length})`
                : 'Run All Prompts'}
            </span>
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Prompts Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={
                      filteredPrompts.length > 0 &&
                      selectedPromptIds.length === filteredPrompts.length
                    }
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Tracked Prompt</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Model</th>
                <th className="px-4 py-3 font-semibold">Last Execution</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
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
                      isSelected ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectPrompt(p.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                      />
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900 max-w-md">
                      <span>{p.promptText}</span>
                      {p.topicTags && p.topicTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.topicTags.map((t: string, i: number) => (
                            <span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {p.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{p.targetModel}</td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {lastRun ? (
                        <span className="flex items-center space-x-1">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              lastRun.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{new Date(lastRun.executedAt).toLocaleDateString()}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRunTracking([p.id])}
                        disabled={running}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePrompt(p.id)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {filteredPrompts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-500">
                    No prompts found matching your criteria. Use &ldquo;AI Suggest Prompts&rdquo; or &ldquo;Load M0 Dataset&rdquo; to populate initial search queries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Prompt */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Add Tracked Prompt</h2>
            <form onSubmit={handleCreatePrompt} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Prompt Text *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.promptText}
                  onChange={(e) => setFormData({ ...formData, promptText: e.target.value })}
                  placeholder="e.g. Which software offers AI visibility tracking for marketing teams in India?"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Buying Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  <label className="font-semibold text-slate-700 block mb-1">Target Model</label>
                  <select
                    value={formData.targetModel}
                    onChange={(e) => setFormData({ ...formData, targetModel: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="gemini-3.8-flash">gemini-3.8-flash (Primary)</option>
                    <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Cost Saver)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cadence</label>
                  <select
                    value={formData.cadence}
                    onChange={(e) => setFormData({ ...formData, cadence: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MANUAL">Manual Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading} className="bg-blue-600 text-white">
                  {loading ? 'Adding...' : 'Add Prompt'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: AI Suggest Prompts */}
      {isSuggestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>AI Prompt Suggestions</span>
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
                  <span>Generating relevant prompt queries for your industry...</span>
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
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/40'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
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
                            <span className="font-semibold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded">
                              {item.category}
                            </span>
                            <span>•</span>
                            <span>{item.stage}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No suggestions generated yet. Click the refresh button to generate queries.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">
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
                  className="bg-blue-600 text-white"
                >
                  {loading ? 'Adding...' : `Add Selected (${selectedSuggestions.length})`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

