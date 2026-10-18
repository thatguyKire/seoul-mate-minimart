import { expect, test } from '@playwright/test';

test('home page loads cleanly from the production build', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  await expect(page).toHaveTitle('Seoul-Mate Minimart');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seoul-Mate Minimart');
  await expect(page.getByRole('link', { name: 'Messenger' })).toHaveAttribute(
    'href',
    'https://m.me/61594474910928',
  );
  expect(errors).toEqual([]);
});
