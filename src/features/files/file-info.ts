import type { Asset } from './api';

export const allowedTypes: Asset['mimeType'][] = ['image/jpeg', 'image/png', 'image/webp'];
export const maxBytes = 5 * 1024 * 1024;

const typeLabels: Record<Asset['mimeType'], string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
};

const kilobytes = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 });
const megabytes = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 });

export function formatType(mimeType: Asset['mimeType']) {
  return typeLabels[mimeType];
}

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${kilobytes.format(Math.max(1, bytes / 1024))} KB`;
  return `${megabytes.format(bytes / (1024 * 1024))} MB`;
}

/** A message when the file cannot be uploaded, checked before sending. The backend still decides. */
export function uploadProblem(file: File) {
  if (!(allowedTypes as string[]).includes(file.type)) {
    return 'Choose a JPEG, PNG, or WebP image.';
  }
  if (file.size > maxBytes) {
    return `This file is ${formatSize(file.size)}. Images must be 5 MB or smaller.`;
  }
  return null;
}
