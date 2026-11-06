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
  TrendingUp,
  Globe2,
  Users2,
  TerminalSquare,
  History,
  Link2,
  BarChart3,
  Lightbulb,
  Clock,
} from 'lucide-react';
import { cn } from '../ui/button';

interface SidebarProps {
  currentOrgName?: string;
  currentRole?: string;
}

export function Sidebar({ currentOrgName = 'Visnora Workspace', currentRole = 'OWNER' }: SidebarProps) {
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

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand & Platform Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 justify-between">
        <Link href="/dashboard" className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            V
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">Visnora</span>
            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">AI Visibility MVP</span>
          </div>
        </Link>
      </div>

      {/* Organization Badge Card */}
      <div className="px-4 py-3 mx-4 my-3 rounded-lg bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <Building2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-slate-900 truncate">{currentOrgName}</p>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">
            {currentRole}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-1 space-y-4 overflow-y-auto">
        <div>
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
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
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3 w-3 text-blue-600" />}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Organization & Setup
          </div>
          <div className="mt-1 space-y-0.5">
            {adminNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/settings' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3 w-3 text-blue-600" />}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 text-center bg-slate-50">
        <p className="text-[11px] text-slate-500 font-medium">Visnora AI Visibility MVP v0.2.0</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Gemini 3.8 Flash & 3.5 Flash-Lite</p>
      </div>
    </aside>
  );
}
