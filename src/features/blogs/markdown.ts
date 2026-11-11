/**
 * The Markdown a post may use. The storefront must render posts with the same list. Raw HTML
 * is never rendered, and images belong in the cover, not the text.
 */
export const allowedElements = [
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
