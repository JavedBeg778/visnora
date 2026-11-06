import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Plus, Sparkles, FolderKanban } from 'lucide-react';
import { createClient } from '../../../lib/supabase/server';
import { getOrganizationsForUser } from '../../../../../packages/domain/organizations/service';
import { getProjects } from '../../../../../packages/domain/projects/service';
import {
  getProjectVisibilityOverview,
  getHistoricalTrends,
} from '../../../../../packages/domain/ai-visibility/analytics-service';
import { DashboardClient } from '../../../components/visibility/dashboard-client';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../components/ui/empty-state';

export default async function DashboardPage() {
  let userId = '00000000-0000-0000-0000-000000000001';

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      userId = data.user.id;
    }
  } catch {
    // Local dev fallback
  }

  let userOrgs: any[] = [];
  try {
    userOrgs = await getOrganizationsForUser(userId);
  } catch {
    // DB fallback
  }

  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get('visnora_active_org')?.value;
  const currentOrg = userOrgs.find((o) => o.id === activeOrgCookie) || userOrgs[0] || {
    id: 'demo-org',
    name: 'Primary Organization',
    role: 'OWNER',
  };

  let projects: any[] = [];
  if (currentOrg.id !== 'demo-org') {
    try {
      projects = await getProjects(currentOrg.id, undefined, userId);
    } catch {
      // DB fallback
    }
  }

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

  const currentProject = projects[0];
  let overview = null;
  let trends: any[] = [];

  try {
    overview = await getProjectVisibilityOverview(currentOrg.id, currentProject.id, 30);
    trends = await getHistoricalTrends(currentOrg.id, currentProject.id, 30);
  } catch (err) {
    // Fallback if data is empty
  }

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
        projects={projects}
        currentProjectId={currentProject.id}
        organizationId={currentOrg.id}
      />
    </div>
  );
}
