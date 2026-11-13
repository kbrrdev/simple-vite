/**
 * The Markdown a post may use. The storefront must render posts with the same list. Raw HTML
 * is never rendered. Images show only when they come from the store's own uploads.
 */
export const allowedElements = [
  'img',
  'h2',
  'h3',
  'h4',
  'p',
  'strong',
  'em',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'hr',
  'br',
];

/**
 * Whether an image in a post comes from the store's own uploads, at one of `origins`. Images
 * from anywhere else are not shown, as they could track readers or disappear.
 */
export function isUploadedImage(src: string, origins: string[]) {
  if (!URL.canParse(src)) return false;
  const url = new URL(src);
  return (url.protocol === 'https:' || url.protocol === 'http:') && origins.includes(url.origin);
}
