import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { FakeSupabase } from './support/fakeSupabase';

// Motion (D-038, NFR-ACC-04). Every other spec runs with reduced motion; these switch it on.
test.use({ reducedMotion: 'no-preference' });

const animationName = (locator: Locator) =>
  locator.evaluate((element) => getComputedStyle(element).animationName);

/**
 * Exits last a quarter of a second, too short to catch reliably from the test. Instead the page
 * notes the element's animation, and the saved privacy choice, the moment the exit begins.
 */
async function recordExit(locator: Locator, attribute: string) {
  await locator.evaluate((element, name) => {
    new MutationObserver((_, observer) => {
      if (!element.hasAttribute(name)) return;
      const root = document.documentElement;
      root.dataset.exitAnimation = getComputedStyle(element).animationName;
      root.dataset.exitConsent = localStorage.getItem('seoul-mate.consent') ?? 'none';
      observer.disconnect();
    }).observe(element, { attributes: true, attributeFilter: [name] });
  }, attribute);
}

async function scrollThroughPage(page: Page) {
  // Step down a screen at a time, as a reader would, so each reveal gets its turn.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  });
}

test.describe('desktop with a mouse', () => {
  test.skip(({ isMobile }) => isMobile, 'Rich motion is for desktops with a mouse');

  test('the hero rises in and menu cards wait below the fold, then reveal', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'rich');
    expect(await animationName(page.locator('.hero__title'))).toBe('rise-in');

    const cards = page.locator('.item-card');
    await expect(cards.first()).toBeVisible();
    const last = cards.last();
    await expect(last).toHaveAttribute('data-reveal', 'pending');
    await last.scrollIntoViewIfNeeded();
    await expect(last).toHaveAttribute('data-reveal', 'shown');
    await expect.poll(() => last.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test('a card lifts and swings on hover', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    // Below the hero, so it waits for the scroll like a reader's would.
    const card = page.locator('.item-card').first();
    await expect(card).toHaveAttribute('data-reveal', 'pending');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute('data-reveal', 'shown');
    await card.hover();
    expect(await animationName(card)).toBe('tag-swing');
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');
  });

  test('choosing a category brings its cards in afresh', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    await page.locator('.filter').scrollIntoViewIfNeeded();
    const noodles = page.locator('.item-card').filter({ hasText: 'Shin Ramyun' });
    await noodles.evaluate((element) => {
      element.dataset.before = '';
    });
    await page.getByRole('link', { name: 'Instant Noodles', exact: true }).click();
    // A new card, not the old one moved: it reveals like any card arriving in view.
    await expect(noodles).not.toHaveAttribute('data-before', /.*/);
    await expect(noodles).toHaveAttribute('data-reveal', 'shown');
    await expect.poll(() => noodles.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test('after scrolling through, nothing is left hidden and axe passes', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    await expect(page.locator('#contact')).toBeAttached();
    await scrollThroughPage(page);
    await expect(page.locator('[data-reveal="pending"]')).toHaveCount(0);
    // Let the last reveals finish before checking contrast.
    await page.waitForTimeout(900);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });

  test('printing straight away still prints every item (FR-68)', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    const last = page.locator('.item-card').last();
    await expect(last).toHaveAttribute('data-reveal', 'pending');
    await page.emulateMedia({ media: 'print' });
    await expect.poll(() => last.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });
});

test.describe('phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'Checks the touch-screen behaviour');

  test('get no entrances or scroll reveals', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    await expect(page.locator('.item-card').first()).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', /.*/);
    await expect(page.locator('[data-reveal]')).toHaveCount(0);
    expect(await animationName(page.locator('.hero__title'))).toBe('none');
  });

  test('the menu slides in, and slides out before closing (FR-61)', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const menu = page.locator('dialog.mobile-menu');
    await expect(menu).toBeVisible();
    expect(await animationName(menu)).toBe('drawer-in');

    await recordExit(menu, 'data-closing');
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('data-exit-animation', 'drawer-out');
    await expect(menu).not.toHaveAttribute('data-closing', /.*/);
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  });
});

test('the privacy banner rises in and drops away before the choice is saved', async ({ page }) => {
  await FakeSupabase.install(page);
  await page.goto('/en/');
  const banner = page.getByRole('region', { name: 'Your privacy' });
  expect(await animationName(banner)).toBe('banner-in');
  await recordExit(banner, 'data-leaving');
  await banner.getByRole('button', { name: 'Accept' }).click();
  await expect(banner).toBeHidden();
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-exit-animation', 'banner-out');
  await expect(html).toHaveAttribute('data-exit-consent', 'none');
  expect(await page.evaluate(() => localStorage.getItem('seoul-mate.consent'))).toBe('accepted');

  // Reopened from the footer, it starts over instead of staying on its way out.
  await page.getByRole('button', { name: 'Privacy choices' }).click();
  await expect(banner).toBeVisible();
  await expect(banner).not.toHaveAttribute('data-leaving', /.*/);
});

test.describe('reduced motion (NFR-ACC-04)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing moves, nothing waits and nothing is hidden', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    await expect(page.locator('.item-card').first()).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', /.*/);
    await expect(page.locator('[data-reveal]')).toHaveCount(0);
    expect(await animationName(page.locator('.hero__title'))).toBe('none');

    const banner = page.getByRole('region', { name: 'Your privacy' });
    expect(await animationName(banner)).toBe('none');
    await banner.getByRole('button', { name: 'Decline' }).click();
    // Gone at once: no exit animation to wait for.
    await expect(banner).toHaveCount(0, { timeout: 100 });
  });
});
