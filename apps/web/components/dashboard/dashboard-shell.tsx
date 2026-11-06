'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface DashboardShellProps {
  children: React.ReactNode;
  userOrgs: any[];
  currentOrg: any;
  workspaces: any[];
  userEmail: string;
  userFullName: string;
}

export function DashboardShell({
  children,
  userOrgs,
  currentOrg,
  workspaces,
  userEmail,
  userFullName,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentOrgName={currentOrg.name}
        currentRole={currentOrg.role}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          organizations={userOrgs}
          workspaces={workspaces}
          currentOrgId={currentOrg.id}
          currentWorkspaceId={workspaces[0]?.id}
          userEmail={userEmail}
          userFullName={userFullName}
          onMenuToggle={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 bg-[#F8FAFC] p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

