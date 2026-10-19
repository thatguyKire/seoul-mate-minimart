// The `contact` Edge Function (E5 in docs/SDD.md). Deno entry point: reads settings and wires
// the database to the handler. The logic, and its tests, are in handler.ts.
//
// Settings (Edge Function secrets; locally supabase/functions/.env):
//   ALLOWED_ORIGINS  comma-separated exact origins allowed to post, such as https://example.com
//   CONTACT_IP_SALT  random secret mixed into IP hashes for the rate limit
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from '@supabase/supabase-js';
import { createContactHandler } from './handler.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const handle = createContactHandler({
  allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  ipSalt: Deno.env.get('CONTACT_IP_SALT') ?? '',
  async rateLimit(key, max, windowSeconds) {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) throw new Error(`rate limit failed: ${error.code}`);
    return Number(data);
  },
  async insert(message) {
    const { error } = await supabase.from('contact_messages').insert({
      ...message,
      utm: message.utm ?? null,
    });
    if (error) throw new Error(`insert failed: ${error.code}`);
  },
  log(entry) {
    console.log(JSON.stringify({ function: 'contact', ...entry }));
  },
});

Deno.serve(handle);
