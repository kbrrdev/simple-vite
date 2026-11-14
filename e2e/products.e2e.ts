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

  // A wide photo is cropped to the square the store shows, in the browser, before uploading.
  const wide = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1000;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#2563eb';
      context.fillRect(0, 0, 1600, 1000);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Image file').setInputFiles({
    name: 'wide.png',
    mimeType: 'image/png',
    buffer: Buffer.from(wide, 'base64'),
  });
  const crop = page.getByRole('dialog', { name: 'Crop image' });
  await crop.getByLabel('Zoom').fill('1.5');
  await crop.getByRole('button', { name: 'Save' }).click();
  const add = page.getByRole('dialog', { name: 'Add image' });
  await add.getByLabel('Alt text').fill('Blue square');
  await add.getByRole('button', { name: 'Add image' }).click();

  const photo = page.getByRole('list', { name: 'Images' }).locator('img').first();
  await expect(photo).toBeVisible();
  const size = await photo.evaluate(async (element: HTMLImageElement) => {
    await element.decode();
    return { width: element.naturalWidth, height: element.naturalHeight };
  });
  expect(size.width).toBe(size.height);
  expect(size.width).toBeGreaterThan(0);

  // Products are deactivated, not deleted, so orders can keep them.
  const status = page.getByRole('region', { name: 'Status' });
  await status.getByRole('button', { name: 'Deactivate' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click();
  await expect(status.getByRole('button', { name: 'Turn on' })).toBeVisible();
});
