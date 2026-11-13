function readApiUrl() {
  const value = import.meta.env.VITE_API_URL;

  if (!value) throw new Error('VITE_API_URL is not set. Copy .env.example to .env.');
  if (!URL.canParse(value)) throw new Error(`VITE_API_URL is not a valid URL: ${value}`);

  return value.replace(/\/+$/, '');
}

/** Where uploaded images are served from, when the API stores them in S3. Optional. */
function readImageUrl() {
  const value = import.meta.env.VITE_IMAGE_URL?.trim();
  if (!value) return undefined;
  if (!URL.canParse(value)) throw new Error(`VITE_IMAGE_URL is not a valid URL: ${value}`);
  return value;
}

const apiUrl = readApiUrl();
const imageUrl = readImageUrl();

export const env = {
  apiUrl,
  storeName: import.meta.env.VITE_STORE_NAME?.trim() || 'Store Admin',
  /** The origins uploaded images come from: the API's, and S3's when it is set. */
  imageOrigins: [new URL(apiUrl).origin, ...(imageUrl ? [new URL(imageUrl).origin] : [])],
};
