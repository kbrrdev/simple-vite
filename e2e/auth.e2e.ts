import { expect, test } from '@playwright/test';
import { accounts } from './fixtures';

// A fresh browser with no session, unlike the other files, as logging out ends the session.
test('logs in, stays signed in after a reload, and logs out', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Email').fill(accounts.admin.email);
  await page.getByLabel('Password').fill(accounts.admin.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  // The access token lives only in memory, so this checks the refresh cookie restores the session.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: new RegExp(accounts.admin.email) }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();

  // Logged out for real: a reload does not sign back in.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
});
