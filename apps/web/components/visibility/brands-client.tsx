'use client';

import React, { useState } from 'react';
import {
  Globe2,
  Plus,
  Edit2,
  Trash2,
  Check,
  Star,
  ExternalLink,
  Tag,
  Building,
  Target,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { EmptyState } from '../ui/empty-state';

interface BrandsClientProps {
  initialBrands: any[];
  projects: any[];
  currentProjectId: string;
  organizationId: string;
}

export function BrandsClient({
  initialBrands,
  projects,
  currentProjectId: initialProjectId,
  organizationId,
}: BrandsClientProps) {
  const [brands, setBrands] = useState<any[]>(initialBrands);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    canonicalName: '',
    domain: '',
    industry: '',
    country: 'IN',
    primaryLanguage: 'en',
    targetAudience: '',
    productsServicesText: '',
    brandKeywordsText: '',
    brandContext: '',
    isPrimary: false,
  });

  const refreshBrands = async (projId: string) => {
    try {
      const res = await fetch(`/api/v1/brands?projectId=${projId}`, {
        headers: { 'x-organization-id': organizationId },
      });
      const json = await res.json();
      if (json.success) setBrands(json.data);
    } catch {
      // Retain existing data
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedProjectId(newId);
    refreshBrands(newId);
  };

  const openCreateModal = () => {
    const curProj = projects.find((p) => p.id === selectedProjectId);
    setEditingBrand(null);
    setFormData({
      canonicalName: curProj?.name || '',
      domain: curProj?.primaryWebsite ? curProj.primaryWebsite.replace(/^https?:\/\//, '') : '',
      industry: curProj?.industry || '',
      country: curProj?.targetCountry || 'IN',
      primaryLanguage: curProj?.defaultLanguage || 'en',
      targetAudience: '',
      productsServicesText: '',
      brandKeywordsText: '',
      brandContext: '',
      isPrimary: brands.length === 0,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (brand: any) => {
    setEditingBrand(brand);
    setFormData({
      canonicalName: brand.canonicalName,
      domain: brand.domain,
      industry: brand.industry || '',
      country: brand.country || 'IN',
      primaryLanguage: brand.primaryLanguage || 'en',
      targetAudience: brand.targetAudience || '',
      productsServicesText: (brand.productsServices || []).join(', '),
      brandKeywordsText: (brand.brandKeywords || []).join(', '),
      brandContext: brand.brandContext || '',
      isPrimary: brand.isPrimary,
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
      industry: formData.industry.trim() || undefined,
      country: formData.country.trim() || 'IN',
      primaryLanguage: formData.primaryLanguage.trim() || 'en',
      targetAudience: formData.targetAudience.trim() || undefined,
      brandContext: formData.brandContext.trim() || undefined,
      productsServices: formData.productsServicesText
        ? formData.productsServicesText.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      brandKeywords: formData.brandKeywordsText
        ? formData.brandKeywordsText.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      isPrimary: formData.isPrimary,
    };

    try {
      const url = editingBrand ? `/api/v1/brands/${editingBrand.id}` : '/api/v1/brands';
      const method = editingBrand ? 'PATCH' : 'POST';

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
        throw new Error(json.error?.message || 'Failed to save brand');
      }

      setIsModalOpen(false);
      setSuccess(`Brand "${payload.canonicalName}" saved successfully.`);
      await refreshBrands(selectedProjectId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (brandId: string, name: string) => {
    if (!confirm(`Are you sure you want to archive brand profile "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/brands/${brandId}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': organizationId },
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(`Brand "${name}" archived.`);
        await refreshBrands(selectedProjectId);
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
            Project Container:
          </label>
          <select
            id="project-select"
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-subtle"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.primaryWebsite})
              </option>
            ))}
          </select>
        </div>

        <Button size="sm" onClick={openCreateModal} className="self-end sm:self-auto">
          <Plus className="h-4 w-4 mr-1.5" />
          <span>Add Brand Profile</span>
        </Button>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Brands List */}
      <div className="grid grid-cols-1 gap-5">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3.5">
                <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100 shadow-subtle">
                  {brand.canonicalName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-base font-bold text-slate-900">{brand.canonicalName}</h2>
                    {brand.isPrimary && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-blue-600" />
                        <span>Primary Brand</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800 font-mono">{brand.domain}</span>
                    <span>•</span>
                    <span>{brand.industry || 'General Industry'}</span>
                    <span>•</span>
                    <span>Region: {brand.country || 'IN'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <Button variant="secondary" size="sm" onClick={() => openEditModal(brand)}>
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  <span>Edit</span>
                </Button>
                {!brand.isPrimary && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleArchive(brand.id, brand.canonicalName)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Products and Services */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span>Products &amp; Solutions</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {brand.productsServices && brand.productsServices.length > 0 ? (
                  brand.productsServices.map((p: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs bg-slate-100 text-slate-800 font-semibold px-2.5 py-1 rounded-lg border border-slate-200/60"
                    >
                      {p}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No products or services specified.</span>
                )}
              </div>
            </div>

            {/* Brand Keywords */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Target className="h-3.5 w-3.5 text-slate-400" />
                <span>Brand Keywords &amp; Entity Aliases</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {brand.brandKeywords && brand.brandKeywords.length > 0 ? (
                  brand.brandKeywords.map((k: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-lg border border-blue-200/60"
                    >
                      #{k}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No brand aliases specified.</span>
                )}
              </div>
            </div>

            {/* Target Audience & Positioning */}
            {(brand.targetAudience || brand.brandContext) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                {brand.targetAudience && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-slate-800 block mb-1">Target Audience</span>
                    <p className="text-slate-600 leading-relaxed">{brand.targetAudience}</p>
                  </div>
                )}
                {brand.brandContext && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-slate-800 block mb-1">Brand Context &amp; Positioning</span>
                    <p className="text-slate-600 leading-relaxed">{brand.brandContext}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {brands.length === 0 && (
          <EmptyState
            icon={<Globe2 className="h-6 w-6" />}
            title="No brand profiles configured"
            description="Create your primary brand profile to establish official products, services, and aliases for search recognition."
            actionLabel="Add Brand Profile"
            onAction={openCreateModal}
          />
        )}
      </div>

      {/* Modal Dialog for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-modal max-w-lg w-full p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">
              {editingBrand ? 'Edit Brand Profile' : 'Configure Brand Profile'}
            </h2>
            <p className="text-xs text-slate-500">
              Specify official domain, entity aliases, and products to evaluate accurate AI mention attribution.
            </p>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 text-red-800 text-xs font-medium border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <Input
                label="Brand Name *"
                required
                value={formData.canonicalName}
                onChange={(e) => setFormData({ ...formData, canonicalName: e.target.value })}
                placeholder="e.g. Acme Cloud"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Domain *"
                  required
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="acme.com"
                />
                <Input
                  label="Industry / Vertical"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="SaaS / FinTech"
                />
              </div>

              <Input
                label="Products & Services (comma separated)"
                value={formData.productsServicesText}
                onChange={(e) => setFormData({ ...formData, productsServicesText: e.target.value })}
                placeholder="CRM, AI Search Optimization, Marketing Analytics"
                helperText="Specific offerings that generative engines should associate with your brand."
              />

              <Input
                label="Brand Keywords & Aliases (comma separated)"
                value={formData.brandKeywordsText}
                onChange={(e) => setFormData({ ...formData, brandKeywordsText: e.target.value })}
                placeholder="acme, acme analytics, acme cloud"
                helperText="Alternative names or abbreviations used to detect mentions in AI responses."
              />

              <Input
                label="Target Audience"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                placeholder="Marketing managers, SEO professionals, agencies"
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Brand Context / Positioning Brief
                </label>
                <textarea
                  rows={3}
                  value={formData.brandContext}
                  onChange={(e) => setFormData({ ...formData, brandContext: e.target.value })}
                  placeholder="Acme is a premium visibility analytics platform specializing in Generative Engine Optimization..."
                  className="block w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl shadow-subtle focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isPrimary" className="font-semibold text-slate-700">
                  Set as Primary Brand for this Project
                </label>
              </div>

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
                  Save Brand Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
