'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Briefcase,
  Users,
  Settings,
  Building2,
  Sparkles,
  ChevronRight,
  Globe2,
  Users2,
  TerminalSquare,
  History,
  Link2,
  BarChart3,
  Lightbulb,
  Clock,
  X,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../ui/button';

interface SidebarProps {
  currentOrgName?: string;
  currentRole?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  currentOrgName = 'Visnora Workspace',
  currentRole = 'OWNER',
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  const visibilityNav = [
    { name: 'AI Visibility Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Brand Profiles', href: '/brands', icon: Globe2 },
    { name: 'Competitors', href: '/competitors', icon: Users2 },
    { name: 'Prompts Library', href: '/prompts', icon: TerminalSquare },
    { name: 'Tracking Runs', href: '/runs', icon: History },
    { name: 'Citations Intelligence', href: '/citations', icon: Link2 },
    { name: 'Competitor Compare', href: '/competitors/compare', icon: BarChart3 },
    { name: 'Recommendations', href: '/recommendations', icon: Lightbulb },
  ];

  const adminNav = [
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Workspaces', href: '/workspaces', icon: Briefcase },
    { name: 'Tracking Schedule', href: '/settings/tracking', icon: Clock },
    { name: 'Team & Access', href: '/team', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand & Platform Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center space-x-2.5" onClick={onClose}>
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            V
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">Visnora</span>
            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">
              AI Visibility Intelligence
            </span>
          </div>
        </Link>

        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Organization Badge Card */}
      <div className="px-4 py-3 mx-4 my-3 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <p className="text-xs font-bold text-slate-900 truncate">{currentOrgName}</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider">
            {currentRole}
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
        <div>
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="h-3 w-3 text-blue-500" />
            <span>AI Visibility Intelligence</span>
          </div>
          <div className="mt-1 space-y-0.5">
            {visibilityNav.map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all relative',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full" />
                  )}
                  <div className="flex items-center space-x-2.5">
                    <Icon
                      className={cn(
                        'h-4 w-4 flex-shrink-0 transition-colors',
                        isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'
                      )}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-600" />}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Organization & Setup
          </div>
          <div className="mt-1 space-y-0.5">
            {adminNav.map((item) => {
              const isActive =
                item.href === '/settings'
                  ? pathname === '/settings'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all relative',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full" />
                  )}
                  <div className="flex items-center space-x-2.5">
                    <Icon
                      className={cn(
                        'h-4 w-4 flex-shrink-0 transition-colors',
                        isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'
                      )}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-600" />}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50 text-center space-y-1">
        <div className="flex items-center justify-center space-x-1 text-[11px] font-semibold text-slate-700">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
          <span>Tenant Isolated Environment</span>
        </div>
        <p className="text-[10px] text-slate-400">Visnora Platform v0.2.0 • Gemini 2.5</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-slate-200 h-screen sticky top-0 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
