// Renders the PNG icons in public/ from public/favicon.svg (FR-69). Run again whenever the
// favicon changes: node scripts/generate-icons.mjs
// Uses Playwright's browser: the installed Microsoft Edge on Windows, otherwise Chromium.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync('public/favicon.svg', 'utf8');
// iOS rounds the corners of touch icons itself and fills transparent ones with black.
const squareSvg = svg.replace(/\s+rx="[^"]*"/, '');

const icons = [
  { file: 'public/favicon-32.png', size: 32, source: svg },
  { file: 'public/apple-touch-icon.png', size: 180, source: squareSvg },
  { file: 'public/icon-192.png', size: 192, source: svg },
  { file: 'public/icon-512.png', size: 512, source: svg },
];

const browser = await chromium.launch(process.platform === 'win32' ? { channel: 'msedge' } : {});
const page = await browser.newPage();
for (const { file, size, source } of icons) {
  await page.setViewportSize({ width: size, height: size });
  const sized = source.replace('<svg ', `<svg width="${size}" height="${size}" `);
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">${sized}</body></html>`,
  );
  writeFileSync(file, await page.screenshot({ omitBackground: true }));
  console.log(`wrote ${file}`);
}
await browser.close();
