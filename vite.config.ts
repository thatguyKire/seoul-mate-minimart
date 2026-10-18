/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // End-to-end builds (`npm run build:e2e`) point at the local Supabase stack's address.
  // The tests either answer those requests themselves or, in CI, reach a real local stack,
  // whose settings CI passes in as environment variables. Variables already set win.
  if (mode === 'e2e') {
    process.env.VITE_SUPABASE_URL ??= 'http://127.0.0.1:54321';
    process.env.VITE_SUPABASE_ANON_KEY ??= 'e2e-placeholder-key';
    process.env.VITE_APP_ENV ??= 'local';
  }

  return {
    plugins: [react()],
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
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
