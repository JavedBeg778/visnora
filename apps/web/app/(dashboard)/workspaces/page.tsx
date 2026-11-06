'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Edit2,
  Archive,
  FolderKanban,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { EmptyState } from '../../../components/ui/empty-state';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  projectCount: number;
  createdAt: string;
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      // Read active org from cookie
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      const res = await fetch(`/api/v1/workspaces${orgId ? `?orgId=${orgId}` : ''}`, {
        headers: orgId ? { 'x-organization-id': orgId } : {},
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setWorkspaces(data.data || []);
      } else {
        throw new Error(data.error?.message || 'Failed to load workspaces.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch workspaces.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      const res = await fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          description: newWorkspaceDesc.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to create workspace.');
      }

      setSuccess('Workspace created successfully!');
      setCreateModalOpen(false);
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      fetchWorkspaces();
    } catch (err: any) {
      setError(err?.message || 'Failed to create workspace.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace) return;

    setSubmitting(true);
    setError(null);

    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      const res = await fetch(`/api/v1/workspaces/${editingWorkspace.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update workspace.');
      }

      setSuccess('Workspace updated successfully!');
      setEditingWorkspace(null);
      fetchWorkspaces();
    } catch (err: any) {
      setError(err?.message || 'Failed to update workspace.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive workspace "${name}"?`)) return;

    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      const res = await fetch(`/api/v1/workspaces/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
        body: JSON.stringify({ isArchived: true }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to archive workspace.');
      }

      setSuccess(`Workspace "${name}" archived successfully.`);
      fetchWorkspaces();
    } catch (err: any) {
      setError(err?.message || 'Failed to archive workspace.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Workspaces</h1>
          <p className="mt-1 text-xs text-slate-500">
            Organize brand projects, campaigns, and team members across distinct workspaces.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          <span>New Workspace</span>
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

      {/* Workspaces List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading workspaces...</div>
      ) : workspaces.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="No workspaces found"
          description="Create your first workspace to start grouping brands and competitive research."
          actionLabel="Create Workspace"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-card hover:border-blue-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{ws.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">slug: {ws.slug}</span>
                    </div>
                  </div>
                  <Badge variant="blue">{ws.projectCount} Projects</Badge>
                </div>

                <p className="mt-3 text-xs text-slate-500 leading-relaxed min-h-[32px]">
                  {ws.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  Created {new Date(ws.createdAt).toLocaleDateString()}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setEditingWorkspace(ws);
                      setEditName(ws.name);
                      setEditDesc(ws.description || '');
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded"
                    title="Rename / Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleArchive(ws.id, ws.name)}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Archive Workspace"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workspace Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-modal border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Create New Workspace</h3>
            <p className="mt-1 text-xs text-slate-500">
              Workspaces isolate brand projects and campaigns for your team or agency clients.
            </p>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <Input
                label="Workspace Name"
                required
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="e.g. Enterprise Client A, Retail Division"
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                  placeholder="Provide context on this workspace..."
                  className="block w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <Button variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Create Workspace
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Workspace Modal */}
      {editingWorkspace && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-modal border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Edit Workspace</h3>
            <p className="mt-1 text-xs text-slate-500">Update workspace name and description.</p>

            <form onSubmit={handleUpdate} className="mt-5 space-y-4">
              <Input
                label="Workspace Name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="block w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <Button variant="secondary" type="button" onClick={() => setEditingWorkspace(null)}>
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

