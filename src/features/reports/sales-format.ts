import type { SalesInterval } from './api';

const dayFormat = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});
const monthFormat = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'UTC',
  month: 'short',
  year: 'numeric',
});
const compactPeso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** A sales point's day for display: "3 Nov", "Week of 3 Nov", or "Nov 2026". */
export function pointLabel(day: string, interval: SalesInterval) {
  const date = new Date(`${day}T00:00:00Z`);
  if (interval === 'month') return monthFormat.format(date);
  if (interval === 'week') return `Week of ${dayFormat.format(date)}`;
  return dayFormat.format(date);
}

/** A short axis label for cents, such as "₱48.3K". */
export function compactCents(cents: number) {
  return compactPeso.format(cents / 100);
}
