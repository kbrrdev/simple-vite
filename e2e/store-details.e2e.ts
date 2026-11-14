import { expect, test } from './fixtures';

test('adds a social link, keeps it after a reload, and removes it', async ({ page }) => {
  const url = `https://tiktok.com/@e2e${Date.now()}`;
  const saveBar = page.getByRole('region', { name: 'Unsaved changes' });

  await page.goto('/store-details');
  await expect(page.getByLabel('Store name')).not.toHaveValue('');

  await page.getByRole('button', { name: 'Add link' }).click();
  await page.getByLabel('Platform').last().selectOption('tiktok');
  await page.getByLabel('Link', { exact: true }).last().fill(url);
  await saveBar.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Store details saved')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Link', { exact: true }).last()).toHaveValue(url);

  // Put the store back as it was. The whole form is sent, so the other fields stay.
  await page.getByRole('button', { name: 'Remove TikTok link' }).last().click();
  await saveBar.getByRole('button', { name: 'Save' }).click();
  await expect(saveBar).toBeHidden();
  await page.reload();
  await expect(page.getByLabel('Store name')).not.toHaveValue('');
  for (const input of await page.getByLabel('Link', { exact: true }).all()) {
    await expect(input).not.toHaveValue(url);
  }
});
