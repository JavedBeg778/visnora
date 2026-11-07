import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser, getCachedOrganizations } from '@/lib/server-cache';
import { syncUserProfile } from '@/domain/administration/user-service';
import { DashboardShell } from '../../components/dashboard/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Strict Server Component route protection: redirect unauthenticated visitors to login
  if (!user) {
    redirect('/login');
  }

  const userEmail = user.email || '';
  const userId = user.id;
  const userFullName =
    user.user_metadata?.full_name ||
    userEmail.split('@')[0] ||
    'Visnora User';

  // Non-blocking sync to avoid delaying initial layout render
  syncUserProfile({
    id: userId,
    email: userEmail,
    fullName: userFullName,
    avatarUrl: user.user_metadata?.avatar_url,
  }).catch((err) => {
    console.error('Failed to sync user profile in layout:', err);
  });

  // Retrieve user organizations with request-scoped caching
  const userOrgs = await getCachedOrganizations(userId);

  // If authenticated user has no organizations yet, redirect to onboarding flow
  if (userOrgs.length === 0) {
    redirect('/onboarding');
  }

  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get('visnora_active_org')?.value;
  const currentOrg = userOrgs.find((o) => o.id === activeOrgCookie) || userOrgs[0];

  const workspaces = currentOrg?.workspaces || [];

  return (
    <DashboardShell
      userOrgs={userOrgs}
      currentOrg={currentOrg}
      workspaces={workspaces}
      userEmail={userEmail}
      userFullName={userFullName}
    >
      {children}
    </DashboardShell>
  );
}
