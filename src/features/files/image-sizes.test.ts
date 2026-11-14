import { describe, expect, it } from 'vitest';
import { imageSizes, sizeHint, sizeWarning } from './image-sizes';

describe('sizeWarning', () => {
  it('says nothing for an image of the right shape and enough width', () => {
    expect(sizeWarning(imageSizes.banner, { width: 2400, height: 800 })).toBeNull();
    expect(sizeWarning(imageSizes.banner, { width: 1300, height: 440 })).toBeNull();
  });

  it('warns when an image is under half the recommended width', () => {
    expect(sizeWarning(imageSizes.product, { width: 900, height: 900 })).toBe(
      'This image is 900 × 900 pixels, so it may look soft. Recommended: Square, 2048 × 2048 pixels.',
    );
  });

  it('warns when the store will crop an image of another shape', () => {
    expect(sizeWarning(imageSizes.category, { width: 800, height: 600 })).toMatch(
      /so the store crops it to fit\./,
    );
  });

  it('warns about both at once', () => {
    expect(sizeWarning(imageSizes.banner, { width: 800, height: 600 })).toMatch(
      /may look soft, and the store crops it to fit/,
    );
  });

  it('accepts any height when the size has none', () => {
    expect(sizeWarning(imageSizes.postImage, { width: 1600, height: 4000 })).toBeNull();
  });
});

describe('sizeHint', () => {
  it('names the size and the upload limits', () => {
    expect(sizeHint(imageSizes.qrCode)).toBe(
      'Recommended: Square, at least 800 × 800 pixels. JPEG, PNG, or WebP, up to 5 MB.',
    );
  });
});
