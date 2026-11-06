import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '../../lib/supabase/server';
import { getOrganizationsForUser } from '../../../../packages/domain/organizations/service';
import { Sidebar } from '../../components/dashboard/sidebar';
import { Header } from '../../components/dashboard/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  let userEmail = 'founder@visnora.com';
  let userId = '00000000-0000-0000-0000-000000000001';

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      user = data.user;
      userEmail = user.email || userEmail;
      userId = user.id;
    }
  } catch {
    // Development fallback if Supabase auth service is offline
  }

  // Retrieve user organizations
  let userOrgs: any[] = [];
  try {
    userOrgs = await getOrganizationsForUser(userId);
  } catch (err) {
    // If DB is offline, provide graceful fallback
  }

  // If user has no organizations, redirect to onboarding flow
  if (user && userOrgs.length === 0) {
    redirect('/onboarding');
  }

  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get('visnora_active_org')?.value;
  const currentOrg = userOrgs.find((o) => o.id === activeOrgCookie) || userOrgs[0] || {
    id: 'demo-org',
    name: 'Acme Technologies',
    role: 'OWNER',
    workspaces: [{ id: 'demo-ws', name: 'Primary Workspace', slug: 'primary' }],
  };

  const workspaces = currentOrg.workspaces || [
    { id: 'demo-ws', name: 'Primary Workspace' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar currentOrgName={currentOrg.name} currentRole={currentOrg.role} />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          organizations={userOrgs}
          workspaces={workspaces}
          currentOrgId={currentOrg.id}
          currentWorkspaceId={workspaces[0]?.id}
          userEmail={userEmail}
          userFullName={userEmail.split('@')[0]}
        />

        <main className="flex-1 bg-slate-50 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
