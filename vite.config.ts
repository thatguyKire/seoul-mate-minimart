/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { securityHeaders } from './hosting/headers';

/**
 * FR-33: a production build fails while any FAQ entry is still a placeholder marked "todo".
 * Production means VITE_APP_ENV=production, the setting only the live site's build uses.
 */
function faqReadyForProduction(appEnv: string | undefined): Plugin {
  return {
    name: 'faq-ready-for-production',
    apply: 'build',
    buildStart() {
      if (appEnv !== 'production') return;
      const drafts = ['en', 'fil', 'ko'].flatMap((locale) => {
        const path = `src/features/faq/faq.${locale}.json`;
        const entries = JSON.parse(readFileSync(path, 'utf8')) as {
          question: string;
          todo?: boolean;
        }[];
        return entries.filter((entry) => entry.todo).map((entry) => `${locale}: ${entry.question}`);
      });
      if (drafts.length > 0) {
        this.error(
          `FAQ entries still marked todo, so this production build stops (FR-33): ${drafts.join('; ')}`,
        );
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // End-to-end builds (`npm run build:e2e`) point at the local Supabase stack's address.
  // The tests either answer those requests themselves or, in CI, reach a real local stack,
  // whose settings CI passes in as environment variables. Variables already set win.
  if (mode === 'e2e') {
    process.env.VITE_SUPABASE_URL ??= 'http://127.0.0.1:54321';
    process.env.VITE_SUPABASE_ANON_KEY ??= 'e2e-placeholder-key';
    process.env.VITE_APP_ENV ??= 'local';
  }
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // SDD 5.5: the preview server sends the site's real headers, for the Supabase project this
  // mode's build talks to, so the end-to-end tests run under the real policy. Run it in the
  // same mode as the build: `vite preview --mode e2e` after `npm run build:e2e`.
  const headers = securityHeaders({ supabaseUrl: env.VITE_SUPABASE_URL, https: false });
  // The dev server leaves the policy out, because Vite's live reloading injects the inline
  // scripts and styles that it forbids (D-039).
  const devHeaders = Object.fromEntries(
    Object.entries(headers).filter(([name]) => name !== 'Content-Security-Policy'),
  );

  return {
    plugins: [react(), faqReadyForProduction(env.VITE_APP_ENV)],
    server: { headers: devHeaders },
    preview: { headers },
    build: {
      // No public source maps (NFR-SEC-07). Step 10 uploads hidden maps to Sentry from CI.
      sourcemap: false,
      rolldownOptions: {
        output: {
          // No console output in production (SDD section 6).
          minify: { compress: { dropConsole: true } },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: [
        'src/**/*.test.{ts,tsx}',
        'supabase/functions/**/*.test.ts',
        'hosting/**/*.test.ts',
        'scripts/**/*.test.mjs',
      ],
    },
  };
});
