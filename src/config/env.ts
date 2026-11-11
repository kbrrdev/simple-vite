function readApiUrl() {
  const value = import.meta.env.VITE_API_URL;

  if (!value) throw new Error('VITE_API_URL is not set. Copy .env.example to .env.');
  if (!URL.canParse(value)) throw new Error(`VITE_API_URL is not a valid URL: ${value}`);

  return value.replace(/\/+$/, '');
}

export const env = {
  apiUrl: readApiUrl(),
  storeName: import.meta.env.VITE_STORE_NAME?.trim() || 'Store Admin',
};
