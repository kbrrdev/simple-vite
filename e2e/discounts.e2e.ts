import { expect, test, unique } from './fixtures';

test('creates a sale on a category, turns it off, and deletes it', async ({ page }) => {
  const name = unique('sale');

  await page.goto('/discounts/sales/new');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Percent off').fill('10');
  await page.getByRole('group', { name: 'Categories' }).getByRole('checkbox').first().check();
  await page
    .getByRole('region', { name: 'Unsaved changes' })
    .getByRole('button', { name: 'Save' })
    .click();
  await expect(page).toHaveURL(/\/discounts\/sales\/[0-9a-f-]{36}$/);

  await page.goto('/discounts');
  await expect(page.getByRole('link', { name })).toBeVisible();

  await page.getByRole('button', { name: `More actions for ${name}` }).click();
  await page.getByRole('menuitem', { name: 'Turn off' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Turn off' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: `More actions for ${name}` }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('link', { name })).toHaveCount(0);
});
