'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  ExternalLink,
  Edit2,
  Archive,
  Globe,
  Briefcase,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { EmptyState } from '../../../components/ui/empty-state';

interface Project {
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
  primaryWebsite: string;
  domain: string;
  description?: string;
  industry?: string;
  targetCountry: string;
  defaultLanguage: string;
  trackedPromptsCount: number;
  createdAt: string;
}

interface WorkspaceOption {
  id: string;
  name: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState<string>('all');

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newWorkspaceId, setNewWorkspaceId] = useState('');
  const [newPrimaryWebsite, setNewPrimaryWebsite] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIndustry, setNewIndustry] = useState('Technology & SaaS');
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIndustry, setEditIndustry] = useState('');

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      // Fetch workspaces
      const wsRes = await fetch(`/api/v1/workspaces${orgId ? `?orgId=${orgId}` : ''}`, {
        headers: orgId ? { 'x-organization-id': orgId } : {},
      });
      const wsData = await wsRes.json();
      if (wsRes.ok && wsData.success) {
        setWorkspaces(wsData.data || []);
        if (wsData.data?.length > 0 && !newWorkspaceId) {
          setNewWorkspaceId(wsData.data[0].id);
        }
      }

      // Fetch projects
      const projRes = await fetch(`/api/v1/projects${orgId ? `?orgId=${orgId}` : ''}`, {
        headers: orgId ? { 'x-organization-id': orgId } : {},
      });
      const projData = await projRes.json();
      if (projRes.ok && projData.success) {
        setProjects(projData.data || []);
      } else {
        throw new Error(projData.error?.message || 'Failed to load projects.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch projects data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
        body: JSON.stringify({
          workspaceId: newWorkspaceId,
          name: newProjectName.trim(),
          primaryWebsite: newPrimaryWebsite.trim(),
          description: newDescription.trim() || undefined,
          industry: newIndustry,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to create brand project.');
      }

      setSuccess(`Project "${newProjectName}" created successfully!`);
      setCreateModalOpen(false);
      setNewProjectName('');
      setNewPrimaryWebsite('');
      setNewDescription('');
      fetchInitialData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    setSubmitting(true);
    setError(null);

    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      const res = await fetch(`/api/v1/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
        body: JSON.stringify({
          name: editName.trim(),
          primaryWebsite: editWebsite.trim(),
          description: editDesc.trim() || undefined,
          industry: editIndustry,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update project.');
      }

      setSuccess('Project details updated successfully!');
      setEditingProject(null);
      fetchInitialData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveProject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive project "${name}"?`)) return;

    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      const res = await fetch(`/api/v1/projects/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
        body: JSON.stringify({ isArchived: true }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to archive project.');
      }

      setSuccess(`Project "${name}" archived successfully.`);
      fetchInitialData();
    } catch (err: any) {
      setError(err?.message || 'Failed to archive project.');
    }
  };

  const filteredProjects =
    selectedWorkspaceFilter === 'all'
      ? projects
      : projects.filter((p) => p.workspaceId === selectedWorkspaceFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Brand Projects</h1>
          <p className="mt-1 text-xs text-slate-500">
            Configure brands and websites that Visnora monitors for search visibility and competitor citations.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          <span>New Brand Project</span>
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      {workspaces.length > 1 && (
        <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <Briefcase className="h-4 w-4 text-slate-500 ml-1" />
          <span className="text-xs font-semibold text-slate-700">Filter Workspace:</span>
          <select
            value={selectedWorkspaceFilter}
            onChange={(e) => setSelectedWorkspaceFilter(e.target.value)}
            className="text-xs text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Workspaces ({projects.length})</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Projects Table / Card Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="No brand projects found"
          description="Create your first brand project to establish domain monitoring."
          actionLabel="Create Brand Project"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Brand & Project</th>
                  <th className="px-6 py-3.5">Primary Domain</th>
                  <th className="px-6 py-3.5">Workspace</th>
                  <th className="px-6 py-3.5">Industry</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
                          {project.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{project.name}</p>
                          <p className="text-[11px] text-slate-400 max-w-xs truncate">
                            {project.description || 'No description'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5">
                        <Globe className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-mono text-slate-800">{project.domain}</span>
                        <a
                          href={project.primaryWebsite}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-blue-600"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700 font-medium">{project.workspaceName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{project.industry || 'General'}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="success">Active</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setEditingProject(project);
                            setEditName(project.name);
                            setEditWebsite(project.primaryWebsite);
                            setEditDesc(project.description || '');
                            setEditIndustry(project.industry || 'Technology & SaaS');
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                          title="Edit Project"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchiveProject(project.id, project.name)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Archive Project"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-modal border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Create New Brand Project</h3>
            <p className="mt-1 text-xs text-slate-500">
              Establish the brand name and primary domain to prepare for AI Visibility tracking.
            </p>

            <form onSubmit={handleCreateProject} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Assign to Workspace
                </label>
                <select
                  value={newWorkspaceId}
                  onChange={(e) => setNewWorkspaceId(e.target.value)}
                  className="block w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Brand / Project Name"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. Acme Cloud, Visnora"
              />

              <Input
                label="Primary Website URL"
                type="url"
                required
                value={newPrimaryWebsite}
                onChange={(e) => setNewPrimaryWebsite(e.target.value)}
                placeholder="https://example.com"
                helperText="Domain citations in generative search engines will be matched against this URL."
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Industry / Category
                </label>
                <select
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  className="block w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Technology & SaaS">Technology & SaaS</option>
                  <option value="E-commerce & Retail">E-commerce & Retail</option>
                  <option value="Digital Marketing & SEO">Digital Marketing & SEO</option>
                  <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                  <option value="Finance & FinTech">Finance & FinTech</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Notes on this project..."
                  className="block w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <Button variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Create Brand Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-modal border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Edit Project Details</h3>
            <p className="mt-1 text-xs text-slate-500">Update project name, domain, and vertical.</p>

            <form onSubmit={handleUpdateProject} className="mt-5 space-y-4">
              <Input
                label="Brand / Project Name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <Input
                label="Primary Website URL"
                type="url"
                required
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Industry / Category
                </label>
                <select
                  value={editIndustry}
                  onChange={(e) => setEditIndustry(e.target.value)}
                  className="block w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Technology & SaaS">Technology & SaaS</option>
                  <option value="E-commerce & Retail">E-commerce & Retail</option>
                  <option value="Digital Marketing & SEO">Digital Marketing & SEO</option>
                  <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                  <option value="Finance & FinTech">Finance & FinTech</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="block w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <Button variant="secondary" type="button" onClick={() => setEditingProject(null)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

