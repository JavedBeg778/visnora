import { cache } from 'react';
import { createClient } from './supabase/server';
import { getOrganizationsForUser } from '@/domain/organizations/service';
import { getProjects } from '@/domain/projects/service';
import { getBrands } from '@/domain/ai-visibility/brand-service';

/**
 * Request-scoped cached current user lookup.
 * Calling this across layout and multiple page components in the same request
 * will only query Supabase Auth once.
 */
export const getCurrentUser = cache(async () => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch (err) {
    return null;
  }
});

/**
 * Request-scoped cached organizations for a user.
 * Eliminates redundant database round trips between layout and page components.
 */
export const getCachedOrganizations = cache(async (userId: string) => {
  if (!userId || userId === '00000000-0000-0000-0000-000000000001') {
    return [];
  }
  try {
    return await getOrganizationsForUser(userId);
  } catch (err) {
    return [];
  }
});

/**
 * Request-scoped cached projects for an organization.
 */
export const getCachedProjects = cache(async (organizationId: string, userId: string = '00000000-0000-0000-0000-000000000001') => {
  if (!organizationId || organizationId === 'demo-org') {
    return [];
  }
  try {
    return await getProjects(organizationId, undefined, userId);
  } catch (err) {
    return [];
  }
});

/**
 * Request-scoped cached brands for an organization.
 */
export const getCachedBrands = cache(async (organizationId: string, projectId?: string) => {
  if (!organizationId || organizationId === 'demo-org') {
    return [];
  }
  try {
    return await getBrands(organizationId, projectId);
  } catch (err) {
    return [];
  }
});
