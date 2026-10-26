import { expect, test } from './support/test';
import { FakeSupabase } from './support/fakeSupabase';

test.describe('first visit to the root (FR-20)', () => {
  test.describe('with a Korean browser', () => {
    test.use({ locale: 'ko-KR' });

    test('opens the Korean site', async ({ page }) => {
      await FakeSupabase.install(page);
      await page.goto('/?utm_source=facebook');
      // The query string survives the redirect, for UTM capture later (FR-57).
      await expect(page).toHaveURL(/\/ko\/\?utm_source=facebook$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        '마스바테 시티의 한국 과자, 라면, 스킨케어',
      );
    });
  });

  test.describe('with a Tagalog browser', () => {
    test.use({ locale: 'tl-PH' });

    test('opens the Filipino site', async ({ page }) => {
      await FakeSupabase.install(page);
      await page.goto('/');
      await expect(page).toHaveURL(/\/fil\/$/);
    });
  });

  test.describe('with a browser language the site does not have', () => {
    test.use({ locale: 'ja-JP' });

    test('opens the English site', async ({ page }) => {
      await FakeSupabase.install(page);
      await page.goto('/');
      await expect(page).toHaveURL(/\/en\/$/);
    });
  });
});

test('switching language changes all text, keeps the page and is remembered (FR-17 to FR-19)', async ({
  page,
  isMobile,
}) => {
  await FakeSupabase.install(page);
  await page.goto('/en/?category=instant-noodles');
  await expect(page.getByRole('heading', { level: 4, name: 'Shin Ramyun' })).toBeVisible();

  if (isMobile) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('dialog').getByRole('link', { name: '한국어' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  } else {
    await page.getByRole('button', { name: 'Language: English' }).click();
    await page.getByRole('link', { name: '한국어' }).click();
  }

  await expect(page).toHaveURL(/\/ko\/\?category=instant-noodles$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.getByRole('heading', { level: 2, name: '메뉴' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: '라면' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 4, name: '신라면' })).toBeVisible();
  // Prices keep the peso sign in Korean.
  await expect(page.getByText('₱70.00').first()).toBeVisible();
  // No Korean name yet: English text, marked as English (FR-21, NFR-ACC-05).
  await expect(page.getByRole('heading', { level: 4, name: 'Jin Ramen Mild' })).toHaveAttribute(
    'lang',
    'en',
  );

  await page.goto('/');
  await expect(page).toHaveURL(/\/ko\/$/);
});

test('a shared link opens in its own language (FR-18)', async ({ page }) => {
  await FakeSupabase.install(page);
  await page.goto('/fil/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fil');
  await expect(page.getByRole('heading', { level: 2, name: 'Paano umorder' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Lunes/ })).toContainText(
    '9:00 AM hanggang 2:00 AM (kinabukasan)',
  );
});
