import { expect, test, type Page } from './support/test';
import { FakeSupabase } from './support/fakeSupabase';

function card(page: Page, name: string) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 4, name, exact: true }) });
}

test.describe('menu (FR-01 to FR-11)', () => {
  test('shows published items by category with prices and availability', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');

    await expect(page.getByRole('heading', { level: 3, name: 'Instant Noodles' })).toBeVisible();
    const banana = card(page, 'Banana Milk');
    await expect(banana).toContainText('₱75.00');
    await expect(banana).toContainText('Out of stock');
    await expect(banana).toContainText('Photo coming soon');
    await expect(card(page, 'Honey Butter Chip')).toContainText('In stock');
    await expect(page.getByText('Oct 18, 2026, 8:05 PM')).toBeVisible();
  });

  test('updates availability live, without a reload (FR-06)', async ({ page }) => {
    const fake = await FakeSupabase.install(page);
    await page.goto('/en/');
    const banana = card(page, 'Banana Milk');
    await expect(banana).toContainText('Out of stock');
    // Marks this page, so a reload would be noticed.
    await page.evaluate(() => {
      (window as unknown as { notReloaded: boolean }).notReloaded = true;
    });
    await fake.subscribed();

    fake.changeItem('Banana Milk', { is_available: true });
    await expect(banana).toContainText('In stock', { timeout: 5000 });

    fake.changeItem('Shin Ramyun', { price_centavos: 7500 });
    await expect(card(page, 'Shin Ramyun')).toContainText('₱75.00', { timeout: 5000 });

    fake.hideItem('Sheet Mask');
    await expect(card(page, 'Sheet Mask')).toHaveCount(0, { timeout: 5000 });

    expect(
      await page.evaluate(() => (window as unknown as { notReloaded?: boolean }).notReloaded),
    ).toBe(true);
  });

  test('says live updates are paused and keeps checking while disconnected (FR-09)', async ({
    page,
  }) => {
    test.slow();
    const fake = await FakeSupabase.install(page);
    await page.goto('/en/');
    await expect(card(page, 'Banana Milk')).toContainText('Out of stock');
    await fake.subscribed();

    fake.dropRealtime();
    await expect(page.getByText('Live updates paused. Retrying.')).toBeVisible();

    // No event arrives while disconnected; the 10-second check finds the change.
    fake.changeItem('Banana Milk', { is_available: true }, { notify: false });
    await expect(card(page, 'Banana Milk')).toContainText('In stock', { timeout: 15_000 });

    fake.restoreRealtime();
    await expect(page.getByText('Live updates paused. Retrying.')).toBeHidden({ timeout: 20_000 });
  });

  test('keeps updating live after leaving the menu and coming straight back', async ({ page }) => {
    const fake = await FakeSupabase.install(page);
    await page.goto('/en/nothing-here');
    await page.getByRole('link', { name: 'Go to the menu' }).click();
    await fake.subscribed(1);

    // Unmounts the menu and mounts it again at once, reusing the channel name.
    await page.goBack();
    await page.goForward();
    const banana = card(page, 'Banana Milk');
    await expect(banana).toContainText('Out of stock');
    await fake.subscribed(2);

    fake.changeItem('Banana Milk', { is_available: true });
    await expect(banana).toContainText('In stock', { timeout: 5000 });
  });

  test('shows skeleton cards while loading (FR-10)', async ({ page }) => {
    const fake = await FakeSupabase.install(page);
    fake.rest = 'hold';
    await page.goto('/en/');
    await expect(page.locator('.item-card--skeleton')).toHaveCount(6);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    fake.release();
    await expect(card(page, 'Shin Ramyun')).toBeVisible();
    await expect(page.locator('.item-card--skeleton')).toHaveCount(0);
  });

  test('shows a plain error with ways to reach the store when the menu cannot load (FR-11)', async ({
    page,
  }) => {
    const fake = await FakeSupabase.install(page);
    fake.rest = 'error';
    await page.goto('/en/');

    const alert = page.getByRole('alert');
    await expect(alert).toContainText("We couldn't load the menu right now.");
    await expect(alert).not.toContainText('PGRST000');
    await expect(alert).not.toContainText('internal test failure');
    await expect(alert.getByRole('link', { name: 'Ask on Messenger' })).toHaveAttribute(
      'href',
      'https://m.me/61594474910928',
    );
    await expect(alert.getByRole('link', { name: '0939 126 5349' })).toHaveAttribute(
      'href',
      'tel:+639391265349',
    );

    fake.rest = 'ok';
    await alert.getByRole('button', { name: 'Try again' }).click();
    await expect(card(page, 'Shin Ramyun')).toBeVisible();
  });

  test('filters by category through the address, and back to all (FR-05)', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    const filter = page.getByRole('navigation', { name: 'Categories' });

    await filter.getByRole('link', { name: 'Household Essentials' }).click();
    await expect(page).toHaveURL(/\/en\/\?category=household-essentials$/);
    await expect(page.getByRole('heading', { level: 4 })).toHaveText([
      'Dish Sponge, 3 pack',
      'Laundry Detergent Sheets',
    ]);

    await filter.getByRole('link', { name: 'All' }).click();
    await expect(page.getByRole('heading', { level: 4 })).toHaveCount(11);
  });
});

test.describe('search (FR-12 to FR-15)', () => {
  test('filters as you type, ignoring case and spaces', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/');
    await page.getByRole('searchbox', { name: 'Search the menu' }).fill('  RAMYUN  ');
    await expect(page.getByRole('heading', { level: 4 })).toHaveText(['Shin Ramyun']);
    await expect(page.getByText('1 item found')).toBeVisible();
  });

  test('shows injection strings as plain text and never runs them', async ({ page }) => {
    const fake = await FakeSupabase.install(page);
    let dialogs = 0;
    page.on('dialog', (dialog) => {
      dialogs += 1;
      void dialog.dismiss();
    });
    await page.goto('/en/');
    await expect(card(page, 'Shin Ramyun')).toBeVisible();
    // Background version checks may run at any time; menu reads would mean search went to the server.
    const menuReads = () =>
      fake.requests.filter((path) => /\/rest\/v1\/(items|categories)$/.test(path)).length;
    const readsBefore = menuReads();
    const search = page.getByRole('searchbox');

    for (const attack of [
      '<img src=x onerror=alert(1)>',
      '<script>alert(1)</script>',
      "' OR '1'='1' --",
      "'); DROP TABLE items; --",
    ]) {
      await search.fill(attack);
      await expect(page.getByText(`Nothing on the menu matches “${attack}”.`)).toBeVisible();
    }
    await expect(page.locator('main img')).toHaveCount(0);
    await expect(page.locator('main script')).toHaveCount(0);
    expect(dialogs).toBe(0);
    // Search never reaches the server (D-017).
    expect(menuReads()).toBe(readsBefore);
    await expect(page.getByRole('link', { name: 'Ask on Messenger' })).toHaveAttribute(
      'href',
      'https://m.me/61594474910928',
    );
  });
});
