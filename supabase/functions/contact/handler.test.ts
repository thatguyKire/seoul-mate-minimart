// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createContactHandler, type ContactDeps } from './handler.ts';

const origin = 'https://seoulmate.example';

function setup(overrides: Partial<ContactDeps> = {}) {
  const deps = {
    allowedOrigins: [origin],
    ipSalt: 'test-salt',
    rateLimit: vi.fn<ContactDeps['rateLimit']>(() => Promise.resolve(0)),
    insert: vi.fn<ContactDeps['insert']>(() => Promise.resolve()),
    log: vi.fn<ContactDeps['log']>(),
    ...overrides,
  };
  return { deps, handle: createContactHandler(deps) };
}

const valid = {
  name: 'Ana Santos',
  contact: '0917 123 4567',
  message: 'Do you have Buldak carbonara?\nI can pick it up tomorrow.',
  locale: 'en',
  website: '',
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://project.supabase.co/functions/v1/contact', {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.7, 10.0.0.1',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('contact function (SDD 3.2)', () => {
  it('stores a valid message and answers ok, with CORS for the site only', async () => {
    const { deps, handle } = setup();
    const response = await handle(post({ ...valid, utm: { utm_source: 'facebook' } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('access-control-allow-origin')).toBe(origin);
    expect(response.headers.get('vary')).toBe('Origin');
    expect(deps.insert).toHaveBeenCalledWith({
      name: 'Ana Santos',
      contact: '0917 123 4567',
      message: 'Do you have Buldak carbonara?\nI can pick it up tomorrow.',
      locale: 'en',
      utm: { utm_source: 'facebook' },
    });
  });

  it('passes code in a message on as plain data, for a parameterized insert (BRIEF 8)', async () => {
    const { deps, handle } = setup();
    const message = "'); DROP TABLE contact_messages; --\n<script>alert(1)</script>";
    const response = await handle(post({ ...valid, message }));
    expect(response.status).toBe(200);
    expect(deps.insert).toHaveBeenCalledWith(expect.objectContaining({ message }));
  });

  it('refuses other origins, before reading anything (NFR-SEC-12)', async () => {
    const { deps, handle } = setup();
    const response = await handle(post(valid, { origin: 'https://evil.example' }));
    expect(response.status).toBe(403);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(deps.insert).not.toHaveBeenCalled();
  });

  it('answers the browser preflight for the site', async () => {
    const { handle } = setup();
    const response = await handle(
      new Request('https://project.supabase.co/functions/v1/contact', {
        method: 'OPTIONS',
        headers: { origin },
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toBe('POST');
  });

  it('refuses anything that is not JSON, or too large', async () => {
    const { handle } = setup();
    expect((await handle(post('name=x', { 'content-type': 'text/plain' }))).status).toBe(415);
    const big = { ...valid, message: 'x'.repeat(9000) };
    const response = await handle(post(big));
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'too_large' });
    expect((await handle(post('{not json'))).status).toBe(400);
  });

  it('names the invalid fields, and nothing else (NFR-SEC-09, NFR-SEC-15)', async () => {
    const { deps, handle } = setup();
    const response = await handle(
      post({ ...valid, name: ' ', contact: '12345', message: 'x'.repeat(1001) }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid',
      fields: ['name', 'contact', 'message'],
    });
    expect(deps.insert).not.toHaveBeenCalled();
  });

  it('accepts an email or a Philippine mobile number only', async () => {
    const { handle } = setup();
    for (const contact of ['ana@example.com', '+63 917 123 4567', '09171234567']) {
      expect((await handle(post({ ...valid, contact }))).status, contact).toBe(200);
    }
    for (const contact of ['123456789', 'ana@example', '0817 123 4567']) {
      expect((await handle(post({ ...valid, contact }))).status, contact).toBe(400);
    }
  });

  it('refuses unknown fields, odd UTM values and control characters', async () => {
    const { handle } = setup();
    expect((await handle(post({ ...valid, role: 'admin' }))).status).toBe(400);
    expect((await handle(post({ ...valid, utm: { utm_source: '<script>' } }))).status).toBe(400);
    expect((await handle(post({ ...valid, utm: { gclid: 'x' } }))).status).toBe(400);
    expect((await handle(post({ ...valid, name: 'Ana\u0000' }))).status).toBe(400);
  });

  it('answers ok to a filled honeypot and stores nothing (NFR-SEC-17)', async () => {
    const { deps, handle } = setup();
    const response = await handle(post({ ...valid, website: 'https://spam.example' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(deps.insert).not.toHaveBeenCalled();
    expect(deps.rateLimit).not.toHaveBeenCalled();
  });

  it('limits each IP to 5 messages in 10 minutes, with Retry-After (NFR-SEC-16)', async () => {
    const { deps, handle } = setup({ rateLimit: vi.fn(() => Promise.resolve(420)) });
    const response = await handle(post(valid));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('420');
    expect(await response.json()).toEqual({ error: 'rate_limited' });
    expect(deps.insert).not.toHaveBeenCalled();
    const [key, max, windowSeconds] = vi.mocked(deps.rateLimit).mock.calls[0] ?? [];
    expect([max, windowSeconds]).toEqual([5, 600]);
    // A salted hash of the first forwarded address, never the address itself.
    expect(key).toMatch(/^contact:[0-9a-f]{64}$/);
    expect(key).not.toContain('203.0.113.7');
  });

  it('hides failures behind a plain server error, and logs no personal data', async () => {
    const { deps, handle } = setup({ insert: vi.fn(() => Promise.reject(new Error('db down'))) });
    const response = await handle(post(valid));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'server' });
    const logged = JSON.stringify(vi.mocked(deps.log).mock.calls);
    expect(logged).not.toContain('Ana');
    expect(logged).not.toContain('203.0.113.7');
    expect(logged).toContain('"status":500');
  });

  it('refuses to work without its salt, rather than storing unsalted hashes', async () => {
    const { deps, handle } = setup({ ipSalt: '' });
    expect((await handle(post(valid))).status).toBe(500);
    expect(deps.rateLimit).not.toHaveBeenCalled();
  });
});
