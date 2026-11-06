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
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

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
      // Keep existing
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
      await refreshBrands(selectedProjectId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (brandId: string) => {
    if (!confirm('Are you sure you want to archive this brand profile?')) return;
    try {
      const res = await fetch(`/api/v1/brands/${brandId}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': organizationId },
      });
      const json = await res.json();
      if (json.success) {
        await refreshBrands(selectedProjectId);
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
            Project Container:
          </label>
          <select
            id="project-select"
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.primaryWebsite})
              </option>
            ))}
          </select>
        </div>

        <Button size="sm" onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          <span>Add Brand Profile</span>
        </Button>
      </div>

      {/* Brands List */}
      <div className="grid grid-cols-1 gap-5">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-slate-300 transition-all space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                  {brand.canonicalName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-900">{brand.canonicalName}</h2>
                    {brand.isPrimary && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-blue-600" />
                        <span>Primary Brand</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{brand.domain}</span>
                    <span>•</span>
                    <span>{brand.industry || 'General Industry'}</span>
                    <span>•</span>
                    <span>{brand.country || 'IN'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="secondary" size="sm" onClick={() => openEditModal(brand)}>
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  <span>Edit</span>
                </Button>
                {!brand.isPrimary && (
                  <Button variant="danger" size="sm" onClick={() => handleArchive(brand.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Products and Services */}
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center space-x-1.5">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span>Products & Services:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {brand.productsServices && brand.productsServices.length > 0 ? (
                  brand.productsServices.map((p: string, i: number) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-700 font-medium px-2.5 py-0.5 rounded-md">
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
              <div className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center space-x-1.5">
                <Target className="h-3.5 w-3.5 text-slate-400" />
                <span>Brand Keywords:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {brand.brandKeywords && brand.brandKeywords.length > 0 ? (
                  brand.brandKeywords.map((k: string, i: number) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-0.5 rounded-md">
                      #{k}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No brand keywords specified.</span>
                )}
              </div>
            </div>

            {/* Target Audience & Strategic Context */}
            {(brand.targetAudience || brand.brandContext) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
                {brand.targetAudience && (
                  <div>
                    <span className="font-semibold text-slate-700">Target Audience:</span>
                    <p className="text-slate-600 mt-0.5">{brand.targetAudience}</p>
                  </div>
                )}
                {brand.brandContext && (
                  <div>
                    <span className="font-semibold text-slate-700">Brand Context & Positioning:</span>
                    <p className="text-slate-600 mt-0.5">{brand.brandContext}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {brands.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
            No brand profiles configured yet for this project. Click &ldquo;Add Brand Profile&rdquo; to configure your primary brand identity.
          </div>
        )}
      </div>

      {/* Modal Dialog for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-slate-900">
              {editingBrand ? 'Edit Brand Profile' : 'Configure Brand Profile'}
            </h2>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={formData.canonicalName}
                  onChange={(e) => setFormData({ ...formData, canonicalName: e.target.value })}
                  placeholder="e.g. Acme Cloud"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Domain *</label>
                  <input
                    type="text"
                    required
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="acme.com"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="SaaS / FinTech"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Products & Services (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.productsServicesText}
                  onChange={(e) => setFormData({ ...formData, productsServicesText: e.target.value })}
                  placeholder="CRM, AI Search Optimization, Marketing Analytics"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Brand Keywords & Aliases (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.brandKeywordsText}
                  onChange={(e) => setFormData({ ...formData, brandKeywordsText: e.target.value })}
                  placeholder="acme, acme analytics, acme cloud"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Audience</label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  placeholder="Marketing managers, SEO professionals, agencies"
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Brand Context / Positioning Brief
                </label>
                <textarea
                  rows={2}
                  value={formData.brandContext}
                  onChange={(e) => setFormData({ ...formData, brandContext: e.target.value })}
                  placeholder="Acme is a premium visibility analytics platform specializing in Generative Engine Optimization..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                <label htmlFor="isPrimary" className="font-medium text-slate-700">
                  Set as Primary Brand for this Project
                </label>
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
                  {loading ? 'Saving...' : 'Save Brand Profile'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

