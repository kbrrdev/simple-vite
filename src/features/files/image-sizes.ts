/**
 * The size each image looks best at, from how the storefront shows it. The backend accepts any
 * size, so these are hints.
 */
export interface ImageSize {
  width: number;
  /** Left out when any height works, as for images in a post's text. */
  height?: number;
  /** The recommendation as staff read it. */
  text: string;
}

export const imageSizes = {
  product: { width: 2048, height: 2048, text: 'Square, 2048 × 2048 pixels' },
  banner: { width: 2400, height: 800, text: '2400 × 800 pixels (3:1)' },
  bannerPhone: { width: 1080, height: 1350, text: '1080 × 1350 pixels (4:5)' },
  category: { width: 400, height: 400, text: 'Square, 400 × 400 pixels' },
  blogCover: {
    width: 1600,
    height: 900,
    text: '1600 × 900 pixels (16:9), with the subject in the middle',
  },
  postImage: { width: 1600, text: 'At least 1600 pixels wide, any height' },
  qrCode: { width: 800, height: 800, text: 'Square, at least 800 × 800 pixels' },
} satisfies Record<string, ImageSize>;

/** The line under an image field. */
export function sizeHint(size: ImageSize) {
  return `Recommended: ${size.text}. JPEG, PNG, or WebP, up to 5 MB.`;
}

/**
 * A note when an image is under half the recommended width, so it may look soft, or a
 * different shape, so the store crops it. Null when it fits.
 */
export function sizeWarning(size: ImageSize, actual: { width: number; height: number }) {
  const small = actual.width < size.width / 2;
  const ratio = size.height ? size.width / size.height : null;
  // More than a tenth off the shape is a crop shoppers would notice.
  const reshaped = ratio !== null && Math.abs(actual.width / actual.height - ratio) / ratio > 0.1;
  if (!small && !reshaped) return null;

  const effect =
    small && reshaped
      ? 'it may look soft, and the store crops it to fit'
      : small
        ? 'it may look soft'
        : 'the store crops it to fit';
  return `This image is ${actual.width} × ${actual.height} pixels, so ${effect}. Recommended: ${size.text}.`;
}
