// Visnora — Supabase Client for Browser (Client Components)
// Reference: docs/TECHNICAL_BLUEPRINT.md & docs/SECURITY.md

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

