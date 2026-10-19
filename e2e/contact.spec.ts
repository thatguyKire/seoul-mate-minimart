import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { FakeSupabase, staffLogin } from './support/fakeSupabase';

async function fillForm(page: Page, fields: { name: string; contact: string; message: string }) {
  const form = page.getByRole('region', { name: 'Send us a message' });
  await form.getByLabel('Your name').fill(fields.name);
  await form.getByLabel('Mobile number or email').fill(fields.contact);
  await form.getByLabel('Message').fill(fields.message);
  return form;
}

test.describe('contact form (FR-29 to FR-31)', () => {
  test('shows inline errors and a summary, then replaces itself with a thank-you', async ({
    page,
  }) => {
    const fake = await FakeSupabase.install(page);
    await page.goto('/en/#contact');
    const form = page.getByRole('region', { name: 'Send us a message' });
    await form.getByRole('button', { name: 'Send message' }).click();

    const summary = form.getByRole('alert').filter({ hasText: 'Check these and send again' });
    await expect(summary).toBeFocused();
    await expect(summary.getByRole('link')).toHaveText([
      'Enter your name, up to 80 characters',
      'Enter a mobile number such as 0917 123 4567, or an email address',
      'Write a message of up to 1,000 characters',
    ]);
    await expect(form.getByLabel('Your name')).toHaveAttribute('aria-invalid', 'true');
    const results = await new AxeBuilder({ page }).include('#contact').analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);

    await fillForm(page, {
      name: 'Ana Santos',
      contact: '0917 123 4567',
      message: 'Do you have Buldak carbonara?',
    });
    await form.getByRole('button', { name: 'Send message' }).click();
    const thanks = form.getByRole('status');
    await expect(thanks).toHaveText(
      'Thanks, Ana Santos. We got your message and will reply during store hours.',
    );
    await expect(thanks).toBeFocused();
    await expect(form.getByRole('button', { name: 'Send message' })).toHaveCount(0);
    expect(fake.messages).toMatchObject([
      {
        name: 'Ana Santos',
        contact: '0917 123 4567',
        message: 'Do you have Buldak carbonara?',
        locale: 'en',
        utm: null,
      },
    ]);
  });

  test('sends campaign details only after the visitor accepts (FR-57)', async ({ page }) => {
    const fake = await FakeSupabase.install(page);
    await page.goto('/fil/?utm_source=facebook&utm_campaign=Buldak+week#contact');
    await page.getByRole('button', { name: 'Tanggapin' }).click();
    const form = page.getByRole('region', { name: 'Magpadala ng mensahe' });
    await form.getByLabel('Ang iyong pangalan').fill('Ben');
    await form.getByLabel('Mobile number o email').fill('ben@example.com');
    await form.getByLabel('Mensahe').fill('May stock pa ba kayo ng Pepero?');
    await form.getByRole('button', { name: 'Ipadala ang mensahe' }).click();
    await expect(form.getByRole('status')).toContainText('Salamat, Ben.');
    expect(fake.messages).toMatchObject([
      { locale: 'fil', utm: { utm_source: 'facebook', utm_campaign: 'Buldak week' } },
    ]);
  });

  test('sends no campaign details after Decline', async ({ page }) => {
    const fake = await FakeSupabase.install(page);
    await page.goto('/en/?utm_source=facebook#contact');
    await page.getByRole('button', { name: 'Decline' }).click();
    const form = await fillForm(page, { name: 'Cy', contact: 'cy@example.com', message: 'Hello' });
    await form.getByRole('button', { name: 'Send message' }).click();
    await expect(form.getByRole('status')).toContainText('Thanks, Cy.');
    expect(fake.messages).toMatchObject([{ utm: null }]);
  });

  test('says so when someone sends too many messages (NFR-SEC-16)', async ({ page }) => {
    await FakeSupabase.install(page);
    await page.goto('/en/#contact');
    // Five messages through the same function, then the form's sixth.
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i += 1) {
        await fetch('http://127.0.0.1:54321/functions/v1/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Repeat',
            contact: 'repeat@example.com',
            message: `Message ${String(i)}`,
            locale: 'en',
            website: '',
          }),
        });
      }
    });
    const form = await fillForm(page, { name: 'Dee', contact: 'dee@example.com', message: 'Hi' });
    await form.getByRole('button', { name: 'Send message' }).click();
    await expect(form.getByRole('alert')).toHaveText(
      'Too many messages. Please try again in a few minutes.',
    );
  });
});

test('staff read contact messages as plain text, newest first (FR-32, NFR-SEC-10)', async ({
  page,
}) => {
  const fake = await FakeSupabase.install(page);
  let dialogs = 0;
  page.on('dialog', (dialog) => {
    dialogs += 1;
    void dialog.dismiss();
  });
  await page.goto('/en/#contact');
  const attack = '<img src=x onerror=alert(1)><script>alert(2)</script>\nSecond line';
  const form = await fillForm(page, { name: 'Eve', contact: '0917 765 4321', message: attack });
  await form.getByRole('button', { name: 'Send message' }).click();
  await expect(form.getByRole('status')).toContainText('Thanks, Eve.');
  expect(fake.messages).toHaveLength(1);

  await page.goto('/admin');
  await page.getByLabel('Email').fill(staffLogin.email);
  await page.getByLabel('Password', { exact: true }).fill(staffLogin.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByRole('link', { name: 'Messages' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Messages' })).toBeVisible();

  const message = page.getByRole('listitem').filter({ hasText: 'Eve' });
  await expect(message.locator('.admin-message__text')).toHaveText(attack);
  await expect(message.getByRole('link', { name: '0917 765 4321' })).toHaveAttribute(
    'href',
    'tel:+639177654321',
  );
  await expect(page.locator('main img')).toHaveCount(0);
  expect(dialogs).toBe(0);
});
