import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  getCurrentUser,
  getCachedOrganizations,
  getCachedProjects,
  getCachedBrands,
} from '@/lib/server-cache';
import { getCitationIntelligence } from '@/domain/ai-visibility/analytics-service';
import { CitationsClient } from '@/components/visibility/citations-client';
import { Button } from '@/components/ui/button';

export default async function CitationsPage() {
  const user = await getCurrentUser();
  const userId = user?.id || '00000000-0000-0000-0000-000000000001';

  const userOrgs = await getCachedOrganizations(userId);

  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get('visnora_active_org')?.value;
  const currentOrg = userOrgs.find((o) => o.id === activeOrgCookie) || userOrgs[0] || {
    id: 'demo-org',
    name: 'Primary Organization',
  };

  const [projects, allBrands] = await Promise.all([
    getCachedProjects(currentOrg.id, userId),
    getCachedBrands(currentOrg.id),
  ]);

  if (projects.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-xl mx-auto shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">No Projects Found</h2>
        <p className="text-xs text-slate-500 mt-2">Create a project first to inspect citation intelligence.</p>
        <Link href="/projects" className="mt-4 inline-block">
          <Button size="sm">Create Project</Button>
        </Link>
      </div>
    );
  }

  const activeBrandCookie = cookieStore.get('visnora_active_brand')?.value;
  const activeBrand =
    (activeBrandCookie && allBrands.find((b) => b.id === activeBrandCookie)) ||
    allBrands.find((b) => b.isPrimary && b.canonicalName !== 'Demo Brand') ||
    allBrands.find((b) => b.isPrimary) ||
    allBrands[0];

  const currentProject =
    (activeBrand && projects.find((p) => p.id === activeBrand.projectId)) ||
    projects[0];

  let citations = null;
  try {
    citations = await getCitationIntelligence(currentOrg.id, currentProject.id, 30);
  } catch {
    // Fallback
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Citations Intelligence</h1>
        <p className="text-xs text-slate-500 mt-1">
          Discover which external domains and authority sources AI engines cite when answering questions in your market.
        </p>
      </div>

      <CitationsClient
        initialCitations={citations}
        projects={projects}
        currentProjectId={currentProject.id}
        organizationId={currentOrg.id}
      />
    </div>
  );
}
