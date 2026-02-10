/**
 * Shared Supabase client factory for Edge Functions
 * Creates admin clients with service role key for bypassing RLS
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.93.3';
import { env } from './env.ts';

/**
 * Create a Supabase admin client using the service role key
 * Bypasses RLS for server-side operations
 */
export function createAdminClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Re-export for convenience
export { createClient, type SupabaseClient };
