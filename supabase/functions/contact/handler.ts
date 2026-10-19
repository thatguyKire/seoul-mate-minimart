// The `contact` Edge Function's logic (SDD 2.4 and 3.2), kept free of Deno and Supabase
// imports so it runs in unit tests and in the end-to-end fake as well. index.ts wires it up.
//
// Order of checks, cheapest first: origin, method, content type, size, JSON, schema, honeypot,
// rate limit, then the insert. Refusals carry no details beyond the field names (NFR-SEC-15).
import {
  contactLimits,
  contactSchema,
  invalidFields,
  type ContactMessage,
} from '../_shared/contactSchema.ts';

export interface ContactDeps {
  /** Exact origins allowed to post, such as https://seoulmate.example (NFR-SEC-12). */
  allowedOrigins: readonly string[];
  /** Secret salt for hashing IP addresses, so they are never stored in plain form. */
  ipSalt: string;
  /** Counts one hit; returns 0 if allowed, else seconds until the window resets (check_rate_limit). */
  rateLimit: (key: string, max: number, windowSeconds: number) => Promise<number>;
  /** Stores the message with the service role. */
  insert: (message: Omit<ContactMessage, 'website'>) => Promise<void>;
  /** Request ID, status and duration only: never bodies, IP addresses or message text. */
  log: (entry: { requestId: string; status: number; durationMs: number }) => void;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createContactHandler(deps: ContactDeps) {
  return async function handle(request: Request): Promise<Response> {
    const started = Date.now();
    const requestId = crypto.randomUUID();
    const origin = request.headers.get('origin');
    const allowed = origin !== null && deps.allowedOrigins.includes(origin);

    const headers = new Headers({ Vary: 'Origin', 'X-Request-Id': requestId });
    if (allowed) headers.set('Access-Control-Allow-Origin', origin);

    function reply(status: number, body?: unknown, extra: Record<string, string> = {}) {
      for (const [name, value] of Object.entries(extra)) headers.set(name, value);
      if (body !== undefined) headers.set('Content-Type', 'application/json');
      deps.log({ requestId, status, durationMs: Date.now() - started });
      return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
    }

    if (!allowed) return reply(403, { error: 'forbidden' });
    if (request.method === 'OPTIONS') {
      return reply(204, undefined, {
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
        'Access-Control-Max-Age': '86400',
      });
    }
    if (request.method !== 'POST')
      return reply(405, { error: 'method' }, { Allow: 'POST, OPTIONS' });
    if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
      return reply(415, { error: 'unsupported' });
    }
    if (Number(request.headers.get('content-length') ?? 0) > contactLimits.maxBodyBytes) {
      return reply(413, { error: 'too_large' });
    }

    let raw: string;
    try {
      raw = await request.text();
    } catch {
      return reply(400, { error: 'invalid', fields: [] });
    }
    if (new TextEncoder().encode(raw).byteLength > contactLimits.maxBodyBytes) {
      return reply(413, { error: 'too_large' });
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return reply(400, { error: 'invalid', fields: [] });
    }
    const parsed = contactSchema.safeParse(json);
    if (!parsed.success) {
      return reply(400, { error: 'invalid', fields: invalidFields(parsed.error) });
    }

    // Filled by a bot: answer as if all went well, store nothing (NFR-SEC-17).
    if (parsed.data.website !== '') return reply(200, { ok: true });

    if (!deps.ipSalt) return reply(500, { error: 'server' });
    const forwarded = (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() ?? '';
    const ip = forwarded === '' ? 'unknown' : forwarded;
    try {
      const retryAfter = await deps.rateLimit(
        `contact:${await sha256Hex(`${deps.ipSalt}:${ip}`)}`,
        contactLimits.perWindow,
        contactLimits.windowSeconds,
      );
      if (retryAfter > 0) {
        return reply(429, { error: 'rate_limited' }, { 'Retry-After': String(retryAfter) });
      }
      const { name, contact, message, locale, utm } = parsed.data;
      await deps.insert({ name, contact, message, locale, utm });
    } catch {
      return reply(500, { error: 'server' });
    }
    return reply(200, { ok: true });
  };
}
