import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { FakeSupabase, staffLogin, validMfaCode, visitorLogin } from './support/fakeSupabase';
import { photoWithLocation } from './support/photos';

async function logIn(page: Page, login = staffLogin) {
  await page.goto('/admin');
  await page.getByLabel('Email').fill(login.email);
  await page.getByLabel('Password', { exact: true }).fill(login.password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

function visitorCard(page: Page, name: string) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 4, name, exact: true }) });
}

test.describe('staff login (FR-34 to FR-36)', () => {
  test('a wrong password gets the generic message, and the password can be shown', async ({
    page,
  }) => {
    await FakeSupabase.install(page);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { level: 1, name: 'Staff login' })).toBeVisible();
    await expect(page.getByText(/sign up/i)).toHaveCount(0);

    const password = page.getByLabel('Password', { exact: true });
    const toggle = page.getByRole('button', { name: 'Show password' });
    await password.fill('typed-secret');
    await expect(password).toHaveAttribute('type', 'password');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(password).toHaveAttribute('type', 'text');

    await page.getByLabel('Email').fill(staffLogin.email);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Wrong email or password');

    await page.getByLabel('Email').fill('nobody@example.test');
    await password.fill(staffLogin.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Wrong email or password');
  });

  test('an account that is not staff is logged straight out (FR-37)', async ({ page }) => {
    const fake = await FakeSupabase.install(page);
    await logIn(page, visitorLogin);
    await expect(
      page.getByText("This account can't use the staff panel. Ask the owner to add it."),
    ).toBeVisible();
    expect(fake.logouts).toEqual([visitorLogin.email]);
  });

  test('too many attempts get their own message', async ({ page }) => {
    const fake = await FakeSupabase.install(page);
    fake.loginRateLimited = true;
    await logIn(page);
    await expect(page.getByRole('alert')).toHaveText(
      'Too many attempts. Try again in a few minutes.',
    );
  });
});

test('one tap marks an item in stock, and an open visitor page follows (FR-39, FR-06)', async ({
  context,
}) => {
  const fake = await FakeSupabase.install(context);
  const visitor = await context.newPage();
  await visitor.goto('/en/');
  const banana = visitorCard(visitor, 'Banana Milk');
  await expect(banana).toContainText('Out of stock');
  await fake.subscribed();

  const staff = await context.newPage();
  await logIn(staff);
  const toggle = staff.getByRole('switch', { name: 'Banana Milk in stock' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  expect(fake.item('Banana Milk').is_available).toBe(true);

  await expect(banana).toContainText('In stock', { timeout: 5000 });
});

test('"Mark all out of stock" asks first, and Escape changes nothing (FR-40, FR-41)', async ({
  page,
}) => {
  const fake = await FakeSupabase.install(page);
  await logIn(page);
  const button = page.getByRole('button', { name: 'Mark all out of stock' });
  const available = fake.items.filter((item) => item.is_available).length;

  await button.click();
  const dialog = page.getByRole('dialog', { name: 'Mark all items out of stock?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
  expect(fake.items.filter((item) => item.is_available)).toHaveLength(available);

  await button.click();
  await dialog.getByRole('button', { name: 'Mark all out of stock' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'out of stock' })).toHaveText(
    `Marked ${String(available)} items out of stock.`,
  );
  expect(fake.items.filter((item) => item.is_available)).toHaveLength(0);
  await expect(page.getByRole('switch', { checked: true })).toHaveCount(0);
});

test('adding an item: errors first, then a saved item with a cleaned photo (FR-38, FR-43 to FR-45)', async ({
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'WebP encoding is checked in Chromium');
  const fake = await FakeSupabase.install(context);
  const page = await context.newPage();
  await logIn(page);
  await page.getByRole('link', { name: 'Add item' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Add item' })).toBeVisible();

  await page.getByRole('button', { name: 'Save item' }).click();
  const summary = page.getByRole('alert').filter({ hasText: 'Fix these to save' });
  await expect(summary).toBeFocused();
  await expect(summary.getByRole('link')).toHaveText([
    'Enter the name in English',
    'Choose a category',
    'Enter a price in pesos, such as 95 or 95.50',
  ]);
  await summary.getByRole('link', { name: 'Enter the name in English' }).click();
  const english = page.getByRole('group', { name: 'English (required)' });
  await expect(english.getByLabel('Name')).toBeFocused();
  await expect(english.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true');

  await english.getByLabel('Name').fill('Tteokbokki Cup');
  await english.getByLabel('Description').fill('Sweet and spicy rice cakes, ready in 5 minutes.');
  await page.getByRole('group', { name: 'Korean' }).getByLabel('Name').fill('떡볶이 컵');
  await page.getByLabel('Category').selectOption({ label: 'Instant Noodles' });
  await page.getByLabel('Price in pesos').fill('89.50');
  await page.getByLabel('Photo').setInputFiles({
    name: 'from-my-phone.jpg',
    mimeType: 'image/jpeg',
    buffer: await photoWithLocation(page),
  });
  await expect(page.getByText('New photo, not saved yet')).toBeVisible();
  await page.getByLabel('Show on the menu').check();
  await page.getByRole('button', { name: 'Save item' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toHaveText(
    'Saved Tteokbokki Cup.',
  );
  const saved = fake.item('Tteokbokki Cup');
  expect(saved).toMatchObject({ price_centavos: 8950, name_ko: '떡볶이 컵', photo_format: 'webp' });

  // Three sizes, re-encoded, with no trace of the EXIF block or the location (FR-44).
  const files = [...fake.files.keys()].sort();
  expect(files).toEqual(
    ['1024', '320', '640'].map((width) => `${saved.photo_path ?? ''}/${width}.webp`),
  );
  for (const { bytes, contentType } of fake.files.values()) {
    expect(contentType).toBe('image/webp');
    expect(bytes.includes('Exif')).toBe(false);
    expect(bytes.includes('SECRET-LOCATION')).toBe(false);
    expect(bytes.length).toBeLessThanOrEqual(1024 * 1024);
  }

  const visitor = await context.newPage();
  await visitor.goto('/en/?category=instant-noodles');
  const photo = visitorCard(visitor, 'Tteokbokki Cup').locator('img');
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  expect(await photo.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\.webp$/);
  const widest = await visitor.evaluate(
    async (url) => {
      const bitmap = await createImageBitmap(await (await fetch(url)).blob());
      return bitmap.width;
    },
    `http://127.0.0.1:54321/storage/v1/object/public/item-photos/${saved.photo_path ?? ''}/1024.webp`,
  );
  expect(widest).toBe(1024);
});

test('a file that is not a JPG, PNG or WebP photo is refused (FR-43)', async ({ page }) => {
  await FakeSupabase.install(page);
  await logIn(page);
  await page.getByRole('link', { name: 'Add item' }).click();
  await page.getByLabel('Photo').setInputFiles({
    name: 'renamed.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
  });
  await expect(page.getByText('Choose a JPG, PNG or WebP photo.')).toBeVisible();
  await expect(page.getByLabel('Photo')).toHaveAttribute('aria-invalid', 'true');
});

test('editing and deleting an item, with a confirmation before deleting (FR-38, FR-41)', async ({
  page,
}) => {
  const fake = await FakeSupabase.install(page);
  await logIn(page);
  await page.getByRole('link', { name: 'Banana Milk' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Edit Banana Milk' })).toBeVisible();
  await expect(page.getByLabel('Price in pesos')).toHaveValue('75');
  await page.getByLabel('Price in pesos').fill('80');
  await page.getByRole('button', { name: 'Save item' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toHaveText(
    'Saved Banana Milk.',
  );
  expect(fake.item('Banana Milk').price_centavos).toBe(8000);

  await page.getByRole('link', { name: 'Banana Milk' }).click();
  await page.getByRole('button', { name: 'Delete item' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete Banana Milk?' });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(fake.items.some((item) => item.name_en === 'Banana Milk')).toBe(true);

  await page.getByRole('button', { name: 'Delete item' }).click();
  await dialog.getByRole('button', { name: 'Delete item' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Deleted' })).toHaveText(
    'Deleted Banana Milk.',
  );
  expect(fake.items.some((item) => item.name_en === 'Banana Milk')).toBe(false);
});

test('categories: add one, and one that still has items cannot be deleted (FR-42)', async ({
  page,
}) => {
  await FakeSupabase.install(page);
  await logIn(page);
  await page.getByRole('link', { name: 'Categories' }).click();
  await page.getByRole('button', { name: 'Add category' }).click();
  await page.getByLabel('Name in English (required)').fill('Frozen Food');
  await expect(page.getByLabel('Web address name')).toHaveValue('frozen-food');
  await page.getByRole('button', { name: 'Save category' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toHaveText(
    'Saved Frozen Food.',
  );

  await page.getByRole('button', { name: 'Delete Snacks and Drinks' }).click();
  await page
    .getByRole('dialog', { name: 'Delete Snacks and Drinks?' })
    .getByRole('button', { name: 'Delete category' })
    .click();
  await expect(page.getByRole('alert')).toHaveText(
    'Snacks and Drinks still has items. Move them to another category or delete them first.',
  );

  await page.getByRole('button', { name: 'Delete Frozen Food' }).click();
  await page
    .getByRole('dialog', { name: 'Delete Frozen Food?' })
    .getByRole('button', { name: 'Delete category' })
    .click();
  await expect(page.getByRole('status').filter({ hasText: 'Deleted' })).toHaveText(
    'Deleted Frozen Food.',
  );
});

test('a change the database refuses says so and is put back (FR-37)', async ({ page }) => {
  const fake = await FakeSupabase.install(page);
  await logIn(page);
  const toggle = page.getByRole('switch', { name: 'Banana Milk in stock' });
  await expect(toggle).toBeVisible();
  // The owner removes this account from the admins table while it is logged in.
  fake.user(staffLogin.email).staff = false;
  await toggle.click();
  await expect(page.getByRole('alert')).toHaveText(
    "You don't have permission to do that. Please log in again.",
  );
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  expect(fake.item('Banana Milk').is_available).toBe(false);
});

test('two-factor login: turned on in Security, then a code is needed to log in (FR-47)', async ({
  page,
}) => {
  await FakeSupabase.install(page);
  await logIn(page);
  await page.getByRole('link', { name: 'Security' }).click();
  await page.getByRole('button', { name: 'Turn on two-factor login' }).click();
  await expect(page.getByRole('img', { name: 'QR code for your authenticator app' })).toBeVisible();
  await expect(page.getByText('JBSWY3DPEHPK3PXP')).toBeVisible();

  await page.getByLabel('6-digit code').fill('000000');
  await page.getByRole('button', { name: 'Turn on', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Wrong code. Check your app and try again.');
  await page.getByLabel('6-digit code').fill(validMfaCode);
  await page.getByRole('button', { name: 'Turn on', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'on' })).toHaveText(
    'Two-factor login is on.',
  );

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByText("You're logged out.")).toBeVisible();
  await logIn(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Enter your code' })).toBeVisible();
  await page.getByLabel('6-digit code').fill('111111');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('alert')).toHaveText('Wrong code. Check your app and try again.');
  await page.getByLabel('6-digit code').fill(validMfaCode);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Items' })).toBeVisible();
});

test('staff are logged out after 60 minutes without activity (FR-46)', async ({ page }) => {
  const fake = await FakeSupabase.install(page);
  await page.clock.install();
  await logIn(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Items' })).toBeVisible();
  await page.clock.fastForward('59:00');
  await expect(page.getByRole('heading', { level: 1, name: 'Items' })).toBeVisible();
  await page.clock.fastForward('02:00');
  await expect(
    page.getByText('You were logged out after 60 minutes without activity.'),
  ).toBeVisible();
  expect(fake.logouts).toContain(staffLogin.email);
});

test.describe('staff panel accessibility (NFR-ACC-01 to NFR-ACC-03)', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`login, item list and item form have no axe violations, ${colorScheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await FakeSupabase.install(page);
      const check = async () => {
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          results.violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
          ),
        ).toEqual([]);
      };
      await page.goto('/admin');
      await expect(page.getByRole('heading', { level: 1, name: 'Staff login' })).toBeVisible();
      await check();
      await logIn(page);
      await expect(page.getByRole('switch').first()).toBeVisible();
      await check();
      await page.getByRole('link', { name: 'Banana Milk' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Edit Banana Milk' })).toBeVisible();
      await check();
    });
  }
});
