// Runs against a real local Supabase stack with the seed data, in CI (E2E_LIVE_SUPABASE=1).
// Proves what the fake cannot: Row Level Security keeps hidden items out of the browser
// (FR-07), Realtime delivers menu_state changes to the anonymous role (FR-06, D-020), and
// real staff logins, writes and photo uploads pass the database's and storage's own rules.
// CI creates the two logins with scripts/create-local-staff.mjs before these run.
import { expect, test, type Page } from '@playwright/test';
import { photoWithLocation } from './support/photos';

const url = process.env.VITE_SUPABASE_URL ?? '';
const serviceKey = process.env.E2E_SERVICE_ROLE_KEY ?? '';
const staff = {
  email: process.env.E2E_STAFF_EMAIL ?? '',
  password: process.env.E2E_STAFF_PASSWORD ?? '',
};
const notStaff = {
  email: process.env.E2E_NOT_STAFF_EMAIL ?? '',
  password: process.env.E2E_NOT_STAFF_PASSWORD ?? '',
};

test.skip(process.env.E2E_LIVE_SUPABASE !== '1', 'Needs a local Supabase stack (CI only)');
// One project is enough, and the tests change shared data, so they run one at a time.
test.skip(({ isMobile }) => isMobile, 'Runs in the desktop project only');
test.describe.configure({ mode: 'serial' });

async function serviceRequest(
  path: string,
  { method, body, prefer }: { method: string; body?: string; prefer?: string },
) {
  return fetch(`${url}${path}`, {
    method,
    ...(body === undefined ? {} : { body }),
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
  });
}

async function updateItem(nameEn: string, fields: Record<string, unknown>) {
  const response = await serviceRequest(`/rest/v1/items?name_en=eq.${encodeURIComponent(nameEn)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify(fields),
  });
  expect(response.status, `update ${nameEn}`).toBe(204);
}

async function readItem(nameEn: string): Promise<Record<string, unknown>> {
  const response = await serviceRequest(`/rest/v1/items?name_en=eq.${encodeURIComponent(nameEn)}`, {
    method: 'GET',
  });
  const [row] = (await response.json()) as Record<string, unknown>[];
  if (!row) throw new Error(`No item ${nameEn}`);
  return row;
}

function card(page: Page, name: string) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 4, name, exact: true }) });
}

async function logIn(page: Page, login: { email: string; password: string }) {
  await page.goto('/admin');
  await page.getByLabel('Email').fill(login.email);
  await page.getByLabel('Password', { exact: true }).fill(login.password);
  await page.getByRole('button', { name: 'Log in' }).click();
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

test('a database change reaches an open page within 5 seconds (FR-06)', async ({ page }) => {
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

test('nobody can sign up, even straight through the Auth API (FR-34, D-001)', async () => {
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'new-person@example.test', password: 'Sign-Up-Attempt-1' }),
  });
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(await response.text()).toMatch(/signup/i);
});

test('a login that is not staff is refused by the panel (FR-37)', async ({ page }) => {
  await logIn(page, notStaff);
  await expect(
    page.getByText("This account can't use the staff panel. Ask the owner to add it."),
  ).toBeVisible();
});

test('staff switch an item through RLS, and an open visitor page follows (FR-39, FR-06)', async ({
  context,
}) => {
  const visitor = await context.newPage();
  await visitor.goto('/en/');
  const banana = card(visitor, 'Banana Milk');
  await expect(banana).toContainText('Out of stock');
  await visitor.waitForTimeout(2000);

  const page = await context.newPage();
  await logIn(page, staff);
  const toggle = page.getByRole('switch', { name: 'Banana Milk in stock' });
  try {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(banana).toContainText('In stock', { timeout: 5000 });
    expect((await readItem('Banana Milk')).is_available).toBe(true);
  } finally {
    await updateItem('Banana Milk', { is_available: false });
  }
});

test('staff upload a photo that passes the storage rules and shows on the menu (FR-43, FR-44)', async ({
  context,
}) => {
  const page = await context.newPage();
  await logIn(page, staff);
  await page.getByRole('link', { name: 'Shin Ramyun' }).click();
  await page.getByLabel('Photo').setInputFiles({
    name: 'from-my-phone.jpg',
    mimeType: 'image/jpeg',
    buffer: await photoWithLocation(page),
  });
  await expect(page.getByText('New photo, not saved yet')).toBeVisible();
  await page.getByRole('button', { name: 'Save item' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toHaveText(
    'Saved Shin Ramyun.',
  );

  const item = await readItem('Shin Ramyun');
  expect(item.photo_format).toBe('webp');
  const fileUrl = `${url}/storage/v1/object/public/item-photos/${String(item.photo_path)}/1024.webp`;
  const file = Buffer.from(await (await fetch(fileUrl)).arrayBuffer());
  expect(file.subarray(8, 12).toString('latin1')).toBe('WEBP');
  expect(file.includes('Exif')).toBe(false);
  expect(file.includes('SECRET-LOCATION')).toBe(false);

  const visitor = await context.newPage();
  await visitor.goto('/en/?category=instant-noodles');
  const photo = card(visitor, 'Shin Ramyun').locator('img');
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
});

const site = 'http://127.0.0.1:4173';

async function postContact(body: Record<string, unknown>, origin = site) {
  return fetch(`${url}/functions/v1/contact`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ locale: 'en', website: '', ...body }),
  });
}

async function storedMessages(name: string): Promise<Record<string, unknown>[]> {
  const response = await serviceRequest(
    `/rest/v1/contact_messages?name=eq.${encodeURIComponent(name)}`,
    { method: 'GET' },
  );
  return (await response.json()) as Record<string, unknown>[];
}

test('a visitor message goes through the real function, and staff read it (FR-29 to FR-32)', async ({
  context,
}) => {
  const visitor = await context.newPage();
  await visitor.goto('/en/#contact');
  const form = visitor.getByRole('region', { name: 'Send us a message' });
  await form.getByLabel('Your name').fill('Live Stack Visitor');
  await form.getByLabel('Mobile number or email').fill('0917 555 0101');
  await form.getByLabel('Message').fill('Is the Banana Milk back in stock?');
  await form.getByRole('button', { name: 'Send message' }).click();
  await expect(form.getByRole('status')).toContainText('Thanks, Live Stack Visitor.');
  expect(await storedMessages('Live Stack Visitor')).toMatchObject([
    {
      contact: '0917 555 0101',
      message: 'Is the Banana Milk back in stock?',
      locale: 'en',
      utm: null,
    },
  ]);

  const page = await context.newPage();
  await logIn(page, staff);
  await page.getByRole('link', { name: 'Messages' }).click();
  await expect(page.getByText('Is the Banana Milk back in stock?')).toBeVisible();
});

test('the function refuses other sites, drops bots and limits each address (NFR-SEC-12, -16, -17)', async () => {
  const foreign = await postContact(
    { name: 'Foreign', contact: 'a@example.com', message: 'Hi' },
    'https://evil.example',
  );
  expect(foreign.status).toBe(403);

  const bot = await postContact({
    name: 'Honeypot Bot',
    contact: 'bot@example.com',
    message: 'Buy now',
    website: 'https://spam.example',
  });
  expect(bot.status).toBe(200);
  expect(await storedMessages('Honeypot Bot')).toEqual([]);

  // The visitor's message above was the first from this address in this window.
  for (let i = 2; i <= 5; i += 1) {
    const response = await postContact({
      name: 'Rate Test',
      contact: 'r@example.com',
      message: `Message ${String(i)}`,
    });
    expect(response.status, `message ${String(i)}`).toBe(200);
  }
  const limited = await postContact({
    name: 'Rate Test',
    contact: 'r@example.com',
    message: 'One too many',
  });
  expect(limited.status).toBe(429);
  expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  expect(await storedMessages('Rate Test')).toHaveLength(4);
});
