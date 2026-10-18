/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
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
});
