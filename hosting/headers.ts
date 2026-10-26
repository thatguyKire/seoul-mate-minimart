// The site's HTTP response headers and caching rules, in one place for any host (ARCHITECTURE 4).
// Step 10 translates them into the chosen host's format. Until then, the local preview server
// sends the security headers, so the end-to-end tests run under the real policy (SDD 5.5).

export interface HeaderOptions {
  /** The Supabase project the build talks to, from VITE_SUPABASE_URL. */
  supabaseUrl?: string | undefined;
  /** Sentry's ingest address, once step 10 adds Sentry. */
  sentryIngestUrl?: string | undefined;
  /**
   * False on the local preview server, which runs over plain http. There,
   * `upgrade-insecure-requests` would send the page's own requests to an https address
   * that does not exist.
   */
  https: boolean;
}

/** The origin of an http or https address, refusing anything else. */
function webOrigin(value: string, name: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${name} must be an http or https address, got ${url.protocol}`);
  }
  return url;
}

/** NFR-SEC-11: no inline scripts or styles, nothing from other sites but Supabase and Sentry. */
export function contentSecurityPolicy(options: HeaderOptions): string {
  const supabase = options.supabaseUrl
    ? webOrigin(options.supabaseUrl, 'VITE_SUPABASE_URL')
    : undefined;
  // Live updates use a websocket to the same host (SDD 7.1).
  const realtime =
    supabase && `${supabase.protocol === 'https:' ? 'wss:' : 'ws:'}//${supabase.host}`;
  const sentry = options.sentryIngestUrl
    ? webOrigin(options.sentryIngestUrl, 'the Sentry ingest address').origin
    : undefined;

  const directives: (string | undefined)[][] = [
    ['default-src', "'none'"],
    ['script-src', "'self'"],
    ['style-src', "'self'"],
    // data: is for the two-factor QR code, an SVG image (D-035).
    ['img-src', "'self'", 'data:', supabase?.origin],
    ['font-src', "'self'"],
    ['connect-src', "'self'", supabase?.origin, realtime, sentry],
    ['manifest-src', "'self'"],
    ['frame-ancestors', "'none'"],
    ['base-uri', "'none'"],
    ['form-action', "'self'"],
    ['object-src', "'none'"],
  ];
  if (options.https) directives.push(['upgrade-insecure-requests']);
  return directives.map((directive) => directive.filter(Boolean).join(' ')).join('; ');
}

/** Sent with every response (SDD 5.5). */
export function securityHeaders(options: HeaderOptions): Record<string, string> {
  return {
    'Content-Security-Policy': contentSecurityPolicy(options),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    // For older browsers that ignore frame-ancestors.
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}

export interface CacheRule {
  /** Paths as the browser asks for them; `*` matches the rest of the path. */
  paths: string[];
  cacheControl: string;
}

/**
 * ARCHITECTURE 5. The first rule whose path matches wins. Anything else, such as `/ko/` or
 * `/admin`, is the app's HTML and gets `defaultCacheControl`. Menu data comes live from
 * Supabase and is never cached here; photos get their caching when uploaded.
 */
export const cacheRules: CacheRule[] = [
  {
    // Vite puts a content hash in every file name under /assets/.
    paths: ['/assets/*'],
    cacheControl: 'public, max-age=31536000, immutable',
  },
  {
    paths: ['/index.html', '/theme-init.js'],
    cacheControl: 'public, max-age=0, must-revalidate',
  },
  {
    paths: [
      '/favicon.svg',
      '/favicon-32.png',
      '/apple-touch-icon.png',
      '/icon-192.png',
      '/icon-512.png',
      '/manifest.webmanifest',
    ],
    cacheControl: 'public, max-age=86400',
  },
];

export const defaultCacheControl = 'public, max-age=0, must-revalidate';

/** The Cache-Control value for a request path. */
export function cacheControlFor(path: string): string {
  const rule = cacheRules.find((candidate) =>
    candidate.paths.some((pattern) =>
      pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern,
    ),
  );
  return rule?.cacheControl ?? defaultCacheControl;
}
