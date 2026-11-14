import { expect, pngFile, test, unique } from './fixtures';

test('writes a post with an image in the text, publishes it, and deletes it', async ({ page }) => {
  const title = unique('post');

  await page.goto('/blogs/new');
  await page.getByLabel('Title').fill(title);
  await page.getByRole('textbox', { name: 'Author' }).fill('E2E');
  await page.getByRole('textbox', { name: 'Content' }).fill('Before the photo.');

  await page.getByRole('button', { name: 'Image', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Insert image' });
  await dialog.getByLabel('Image file').setInputFiles(pngFile('in-post.png'));
  await expect(dialog.getByRole('img', { name: 'Selected image' })).toBeVisible();
  await dialog.getByLabel('Alt text').fill('A test photo');
  await dialog.getByRole('button', { name: 'Insert image' }).click();
  await expect(page.getByRole('textbox', { name: 'Content' })).toHaveValue(
    /Before the photo\.\n\n!\[A test photo\]\(.+\)/,
  );

  // The preview shows uploads only, so this proves the image's address counts as the store's.
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByRole('img', { name: 'A test photo' })).toBeVisible();

  await page.getByRole('radio', { name: /Published/ }).check();
  await page
    .getByRole('region', { name: 'Unsaved changes' })
    .getByRole('button', { name: 'Save' })
    .click();
  await expect(page).toHaveURL(/\/blogs\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/blogs$/);
});
