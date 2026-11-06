import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '../../lib/supabase/server';
import { getOrganizationsForUser } from '@/domain/organizations/service';
import { syncUserProfile } from '@/domain/administration/user-service';
import { DashboardShell } from '../../components/dashboard/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

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

  // Ensure user profile exists in database
  try {
    await syncUserProfile({
      id: userId,
      email: userEmail,
      fullName: userFullName,
      avatarUrl: user.user_metadata?.avatar_url,
    });
  } catch (err) {
    console.error('Failed to sync user profile in layout:', err);
  }

  // Retrieve user organizations
  let userOrgs: any[] = [];
  try {
    userOrgs = await getOrganizationsForUser(userId);
  } catch (err) {
    console.error('Failed to load user organizations:', err);
  }

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
