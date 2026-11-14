import { expect, test, unique } from './fixtures';

test('creates a product, renames it with Enter, and deactivates it', async ({ page }) => {
  const name = unique('product');

  await page.goto('/products/new');
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Category').selectOption({ index: 1 });
  await page.getByLabel('Price for Price and stock').fill('199.99');
  await page.getByLabel('Stock for Price and stock').fill('5');
  await page
    .getByRole('region', { name: 'Unsaved changes' })
    .getByRole('button', { name: 'Save' })
    .click();

  await expect(page).toHaveURL(/\/products\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name })).toBeVisible();

  // Enter saves through the save bar's button, which sits outside the form.
  const renamed = `${name} renamed`;
  await page.getByLabel('Name', { exact: true }).fill(renamed);
  await page.getByLabel('Name', { exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: renamed })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Unsaved changes' })).toHaveCount(0);

  // Products are deactivated, not deleted, so orders can keep them.
  const status = page.getByRole('region', { name: 'Status' });
  await status.getByRole('button', { name: 'Deactivate' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click();
  await expect(status.getByRole('button', { name: 'Turn on' })).toBeVisible();
});
