// The admin panel's Supabase client: the full supabase-js client, with a login session.
// Loaded only under /admin, so visitors never download it (NFR-PERF-02, D-030).
// The session travels in the Authorization header, never a cookie, so cross-site request
// forgery cannot use it (D-022). It is kept in localStorage under its own key.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';
import { env } from '../../lib/env';

export type AdminClient = SupabaseClient<Database>;

let client: AdminClient | null | undefined;

/** The shared admin client, or null when this build has no Supabase settings. */
export function getAdminClient(): AdminClient | null {
  if (client === undefined) {
    client =
      env.supabaseUrl && env.supabaseAnonKey
        ? createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false,
              storageKey: 'seoul-mate.admin.session',
            },
          })
        : null;
  }
  return client;
}
