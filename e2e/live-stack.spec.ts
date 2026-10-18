// Runs against a real local Supabase stack with the seed data, in CI (E2E_LIVE_SUPABASE=1).
// Proves what the fake cannot: Row Level Security keeps hidden items out of the browser
// (FR-07), and Realtime delivers menu_state changes to the anonymous role (FR-06, D-020).
// Changes are made with the service role key, standing in for a staff member until the
// admin panel exists (step 6).
import { expect, test, type Page } from '@playwright/test';

const url = process.env.VITE_SUPABASE_URL ?? '';
const serviceKey = process.env.E2E_SERVICE_ROLE_KEY ?? '';

test.skip(process.env.E2E_LIVE_SUPABASE !== '1', 'Needs a local Supabase stack (CI only)');
// One project is enough, and the tests change shared data, so they run one at a time.
test.skip(({ isMobile }) => isMobile, 'Runs in the desktop project only');
test.describe.configure({ mode: 'serial' });

async function updateItem(nameEn: string, fields: Record<string, unknown>) {
  const response = await fetch(`${url}/rest/v1/items?name_en=eq.${encodeURIComponent(nameEn)}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(fields),
  });
  expect(response.status, `update ${nameEn}`).toBe(204);
}

function card(page: Page, name: string) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 4, name, exact: true }) });
}

test('the browser never receives hidden items (FR-07)', async ({ page }) => {
  const itemsResponse = page.waitForResponse((r) => r.url().includes('/rest/v1/items'));
  await page.goto('/en/');
  const body = await (await itemsResponse).text();

  await expect(card(page, 'Shin Ramyun')).toBeVisible();
  expect(body).toContain('Shin Ramyun');
  expect(body).not.toContain('Cushion Foundation');
  // Audit columns are not readable by visitors either (BACKEND-SCHEMA 3).
  expect(body).not.toContain('updated_by');
  await expect(page.getByText('Cushion Foundation')).toHaveCount(0);
});

test('a staff change reaches an open page within 5 seconds (FR-06)', async ({ page }) => {
  await page.goto('/en/');
  const banana = card(page, 'Banana Milk');
  await expect(banana).toContainText('Out of stock');
  // Give the live channel time to join before changing data.
  await page.waitForTimeout(2000);

  try {
    await updateItem('Banana Milk', { is_available: true });
    await expect(banana).toContainText('In stock', { timeout: 5000 });

    await updateItem('Sheet Mask', { is_published: false });
    await expect(card(page, 'Sheet Mask')).toHaveCount(0, { timeout: 5000 });
  } finally {
    await updateItem('Banana Milk', { is_available: false });
    await updateItem('Sheet Mask', { is_published: true });
  }
});
