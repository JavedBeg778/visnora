import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Plus, Sparkles } from 'lucide-react';
import {
  getCurrentUser,
  getCachedOrganizations,
  getCachedProjects,
  getCachedBrands,
} from '@/lib/server-cache';
import {
  getProjectVisibilityOverview,
  getHistoricalTrends,
} from '@/domain/ai-visibility/analytics-service';
import { DashboardClient } from '@/components/visibility/dashboard-client';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const userId = user?.id || '00000000-0000-0000-0000-000000000001';

  const userOrgs = await getCachedOrganizations(userId);

  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get('visnora_active_org')?.value;
  const currentOrg = userOrgs.find((o) => o.id === activeOrgCookie) || userOrgs[0] || {
    id: 'demo-org',
    name: 'Primary Organization',
    role: 'OWNER',
  };

  // Fetch projects and all brand profiles in parallel
  const [projects, allBrands] = await Promise.all([
    getCachedProjects(currentOrg.id, userId),
    getCachedBrands(currentOrg.id),
  ]);

  // If no projects exist, show guided empty state
  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Visibility Intelligence</h1>
            <p className="text-xs text-slate-500 mt-1">
              Track how AI search engines perceive, cite, and recommend your brand.
            </p>
          </div>
          <Link href="/projects">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Create Brand Project</span>
            </Button>
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No brand projects found</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Create your first brand project to begin tracking your AI search visibility, competitor share of voice, and citations across Google Gemini.
          </p>
          <div className="mt-6">
            <Link href="/projects">
              <Button>
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Create Brand Project</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Resolve active brand with priority:
  // 1. Saved visnora_active_brand cookie
  // 2. Real primary brand (not Demo Brand)
  // 3. Primary brand
  // 4. Real non-demo brand
  // 5. First available brand
  const activeBrandCookie = cookieStore.get('visnora_active_brand')?.value;
  const activeBrand =
    (activeBrandCookie && allBrands.find((b) => b.id === activeBrandCookie)) ||
    allBrands.find((b) => b.isPrimary && b.canonicalName !== 'Demo Brand') ||
    allBrands.find((b) => b.isPrimary) ||
    allBrands.find((b) => !b.domain.includes('example.com')) ||
    allBrands[0];

  // Map active project from selected brand or default to first project
  const currentProject =
    (activeBrand && projects.find((p) => p.id === activeBrand.projectId)) ||
    projects[0];

  // Fetch overview and historical trends in parallel
  const [overview, trends] = await Promise.all([
    getProjectVisibilityOverview(currentOrg.id, currentProject.id, 30, activeBrand?.id).catch(() => null),
    getHistoricalTrends(currentOrg.id, currentProject.id, 30, activeBrand?.id).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Visibility Intelligence</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time brand perception, citation rate, and competitor share of voice across AI engines.
          </p>
        </div>
      </div>

      <DashboardClient
        initialOverview={overview}
        initialTrends={trends}
        brands={allBrands}
        initialBrandId={activeBrand?.id}
        projects={projects}
        currentProjectId={currentProject.id}
        organizationId={currentOrg.id}
      />
    </div>
  );
}
