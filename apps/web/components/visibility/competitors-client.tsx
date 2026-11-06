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
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { EmptyState } from '../ui/empty-state';

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
  const [success, setSuccess] = useState<string | null>(null);

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
    setSuccess(null);

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
      setSuccess(`Competitor "${payload.canonicalName}" saved successfully.`);
      await refreshCompetitors(selectedProjectId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (compId: string, name: string) => {
    if (!confirm(`Are you sure you want to archive competitor "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/competitors/${compId}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': organizationId },
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(`Competitor "${name}" archived.`);
        await refreshCompetitors(selectedProjectId);
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

        <div className="flex items-center space-x-2.5 self-end sm:self-auto">
          <Link href="/competitors/compare">
            <Button variant="secondary" size="sm">
              <BarChart3 className="h-4 w-4 mr-1.5 text-blue-600" />
              <span>Compare Share of Voice</span>
            </Button>
          </Link>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Add Competitor</span>
          </Button>
        </div>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Competitors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {competitors.map((comp) => (
          <div
            key={comp.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-100 shadow-subtle">
                    {comp.canonicalName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{comp.canonicalName}</h2>
                    <span className="text-xs text-slate-500 font-mono font-medium">{comp.domain}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(comp)}>
                    <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchive(comp.id, comp.canonicalName)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  </Button>
                </div>
              </div>

              {comp.description && (
                <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">{comp.description}</p>
              )}

              {comp.productsServices && comp.productsServices.length > 0 && (
                <div className="mt-3.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Products & Services:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {comp.productsServices.map((p: string, i: number) => (
                      <span
                        key={i}
                        className="text-[11px] bg-slate-100 text-slate-800 font-medium px-2 py-0.5 rounded-md"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {comp.keywords && comp.keywords.length > 0 && (
                <div className="mt-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Recognized Aliases:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {comp.keywords.map((k: string, i: number) => (
                      <span
                        key={i}
                        className="text-[11px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md border border-indigo-100"
                      >
                        #{k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3.5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Added {new Date(comp.createdAt).toLocaleDateString()}</span>
              {comp.website && (
                <a
                  href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center space-x-1 font-semibold"
                >
                  <span>Website</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}

        {competitors.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={<Users2 className="h-6 w-6" />}
              title="No competitors configured"
              description="Add industry competitors to benchmark your relative AI Share of Voice and mention frequency in search responses."
              actionLabel="Add First Competitor"
              onAction={openCreateModal}
            />
          </div>
        )}
      </div>

      {/* Modal Dialog for Competitor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-modal max-w-md w-full p-6 sm:p-8 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              {editingCompetitor ? 'Edit Competitor' : 'Add Competitor Profile'}
            </h2>
            <p className="text-xs text-slate-500">
              Configure competitor domain and product aliases to detect their presence in generative outputs.
            </p>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 text-red-800 text-xs font-medium border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <Input
                label="Competitor Brand Name *"
                required
                value={formData.canonicalName}
                onChange={(e) => setFormData({ ...formData, canonicalName: e.target.value })}
                placeholder="e.g. Semrush, HubSpot"
              />

              <Input
                label="Competitor Domain *"
                required
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="semrush.com"
              />

              <Input
                label="Website URL"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://semrush.com"
              />

              <Input
                label="Products & Services (comma separated)"
                value={formData.productsServicesText}
                onChange={(e) => setFormData({ ...formData, productsServicesText: e.target.value })}
                placeholder="SEO Software, Content Marketing, Backlink Audit"
              />

              <Input
                label="Keywords & Name Aliases (comma separated)"
                value={formData.keywordsText}
                onChange={(e) => setFormData({ ...formData, keywordsText: e.target.value })}
                placeholder="semrush, sem rush, semrush.com"
              />

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={loading}>
                  Save Competitor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
