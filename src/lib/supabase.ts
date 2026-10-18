// The public site's connection to Supabase: database reads and live updates only.
//
// It uses Supabase's REST and Realtime clients directly instead of the full supabase-js
// client, which also bundles login and storage code that visitors never need (NFR-PERF-02).
// It never holds a login, so every request runs as the anonymous role: a staff member
// browsing the public menu still gets only published items (FR-07), and nothing is written
// to browser storage (NFR-PRIV-04). The admin panel creates its own full client (step 6).
import { PostgrestClient } from '@supabase/postgrest-js';
import { RealtimeClient } from '@supabase/realtime-js';
import type { Database } from './database.types';
import { env } from './env';

export interface PublicClient {
  rest: PostgrestClient<Database>;
  realtime: RealtimeClient;
}

let client: PublicClient | null | undefined;

function createPublicClient(url: string, key: string): PublicClient {
  const base = new URL(url);
  const realtimeUrl = new URL('realtime/v1', base);
  realtimeUrl.protocol = realtimeUrl.protocol.replace('http', 'ws');

  return {
    // The same headers supabase-js sends without a session.
    rest: new PostgrestClient<Database>(new URL('rest/v1', base).href, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      // A stalled phone connection ends in the error state instead of loading forever (FR-11).
      timeout: 15_000,
    }),
    realtime: new RealtimeClient(realtimeUrl.href, {
      params: { apikey: key },
      accessToken: () => Promise.resolve(key),
    }),
  };
}

/** The shared client, or null when this build has no Supabase settings. */
export function getPublicClient(): PublicClient | null {
  if (client === undefined) {
    client =
      env.supabaseUrl && env.supabaseAnonKey
        ? createPublicClient(env.supabaseUrl, env.supabaseAnonKey)
        : null;
  }
  return client;
}
