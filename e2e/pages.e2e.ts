import { apiUrl, expect, test, unique } from './fixtures';

test('writes a page, publishes it, and deletes it', async ({ page, request }) => {
  const title = unique('Page');

  await page.goto('/pages/new');
  await page.getByLabel('Title').fill(title);
  const slug = await page.getByLabel('URL handle').inputValue();
  expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  await page.getByRole('textbox', { name: 'Content' }).fill('Returns within **7 days**.');
  await page.getByRole('radio', { name: /Published/ }).check();
  await page
    .getByRole('region', { name: 'Unsaved changes' })
    .getByRole('button', { name: 'Save' })
    .click();
  await expect(page).toHaveURL(/\/pages\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  // Published, so the storefront's public route serves it by its address.
  const published = await request.get(`${apiUrl}/api/pages/${slug}`);
  expect(published.ok()).toBe(true);

  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/pages$/);
});
