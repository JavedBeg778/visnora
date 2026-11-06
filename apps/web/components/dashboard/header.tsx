'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Building2,
  Briefcase,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Plus,
  Menu,
  Check,
  Users,
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
  onMenuToggle?: () => void;
}

export function Header({
  organizations = [],
  workspaces = [],
  currentOrgId,
  currentWorkspaceId,
  userEmail = 'user@visnora.local',
  userFullName = 'Visnora User',
  onMenuToggle,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
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

  const handleSwitchOrg = (orgId: string) => {
    setOrgDropdownOpen(false);
    document.cookie = `visnora_active_org=${orgId}; path=/; max-age=2592000; SameSite=Lax`;
    router.refresh();
  };

  // Helper to format breadcrumb from pathname
  const getBreadcrumb = () => {
    if (pathname === '/dashboard') return 'AI Visibility Overview';
    if (pathname.startsWith('/brands')) return 'Brand Profiles';
    if (pathname.startsWith('/competitors/compare')) return 'Competitor Benchmark';
    if (pathname.startsWith('/competitors')) return 'Competitors';
    if (pathname.startsWith('/prompts')) return 'Prompts Library';
    if (pathname.startsWith('/runs')) return 'Tracking Runs';
    if (pathname.startsWith('/citations')) return 'Citations Intelligence';
    if (pathname.startsWith('/recommendations')) return 'Actionable Recommendations';
    if (pathname.startsWith('/projects')) return 'Projects';
    if (pathname.startsWith('/workspaces')) return 'Workspaces';
    if (pathname.startsWith('/settings/tracking')) return 'Tracking Schedule';
    if (pathname.startsWith('/team')) return 'Team & Access';
    if (pathname.startsWith('/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-subtle select-none">
      {/* Left: Mobile Menu + Org / Workspace Context */}
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Organization Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setOrgDropdownOpen(!orgDropdownOpen);
              setUserMenuOpen(false);
            }}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-800 text-xs font-bold shadow-subtle"
          >
            <Building2 className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
            <span className="max-w-[120px] sm:max-w-[160px] truncate">{currentOrg.name}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {orgDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-dropdown border border-slate-200 py-2 z-50 animate-in fade-in duration-100">
              <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Organization
              </div>
              <div className="max-h-56 overflow-y-auto px-1">
                {organizations.map((org) => {
                  const isSelected = org.id === currentOrg.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-blue-50 text-blue-900 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        {isSelected ? (
                          <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                        ) : (
                          <div className="w-3.5 flex-shrink-0" />
                        )}
                        <span className="truncate">{org.name}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        {org.role}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 mt-2 pt-2 px-2">
                <Link
                  href="/onboarding"
                  onClick={() => setOrgDropdownOpen(false)}
                  className="flex items-center space-x-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create New Organization</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        <span className="text-slate-300 hidden sm:inline">/</span>

        {/* Workspace Context Badge */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 text-xs text-slate-700 bg-slate-100 rounded-lg">
          <Briefcase className="h-3 w-3 text-slate-500" />
          <span className="font-semibold truncate max-w-[130px]">{currentWorkspace.name}</span>
        </div>

        <span className="text-slate-300 hidden md:inline">/</span>

        {/* Active Page Breadcrumb */}
        <div className="hidden md:block text-xs font-medium text-slate-500 truncate">
          {getBreadcrumb()}
        </div>
      </div>

      {/* Right: Security Pill & User Menu */}
      <div className="flex items-center space-x-3">
        {/* Isolated Environment Pill (Desktop) */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>RLS Active</span>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setOrgDropdownOpen(false);
            }}
            className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shadow-subtle">
              {userFullName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                {userFullName}
              </p>
              <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{userEmail}</p>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-dropdown border border-slate-200 py-2 z-50 animate-in fade-in duration-100">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 truncate">{userFullName}</p>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                    {currentOrg.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{userEmail}</p>
              </div>

              <div className="py-1 px-1">
                <Link
                  href="/team"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>Team Members</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  <span>Workspace Settings</span>
                </Link>
              </div>

              <div className="border-t border-slate-100 mt-1 pt-1 px-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
