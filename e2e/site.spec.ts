import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { FakeSupabase } from './support/fakeSupabase';

async function storageKeys(page: Page) {
  return page.evaluate(() => ({
    local: Object.keys(localStorage).sort(),
    session: Object.keys(sessionStorage).sort(),
  }));
}

async function openThemeControl(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  return page.getByRole('button', { name: 'Dark theme' }).locator('visible=true');
}

test.describe('privacy banner, consent and campaign details (FR-54 to FR-57, NFR-PRIV-04)', () => {
  test('nothing is stored before a choice; Accept saves the campaign details for the session', async ({
    page,
  }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/?utm_source=facebook&utm_campaign=Buldak+week&fbclid=tracking123');
    const banner = page.getByRole('region', { name: 'Your privacy' });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/en/privacy',
    );
    expect(await storageKeys(page)).toEqual({ local: [], session: [] });

    // Equal prominence: same size and the same style.
    const accept = banner.getByRole('button', { name: 'Accept' });
    const decline = banner.getByRole('button', { name: 'Decline' });
    const [a, d] = await Promise.all([accept.boundingBox(), decline.boundingBox()]);
    expect(a?.width).toBeCloseTo(d?.width ?? 0, 0);
    expect(a?.height).toBeCloseTo(d?.height ?? 0, 0);
    expect(await accept.getAttribute('class')).toBe(await decline.getAttribute('class'));

    await accept.click();
    await expect(banner).toBeHidden();
    expect(await storageKeys(page)).toEqual({
      local: ['seoul-mate.consent'],
      session: ['seoul-mate.utm'],
    });
    expect(
      JSON.parse((await page.evaluate(() => sessionStorage.getItem('seoul-mate.utm'))) ?? ''),
    ).toEqual({ utm_source: 'facebook', utm_campaign: 'Buldak week' });

    await page.reload();
    await expect(page.locator('.item-card').first()).toBeVisible();
    await expect(banner).toBeHidden();
  });

  test('Decline keeps nothing, and the choice can be changed from the footer (FR-56)', async ({
    page,
  }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/?utm_source=facebook');
    await page.getByRole('button', { name: 'Decline' }).click();
    expect(await storageKeys(page)).toEqual({ local: ['seoul-mate.consent'], session: [] });

    await page.getByRole('button', { name: 'Privacy choices' }).click();
    const banner = page.getByRole('region', { name: 'Your privacy' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: 'Accept' }).click();
    expect(await page.evaluate(() => localStorage.getItem('seoul-mate.consent'))).toBe('accepted');
  });

  test('the banner, back to top and Messenger button never overlap (FR-63, FR-65)', async ({
    page,
  }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    await expect(page.locator('.item-card').first()).toBeVisible();
    const top = page.getByRole('button', { name: 'Back to top' });
    await expect(top).toBeHidden();

    await page.evaluate(() => {
      window.scrollTo(0, window.innerHeight * 1.5);
    });
    await expect(top).toBeVisible();
    const boxes = await Promise.all(
      [
        top,
        page.locator('.floating-contact'),
        page.getByRole('region', { name: 'Your privacy' }),
      ].map((locator) => locator.boundingBox()),
    );
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        if (!a || !b) throw new Error('missing box');
        const overlap =
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height;
        expect(overlap, `boxes ${String(i)} and ${String(j)}`).toBe(false);
      }
    }

    await top.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.locator('main')).toBeFocused();
  });
});

test.describe('theme (FR-66)', () => {
  test.use({ colorScheme: 'dark' });

  test('follows the system setting before paint, and remembers a choice', async ({
    page,
    isMobile,
  }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // The theme is set by a file in <head>, before the app script and any paint.
    const order = await page.evaluate(() =>
      [...document.head.querySelectorAll('script')].map((s) => s.getAttribute('src') ?? 'inline'),
    );
    expect(order[0]).toBe('/theme-init.js');

    const toggle = await openThemeControl(page, isMobile);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      'rgb(255, 255, 255)',
    );
  });
});

test.describe('legal pages (FR-58, FR-59)', () => {
  test('the privacy policy and terms open from the footer, in the page language', async ({
    page,
  }) => {
    await FakeSupabase.install(page);
    await page.goto('/fil/');
    await page.getByRole('link', { name: 'Patakaran sa privacy' }).first().click();
    await expect(page).toHaveURL(/\/fil\/privacy$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Patakaran sa Privacy');
    await expect(page.getByText('Huling na-update:')).toContainText('Oktubre 19, 2026');
    await expect(page.getByText('ang bersyong English ang masusunod')).toBeVisible();
    await expect(page.getByText('abogado')).toBeVisible();
    await expect(page.getByText('Republic Act No. 10173').first()).toBeVisible();
    await expect(page).toHaveTitle('Patakaran sa Privacy | Seoul-Mate Minimart');

    await page.goto('/en/terms');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms of Use');
    await expect(page.getByText('pay with cash or GCash')).toBeVisible();
    await expect(page.getByText('0939 126 5349').first()).toBeVisible();
  });

  for (const path of ['/en/privacy', '/ko/terms']) {
    test(`${path} has no axe violations and shows scroll progress (FR-64)`, async ({ page }) => {
      await FakeSupabase.install(page);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);

      const progress = page.locator('.scroll-progress');
      const scale = () =>
        progress.evaluate((bar) => getComputedStyle(bar).getPropertyValue('--progress').trim());
      await expect.poll(scale).toBe('0');
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await expect.poll(scale).toBe('1');
    });
  }
});

test('the FAQ opens with the keyboard, and drafts are labelled outside production (FR-33)', async ({
  page,
}) => {
  await FakeSupabase.install(page);
  await page.goto('/en/#faq');
  const question = page.locator('summary').filter({ hasText: 'How do I pay?' });
  await question.focus();
  await expect(question).toBeFocused();
  await expect(page.getByText('Pay with cash or GCash when you pick up your order.')).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Pay with cash or GCash when you pick up your order.')).toBeVisible();
  await expect(page.locator('.faq__item').first().locator('.tag')).toHaveText('Draft');
});

test('printing the menu keeps names, prices and stock only (FR-68)', async ({ page }) => {
  await FakeSupabase.install(page);
  await page.goto('/en/');
  await expect(page.locator('.item-card').first()).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  for (const selector of [
    '.site-header',
    '.hero',
    '.search',
    '.filter',
    '.floating-stack',
    '.site-footer',
    '.item-photo',
    '.faq',
    '.visit',
    '.contact',
  ]) {
    await expect(page.locator(selector).first(), selector).toBeHidden();
  }
  const banana = page.locator('.item-card').filter({ hasText: 'Banana Milk' });
  await expect(banana).toContainText('₱75.00');
  await expect(banana).toContainText('Out of stock');
});

test('favicons, Apple touch icon and web manifest are served (FR-69)', async ({
  page,
  request,
}) => {
  await FakeSupabase.install(page);
  await page.goto('/en/');
  const links = await page.evaluate(() =>
    [...document.head.querySelectorAll('link[rel*="icon"], link[rel="manifest"]')].map(
      (link) => `${link.getAttribute('rel') ?? ''} ${link.getAttribute('href') ?? ''}`,
    ),
  );
  expect(links).toEqual([
    'icon /favicon.svg',
    'icon /favicon-32.png',
    'apple-touch-icon /apple-touch-icon.png',
    'manifest /manifest.webmanifest',
  ]);
  for (const path of [
    '/favicon.svg',
    '/favicon-32.png',
    '/apple-touch-icon.png',
    '/icon-192.png',
    '/icon-512.png',
  ]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  const manifest = (await (await request.get('/manifest.webmanifest')).json()) as {
    name: string;
    icons: { sizes: string }[];
  };
  expect(manifest.name).toBe('Seoul-Mate Minimart');
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(['any', '192x192', '512x512']);
});
