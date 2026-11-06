'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Briefcase,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '../../lib/supabase/client';

interface HeaderProps {
  organizations?: Array<{ id: string; name: string; role: string }>;
  workspaces?: Array<{ id: string; name: string }>;
  currentOrgId?: string;
  currentWorkspaceId?: string;
  userEmail?: string;
  userFullName?: string;
}

export function Header({
  organizations = [],
  workspaces = [],
  currentOrgId,
  currentWorkspaceId,
  userEmail = 'user@visnora.local',
  userFullName = 'Visnora User',
}: HeaderProps) {
  const router = useRouter();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentOrg = organizations.find((o) => o.id === currentOrgId) || organizations[0] || {
    id: 'default',
    name: 'Visnora Workspace',
    role: 'OWNER',
  };

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0] || {
    id: 'default',
    name: 'Primary Workspace',
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore client error and redirect
    }
    router.push('/login');
    router.refresh();
  };

  const handleSwitchOrg = async (orgId: string) => {
    setOrgDropdownOpen(false);
    // Set cookie for active org
    document.cookie = `visnora_active_org=${orgId}; path=/; max-age=2592000; SameSite=Lax`;
    router.refresh();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Left: Organization & Workspace Switcher Context */}
      <div className="flex items-center space-x-3">
        {/* Organization Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setOrgDropdownOpen(!orgDropdownOpen);
              setUserMenuOpen(false);
            }}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-800 text-xs font-semibold"
          >
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            <span className="max-w-[140px] truncate">{currentOrg.name}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {orgDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1.5 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Switch Organization
              </div>
              <div className="max-h-48 overflow-y-auto">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSwitchOrg(org.id)}
                    className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-800 truncate">{org.name}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {org.role}
                    </span>
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-1 pt-1 px-1">
                <Link
                  href="/onboarding"
                  onClick={() => setOrgDropdownOpen(false)}
                  className="flex items-center space-x-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create New Organization</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        <span className="text-slate-300">/</span>

        {/* Workspace Context Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-slate-600 bg-slate-100 rounded-md">
          <Briefcase className="h-3 w-3 text-slate-500" />
          <span className="font-medium truncate max-w-[150px]">{currentWorkspace.name}</span>
        </div>
      </div>

      {/* Right: User Menu */}
      <div className="flex items-center space-x-4">
        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setOrgDropdownOpen(false);
            }}
            className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 text-blue-700 flex items-center justify-center font-bold text-xs">
              {userFullName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">{userFullName}</p>
              <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{userEmail}</p>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1.5 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{userFullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>Profile & Account</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center space-x-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-400" />
                  <span>Organization Settings</span>
                </Link>
              </div>
              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

