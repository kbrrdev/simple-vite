import { expect, pngFile, test } from './fixtures';

test('uploads several images by button and by dropping, then deletes them', async ({ page }) => {
  await page.goto('/files');

  await page.getByLabel('Image files').setInputFiles([pngFile('one.png'), pngFile('two.png')]);
  await expect(page.getByText('2 images uploaded')).toBeVisible();

  // A real drop, with the file in the drag's data, as a person dragging from the desktop.
  const { buffer } = pngFile('dropped.png');
  const dataTransfer = await page.evaluateHandle((base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'dropped.png', { type: 'image/png' }));
    return transfer;
  }, buffer.toString('base64'));
  const heading = page.getByRole('heading', { name: 'Files' });
  await heading.dispatchEvent('dragenter', { dataTransfer });
  await expect(page.getByText('Drop images to upload them')).toBeVisible();
  await heading.dispatchEvent('drop', { dataTransfer });
  await expect(page.getByText('Image uploaded', { exact: true })).toBeVisible();

  // New uploads are listed first, and the run is alone on the API, so these three are ours.
  for (let i = 0; i < 3; i += 1) {
    await page
      .getByRole('button', { name: /^Delete image uploaded/ })
      .first()
      .click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});
