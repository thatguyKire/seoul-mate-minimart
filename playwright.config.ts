import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
// Locally, use the Microsoft Edge already installed on Windows, so no browser download is needed.
// CI installs Playwright's own Chromium.
const browser = isCI ? {} : { channel: 'msedge' };

export default defineConfig({
  testDir: './e2e',
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], ...browser } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...browser } },
  ],
  // Tests run against the production build: run `npm run build:e2e` first. The preview server
  // sends the site's real security headers (SDD 5.5).
  // On Windows, Playwright takes about two minutes to stop a server it started, so run
  // `npm run preview:e2e` in another terminal first; the tests then reuse that server.
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js preview --mode e2e --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !isCI,
  },
});
