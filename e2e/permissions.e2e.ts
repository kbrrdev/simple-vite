import { expect, test } from './fixtures';

test('shows Staff only the areas its role can use', async ({ staffPage }) => {
  await staffPage.goto('/');
  const nav = staffPage.getByRole('navigation', { name: 'Main' });

  await expect(nav.getByRole('link', { name: 'Orders' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Products' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Discounts' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Settings' })).toHaveCount(0);

  // The backend refuses it too; the app explains instead of loading a broken page.
  await staffPage.goto('/roles');
  await expect(staffPage.getByRole('heading', { name: 'No access' })).toBeVisible();
});
