'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { EmptyState } from '../../../components/ui/empty-state';

interface Member {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'ANALYST' | 'VIEWER';
  status: string;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      // Fetch active members
      const memRes = await fetch(`/api/v1/organizations/${orgId}/members`, {
        headers: orgId ? { 'x-organization-id': orgId } : {},
      });
      const memData = await memRes.json();
      if (memRes.ok && memData.success) {
        setMembers(memData.data || []);
      }

      // Fetch pending invitations
      const invRes = await fetch(`/api/v1/invitations${orgId ? `?orgId=${orgId}` : ''}`, {
        headers: orgId ? { 'x-organization-id': orgId } : {},
      });
      const invData = await invRes.json();
      if (invRes.ok && invData.success) {
        setInvitations(invData.data || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch team data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setGeneratedInviteLink(null);

    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      const res = await fetch(`/api/v1/organizations/${orgId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to generate invitation.');
      }

      const inviteUrl = `${window.location.origin}/invite/${data.data.token}`;
      setGeneratedInviteLink(inviteUrl);
      setSuccess(`Invitation created for ${inviteEmail}.`);
      setInviteEmail('');
      fetchTeamData();
    } catch (err: any) {
      setError(err?.message || 'Failed to invite team member.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      const res = await fetch(`/api/v1/organizations/${orgId}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(orgId ? { 'x-organization-id': orgId } : {}),
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update member role.');
      }

      setSuccess('Member role updated successfully.');
      fetchTeamData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update role.');
    }
  };

  const handleRemoveMember = async (memberId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from this organization?`)) return;

    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      const res = await fetch(`/api/v1/organizations/${orgId}/members/${memberId}`, {
        method: 'DELETE',
        headers: orgId ? { 'x-organization-id': orgId } : {},
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to remove member.');
      }

      setSuccess(`Member ${email} removed.`);
      fetchTeamData();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove member.');
    }
  };

  const handleRevokeInvite = async (invitationId: string, email: string) => {
    try {
      const match = document.cookie.match(/visnora_active_org=([^;]+)/);
      const orgId = match ? match[1] : '';

      const res = await fetch(`/api/v1/invitations/${invitationId}/revoke?orgId=${orgId}`, {
        method: 'POST',
        headers: orgId ? { 'x-organization-id': orgId } : {},
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to revoke invitation.');
      }

      setSuccess(`Invitation for ${email} revoked.`);
      fetchTeamData();
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke invitation.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team & Access Control</h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage organization members, assign role-based permissions, and review invitations.
          </p>
        </div>
        <Button onClick={() => setInviteModalOpen(true)} size="sm">
          <UserPlus className="h-4 w-4 mr-1.5" />
          <span>Invite Member</span>
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

      {/* Active Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Members ({members.length})</h3>
            <p className="text-xs text-slate-500">Users who currently have access to this organization.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Assigned Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {member.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-900">{member.fullName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{member.email}</td>
                  <td className="px-6 py-4">
                    {member.role === 'OWNER' ? (
                      <Badge variant="blue">OWNER</Badge>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="text-xs text-slate-800 border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="success">ACTIVE</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {member.role !== 'OWNER' && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.email)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Remove Member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Pending Invitations ({invitations.length})</h3>
          <p className="text-xs text-slate-500">Invitations sent to team members awaiting acceptance.</p>
        </div>

        {invitations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No pending invitations for this organization.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Invited Email</th>
                  <th className="px-6 py-3.5">Invited Role</th>
                  <th className="px-6 py-3.5">Expires</th>
                  <th className="px-6 py-3.5">Invitation Link</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{inv.email}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{inv.role}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{new Date(inv.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/invite/${inv.token}`)}
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        <span>Copy Link</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRevokeInvite(inv.id, inv.email)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Revoke Invitation"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-modal border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Invite Team Member</h3>
            <p className="mt-1 text-xs text-slate-500">
              Generate a secure invitation link for a collaborator to join this organization.
            </p>

            {generatedInviteLink ? (
              <div className="mt-5 space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Invitation Generated Successfully!</p>
                    <p className="mt-0.5 text-emerald-700 text-[11px]">
                      (Note: If SMTP email provider is not yet configured, share this direct invitation link with the recipient):
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono text-slate-700 break-all">
                  <span className="truncate pr-2">{generatedInviteLink}</span>
                  <button
                    onClick={() => copyToClipboard(generatedInviteLink)}
                    className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 flex items-center space-x-1 text-blue-600 font-sans text-xs flex-shrink-0"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setInviteModalOpen(false);
                      setGeneratedInviteLink(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="mt-5 space-y-4">
                <Input
                  label="Recipient Email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@agency.com"
                />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Role & Permission Level
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="block w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ADMIN">Admin (Manage members, workspaces, projects)</option>
                    <option value="MEMBER">Member (Create and edit permitted resources)</option>
                    <option value="VIEWER">Viewer (Read-only access)</option>
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-end space-x-3">
                  <Button variant="secondary" type="button" onClick={() => setInviteModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={inviting}>
                    Generate Invitation
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

