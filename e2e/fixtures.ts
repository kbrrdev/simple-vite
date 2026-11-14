import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

export const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:3000';

/** The accounts `npm run db:seed` makes in simple-express. Development data only. */
export const accounts = {
  admin: { email: 'admin@example.com', password: 'dev-password-123' },
  staff: { email: 'staff@example.com', password: 'dev-password-123' },
};

/** A name no earlier run has used, so tests can find their own records. */
export function unique(label: string) {
  return `E2E ${label} ${Date.now()}`;
}

/** A tiny real PNG, for uploads. */
export const pngFile = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
});

/** Logs in through the API, which sets the refresh cookie in this browser context. */
async function signIn(context: BrowserContext, account: { email: string; password: string }) {
  const response = await context.request.post(`${apiUrl}/api/auth/login`, {
    data: { ...account, client: 'web' },
  });
  expect(response.ok(), `log in as ${account.email}: ${response.status()}`).toBe(true);
}

/**
 * `page` is signed in as the super admin, and `staffPage` as the seeded Staff role. Each user
 * logs in once per run and keeps one context, as the API rotates the refresh cookie on every
 * use and revokes a session whose old cookie comes back.
 */
export const test = base.extend<
  { staffPage: Page },
  { adminContext: BrowserContext; staffContext: BrowserContext }
>({
  adminContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      await signIn(context, accounts.admin);
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],
  staffContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
      await signIn(context, accounts.staff);
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],
  page: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
    await page.close();
  },
  staffPage: async ({ staffContext }, use) => {
    const page = await staffContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect };
