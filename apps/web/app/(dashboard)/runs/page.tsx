import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { getOrganizationsForUser } from '../../../../../packages/domain/organizations/service';
import { getProjects } from '../../../../../packages/domain/projects/service';
import { getTrackingRuns } from '../../../../../packages/domain/ai-visibility/collection-engine';
import { RunsClient } from '../../../components/visibility/runs-client';
import { Button } from '../../../components/ui/button';

export default async function RunsPage() {
  let userId = '00000000-0000-0000-0000-000000000001';

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) userId = data.user.id;
  } catch {
    // Dev fallback
  }

  let userOrgs: any[] = [];
  try {
    userOrgs = await getOrganizationsForUser(userId);
  } catch {
    // Fallback
  }

  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get('visnora_active_org')?.value;
  const currentOrg = userOrgs.find((o) => o.id === activeOrgCookie) || userOrgs[0] || {
    id: 'demo-org',
    name: 'Primary Organization',
  };

  let projects: any[] = [];
  if (currentOrg.id !== 'demo-org') {
    try {
      projects = await getProjects(currentOrg.id, undefined, userId);
    } catch {
      // Fallback
    }
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-xl mx-auto shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">No Projects Found</h2>
        <p className="text-xs text-slate-500 mt-2">Create a project first to execute tracking runs.</p>
        <Link href="/projects" className="mt-4 inline-block">
          <Button size="sm">Create Project</Button>
        </Link>
      </div>
    );
  }

  const currentProject = projects[0];
  let runs: any[] = [];
  try {
    const data = await getTrackingRuns(currentOrg.id, currentProject.id, 30);
    runs = data.runs;
  } catch {
    // Fallback
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tracking Runs History</h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete audit trail of AI model queries, token usage, latency, and exact cost in paise.
        </p>
      </div>

      <RunsClient
        initialRuns={runs}
        projects={projects}
        currentProjectId={currentProject.id}
        organizationId={currentOrg.id}
      />
    </div>
  );
}
