import React from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { getOrganizationsForUser } from '../../../../../../packages/domain/organizations/service';
import { getTrackingRunById } from '../../../../../../packages/domain/ai-visibility/collection-engine';
import { RunDetailsClient } from '../../../../components/visibility/run-details-client';
import { Button } from '../../../../components/ui/button';

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  let run = null;
  try {
    run = await getTrackingRunById(id, currentOrg.id);
  } catch {
    notFound();
  }

  if (!run) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tracking Run Details</h1>
        <p className="text-xs text-slate-500 mt-1">
          Detailed inspection of prompt responses, brand mention sentiment, and citation sources.
        </p>
      </div>

      <RunDetailsClient initialRun={run} organizationId={currentOrg.id} />
    </div>
  );
}

