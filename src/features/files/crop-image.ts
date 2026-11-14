/** A rectangle of the original image, in its pixels, as the cropper reports it. */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The longest side a cropped image keeps. Larger crops are scaled down to it. */
export const maxCropSide = 2048;

/**
 * Cuts `area` out of the image file in the browser, and returns it as a file of the same type
 * and name, so it uploads like any other. PNG stays PNG, so transparency survives.
 */
export async function cropImage(file: File, area: CropArea): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxCropSide / Math.max(area.width, area.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot crop images.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    bitmap,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, 0.9));
  if (!blob) throw new Error('The image could not be cropped. Try another one.');
  return new File([blob], file.name, { type: blob.type });
}
