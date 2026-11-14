import { expect, test } from './fixtures';

const sizes = [
  { name: 'phone', width: 390, height: 700 },
  { name: 'desktop', width: 1280, height: 800 },
];

for (const size of sizes) {
  test(`keeps the category dialog's footer at its edge on a ${size.name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/categories');
    await page.getByRole('button', { name: 'New category' }).click();

    const dialog = page.locator('[data-slot="dialog-content"]');
    const footer = page.locator('[data-slot="dialog-footer"]');
    await expect(footer).toBeVisible();
    // The dialog zooms in as it opens, so measure once it has settled.
    await dialog.evaluate((element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished)),
    );

    // The dialog box never scrolls, only the fields inside it, so its footer's edge-to-edge
    // margins add no empty space.
    const box = await dialog.evaluate((element) => ({
      overflow: getComputedStyle(element).overflowY,
      bottom: element.getBoundingClientRect().bottom,
    }));
    const footerBottom = await footer.evaluate((element) => element.getBoundingClientRect().bottom);
    expect(box.overflow).toBe('visible');
    expect(Math.abs(box.bottom - footerBottom)).toBeLessThanOrEqual(1);
    await expect(footer.getByRole('button', { name: 'Save' })).toBeInViewport();
  });
}

test('opens the phone menu, goes to a page, and closes the menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Open menu' }).click();
  const menu = page.getByRole('dialog');
  await menu.getByRole('link', { name: 'Orders' }).click();

  await expect(page).toHaveURL(/\/orders$/);
  await expect(menu).toHaveCount(0);
});
