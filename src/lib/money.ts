const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

export function formatCents(cents: number) {
  return peso.format(cents / 100);
}

/** Turns peso text such as "199.99" into 19999 cents, without decimal arithmetic. */
export function parsePesos(text: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;

  const [, whole, fraction = ''] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));

  return Number.isSafeInteger(cents) ? cents : null;
}

/** Shows cents as peso text for editing, such as 19999 as "199.99", without decimal arithmetic. */
export function centsToText(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
