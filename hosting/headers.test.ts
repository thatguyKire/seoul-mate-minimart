import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  cacheControlFor,
  cacheRules,
  contentSecurityPolicy,
  defaultCacheControl,
  securityHeaders,
} from './headers';

const hosted = { supabaseUrl: 'https://abcdefgh.supabase.co', https: true };

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split('; ').map((directive) => {
      const [name = '', ...values] = directive.split(' ');
      return [name, values];
    }),
  );
}

describe('contentSecurityPolicy (NFR-SEC-11)', () => {
  it('allows scripts and styles from the site itself only, so no inline code runs', () => {
    const policy = directives(contentSecurityPolicy(hosted));
    expect(policy.get('default-src')).toEqual(["'none'"]);
    expect(policy.get('script-src')).toEqual(["'self'"]);
    expect(policy.get('style-src')).toEqual(["'self'"]);
    expect(policy.get('object-src')).toEqual(["'none'"]);
    expect(policy.get('base-uri')).toEqual(["'none'"]);
    expect(policy.get('frame-ancestors')).toEqual(["'none'"]);
    expect(contentSecurityPolicy(hosted)).not.toMatch(/unsafe-|\*/);
  });

  it('lets the page reach its own Supabase project, including the live-updates websocket', () => {
    const policy = directives(contentSecurityPolicy(hosted));
    expect(policy.get('connect-src')).toEqual([
      "'self'",
      'https://abcdefgh.supabase.co',
      'wss://abcdefgh.supabase.co',
    ]);
    expect(policy.get('img-src')).toEqual(["'self'", 'data:', 'https://abcdefgh.supabase.co']);
  });

  it('uses a plain websocket for a local stack and skips the https upgrade', () => {
    const local = contentSecurityPolicy({ supabaseUrl: 'http://127.0.0.1:54321', https: false });
    expect(directives(local).get('connect-src')).toEqual([
      "'self'",
      'http://127.0.0.1:54321',
      'ws://127.0.0.1:54321',
    ]);
    expect(local).not.toContain('upgrade-insecure-requests');
    expect(contentSecurityPolicy(hosted)).toMatch(/; upgrade-insecure-requests$/);
  });

  it('adds only the origin of the Sentry address', () => {
    const policy = contentSecurityPolicy({
      ...hosted,
      sentryIngestUrl: 'https://o1.ingest.sentry.io/api/2/envelope/',
    });
    expect(directives(policy).get('connect-src')).toContain('https://o1.ingest.sentry.io');
  });

  it('refuses an address that is not http or https', () => {
    expect(() =>
      contentSecurityPolicy({ supabaseUrl: 'javascript:alert(1)', https: true }),
    ).toThrow(/http or https/);
  });
});

describe('securityHeaders', () => {
  it('has every header SDD 5.5 lists', () => {
    expect(securityHeaders(hosted)).toEqual({
      'Content-Security-Policy': contentSecurityPolicy(hosted),
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'X-Frame-Options': 'DENY',
      'Cross-Origin-Opener-Policy': 'same-origin',
    });
  });
});

describe('cacheControlFor (ARCHITECTURE 5)', () => {
  it('caches hashed assets for a year and makes HTML check every time', () => {
    expect(cacheControlFor('/assets/index-Bx12.js')).toBe('public, max-age=31536000, immutable');
    expect(cacheControlFor('/index.html')).toBe('public, max-age=0, must-revalidate');
    expect(cacheControlFor('/theme-init.js')).toBe('public, max-age=0, must-revalidate');
    expect(cacheControlFor('/ko/')).toBe(defaultCacheControl);
    expect(cacheControlFor('/admin')).toBe(defaultCacheControl);
  });

  it('has a rule for every file in public/, so a new one needs a decision', () => {
    const listed = cacheRules.flatMap((rule) => rule.paths);
    for (const name of readdirSync('public')) expect(listed).toContain(`/${name}`);
  });
});
