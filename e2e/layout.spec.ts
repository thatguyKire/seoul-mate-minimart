import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { FakeSupabase } from './support/fakeSupabase';

test.describe('accessibility (NFR-ACC-01 to NFR-ACC-03)', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const path of ['/en/', '/ko/']) {
      test(`${path} has no axe violations in the ${colorScheme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await FakeSupabase.install(page);
        await page.goto(path);
        await expect(page.locator('.item-card').first()).toBeVisible();
        await expect(page.locator('.item-card--skeleton')).toHaveCount(0);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          results.violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
          ),
        ).toEqual([]);
      });
    }
  }

  test('the error state has no axe violations', async ({ page }) => {
    const fake = await FakeSupabase.install(page);
    fake.rest = 'error';
    await page.goto('/en/');
    await expect(page.getByRole('alert')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test('the skip link is the first thing to focus, and visible when focused (FR-62)', async ({
  page,
}) => {
  await FakeSupabase.install(page);
  await page.goto('/en/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('jumping to a section never hides its heading under the sticky header (FR-60)', async ({
  page,
  isMobile,
}) => {
  await FakeSupabase.install(page);
  await page.goto('/en/');
  await expect(page.locator('.item-card').first()).toBeVisible();

  if (isMobile) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Visit us' }).click();
  } else {
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Visit us' })
      .click();
  }

  const heading = page.getByRole('heading', { level: 2, name: 'Visit us' });
  await expect(heading).toBeInViewport();
  const header = await page.locator('.site-header').boundingBox();
  const target = await heading.boundingBox();
  expect(header && target && target.y >= header.y + header.height).toBe(true);
});

test.describe('mobile menu (FR-61)', () => {
  test.skip(({ isMobile }) => !isMobile, 'The menu button shows on small screens only');

  test('opens from the menu button, keeps focus inside and closes on Escape', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    const button = page.getByRole('button', { name: 'Open menu' });
    await button.click();
    const dialog = page.getByRole('dialog', { name: 'Site menu' });
    await expect(dialog).toBeVisible();

    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab');
      const insideDialog = await page.evaluate(
        () =>
          document.activeElement === document.body ||
          Boolean(document.activeElement?.closest('dialog')),
      );
      expect(insideDialog).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  });
});

test('store information: hours, call link and copy buttons (FR-22 to FR-25)', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Clipboard permissions are Chromium-only in Playwright');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await FakeSupabase.install(page);
  await page.goto('/en/');

  const hours = page.getByRole('table', { name: 'Opening hours' });
  await expect(hours.getByRole('row', { name: /Monday/ })).toContainText(
    '9:00 AM to 2:00 AM (next day)',
  );
  await expect(hours.getByRole('row', { name: /Saturday/ })).toContainText('9:00 AM to 2:00 PM');

  const visit = page.getByRole('region', { name: 'Visit us' });
  await expect(visit.getByRole('link', { name: '0939 126 5349' })).toHaveAttribute(
    'href',
    'tel:+639391265349',
  );

  await visit.getByRole('button', { name: 'Copy address' }).click();
  await expect(visit.getByRole('status').first()).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'Quezon St., Legaspi Compound, Masbate City, Masbate, Philippines',
  );
});

test('the floating contact button opens Messenger and stays clear of the footer text (FR-27, FR-65)', async ({
  page,
}) => {
  await FakeSupabase.install(page);
  await page.goto('/en/');
  const button = page.locator('.floating-contact');
  await expect(button).toHaveAttribute('href', 'https://m.me/61594474910928');
  await expect(button).toHaveAccessibleName('Message us on Messenger');

  await page.keyboard.press('End');
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  const floating = await button.boundingBox();
  const copyright = await page.locator('.site-footer__copyright').boundingBox();
  expect(floating && copyright && copyright.y + copyright.height <= floating.y).toBe(true);
});

test('before consent the page contacts only the site and Supabase (NFR-PRIV-02)', async ({
  page,
}) => {
  const hosts = new Set<string>();
  page.on('request', (request) => hosts.add(new URL(request.url()).host));
  await FakeSupabase.install(page);
  await page.goto('/en/');
  await expect(page.locator('.item-card').first()).toBeVisible();
  await page.goto('/ko/');
  await expect(page.locator('.item-card').first()).toBeVisible();
  expect([...hosts].sort()).toEqual(['127.0.0.1:4173', '127.0.0.1:54321']);
});

test('no em dashes and no console errors on the page (BRIEF 5)', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await FakeSupabase.install(page);

  for (const path of ['/en/', '/fil/', '/ko/']) {
    await page.goto(path);
    await expect(page.locator('.item-card').first()).toBeVisible();
    expect(await page.locator('body').innerText()).not.toContain('—');
  }
  expect(errors).toEqual([]);
});
