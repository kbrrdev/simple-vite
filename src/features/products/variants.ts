import { formatCents } from '@/lib/money';
import type { Product } from './api';

/** The backend accepts up to this many variants when a product is created. */
export const maxVariants = 100;

/** Option values joined for display, such as "M · Red". A product with no options has none. */
export function variantLabel(variant: {
  option1Value?: string | null;
  option2Value?: string | null;
}) {
  return [variant.option1Value, variant.option2Value].filter(Boolean).join(' · ') || 'Default';
}

/** The lowest and highest price of the active variants, or of all of them when none is active. */
export function priceRange(product: Product) {
  const active = product.variants.filter((variant) => variant.active);
  const prices = (active.length > 0 ? active : product.variants).map((v) => v.priceCents);
  if (prices.length === 0) return '';

  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return low === high ? formatCents(low) : `${formatCents(low)} – ${formatCents(high)}`;
}

export interface Combination {
  key: string;
  option1Value?: string;
  option2Value?: string;
}

/**
 * Every combination of the option values, such as S · Red, S · Blue, M · Red. With no options
 * there is one combination with no values.
 */
export function combinations(values1: string[], values2: string[]): Combination[] {
  if (values1.length === 0) return [{ key: '' }];
  if (values2.length === 0) return values1.map((value) => ({ key: value, option1Value: value }));

  return values1.flatMap((option1Value) =>
    values2.map((option2Value) => ({
      // A character that cannot be typed keeps "A B" + "C" apart from "A" + "B C".
      key: `${option1Value}\u0000${option2Value}`,
      option1Value,
      option2Value,
    })),
  );
}

const maxInteger = 2147483647;

/** Reads a stock count typed as text. Returns null unless it is a whole number. */
export function parseStock(text: string) {
  if (!/^\d+$/.test(text.trim())) return null;
  const stock = Number(text);
  return stock <= maxInteger ? stock : null;
}
