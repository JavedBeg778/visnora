'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users2,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  BarChart3,
  Tag,
  Target,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface CompetitorsClientProps {
  initialCompetitors: any[];
  projects: any[];
  currentProjectId: string;
  organizationId: string;
}

export function CompetitorsClient({
  initialCompetitors,
  projects,
  currentProjectId: initialProjectId,
  organizationId,
}: CompetitorsClientProps) {
  const [competitors, setCompetitors] = useState<any[]>(initialCompetitors);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    canonicalName: '',
    domain: '',
    website: '',
    description: '',
    productsServicesText: '',
    keywordsText: '',
    aliasesText: '',
  });

  const refreshCompetitors = async (projId: string) => {
    try {
      const res = await fetch(`/api/v1/competitors?projectId=${projId}`, {
        headers: { 'x-organization-id': organizationId },
      });
      const json = await res.json();
      if (json.success) setCompetitors(json.data);
    } catch {
      // Keep existing
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedProjectId(newId);
    refreshCompetitors(newId);
  };

  const openCreateModal = () => {
    setEditingCompetitor(null);
    setFormData({
      canonicalName: '',
      domain: '',
      website: '',
      description: '',
      productsServicesText: '',
      keywordsText: '',
      aliasesText: '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (comp: any) => {
    setEditingCompetitor(comp);
    setFormData({
      canonicalName: comp.canonicalName,
      domain: comp.domain,
      website: comp.website || '',
      description: comp.description || '',
      productsServicesText: (comp.productsServices || []).join(', '),
      keywordsText: (comp.keywords || []).join(', '),
      aliasesText: (comp.aliases || []).join(', '),
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      projectId: selectedProjectId,
      canonicalName: formData.canonicalName.trim(),
      domain: formData.domain.trim(),
      website: formData.website.trim() || undefined,
      description: formData.description.trim() || undefined,
      productsServices: formData.productsServicesText
        ? formData.productsServicesText.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      keywords: formData.keywordsText
        ? formData.keywordsText.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      aliases: formData.aliasesText
        ? formData.aliasesText.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    };

    try {
      const url = editingCompetitor
        ? `/api/v1/competitors/${editingCompetitor.id}`
        : '/api/v1/competitors';
      const method = editingCompetitor ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to save competitor');
      }

      setIsModalOpen(false);
      await refreshCompetitors(selectedProjectId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (compId: string) => {
    if (!confirm('Are you sure you want to archive this competitor?')) return;
    try {
      const res = await fetch(`/api/v1/competitors/${compId}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': organizationId },
      });
      const json = await res.json();
      if (json.success) {
        await refreshCompetitors(selectedProjectId);
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions */}
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

        <div className="flex items-center space-x-2">
          <Link href="/competitors/compare">
            <Button variant="secondary" size="sm" className="flex items-center space-x-1.5">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span>Compare Share of Voice</span>
            </Button>
          </Link>
          <Button size="sm" onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Add Competitor</span>
          </Button>
        </div>
      </div>

      {/* Competitors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {competitors.map((comp) => (
          <div
            key={comp.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm">
                    {comp.canonicalName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{comp.canonicalName}</h2>
                    <span className="text-xs text-slate-500 font-medium">{comp.domain}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(comp)}>
                    <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleArchive(comp.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  </Button>
                </div>
              </div>

              {comp.description && (
                <p className="text-xs text-slate-600 mt-3 line-clamp-2">{comp.description}</p>
              )}

              {comp.productsServices && comp.productsServices.length > 0 && (
                <div className="mt-3">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Products & Services:</span>
                  <div className="flex flex-wrap gap-1">
                    {comp.productsServices.map((p: string, i: number) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {comp.keywords && comp.keywords.length > 0 && (
                <div className="mt-2.5">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Keywords:</span>
                  <div className="flex flex-wrap gap-1">
                    {comp.keywords.map((k: string, i: number) => (
                      <span key={i} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                        #{k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Added {new Date(comp.createdAt).toLocaleDateString()}</span>
              {comp.website && (
                <a
                  href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center space-x-1 font-medium"
                >
                  <span>Website</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}

        {competitors.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
            No competitors configured yet. Add competitors to evaluate your relative AI Share of Voice and mention rate.
          </div>
        )}
      </div>

      {/* Modal Dialog for Competitor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              {editingCompetitor ? 'Edit Competitor' : 'Add Competitor'}
            </h2>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Competitor Name *</label>
                <input
                  type="text"
                  required
                  value={formData.canonicalName}
                  onChange={(e) => setFormData({ ...formData, canonicalName: e.target.value })}
                  placeholder="e.g. Semrush"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Domain *</label>
                <input
                  type="text"
                  required
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="semrush.com"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Website URL</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://semrush.com"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Products & Services (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.productsServicesText}
                  onChange={(e) => setFormData({ ...formData, productsServicesText: e.target.value })}
                  placeholder="SEO Software, Competitive Intelligence, Content Marketing"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Keywords & Name Aliases (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.keywordsText}
                  onChange={(e) => setFormData({ ...formData, keywordsText: e.target.value })}
                  placeholder="semrush, sem rush, semrush.com"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading} className="bg-blue-600 text-white">
                  {loading ? 'Saving...' : 'Save Competitor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

