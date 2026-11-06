// Visnora — Supabase Admin Client (Server-Only Service Role)
// STRICT SECURITY: Never expose to browser bundles or client components!
// Reference: docs/SECURITY.md

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    // Fallback gracefully in development/test if service role key is not configured
    return createSupabaseClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

