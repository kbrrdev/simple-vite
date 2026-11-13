import { formatCents } from '@/lib/money';
import type { AuditEntityType } from './api';

export const entityLabels: Record<AuditEntityType, string> = {
  order: 'Order',
  product: 'Product',
  variant: 'Variant',
  product_image: 'Product image',
  category: 'Category',
  blog: 'Blog post',
  banner: 'Banner',
  sale: 'Sale',
  coupon: 'Coupon',
  promotion: 'Promotion',
  payment_method: 'Payment method',
  asset: 'File',
  role: 'Role',
  user: 'User',
};

export function isEntityType(value: string | null): value is AuditEntityType {
  return value !== null && value in entityLabels;
}

/** The pages an entry can link to. The others have no page of their own. */
export const entityPaths: Partial<Record<AuditEntityType, (id: string) => string>> = {
  order: (id) => `/orders/${id}`,
  product: (id) => `/products/${id}`,
  blog: (id) => `/blogs/${id}`,
  role: (id) => `/roles/${id}`,
  // Banners have no page each, so their entries open the list.
  banner: () => '/banners',
  sale: (id) => `/discounts/sales/${id}`,
  coupon: (id) => `/discounts/coupons/${id}`,
};

const actionLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  deactivate: 'Deactivated',
  status_change: 'Status changed',
  payment_confirm: 'Payment confirmed',
  payment_reject: 'Payment rejected',
  refund: 'Refund recorded',
  role_change: 'Role changed',
  password_change: 'Password changed',
  password_reset: 'Password reset',
  sessions_revoke: 'Signed out everywhere',
};

/** Splits names such as `status_change` or `option1Value` into words, with the first capitalized. */
function toWords(name: string) {
  const words = name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Za-z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\bid\b/g, 'ID');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Actions the backend adds later still read as words. */
export function actionLabel(action: string) {
  return actionLabels[action] ?? toWords(action);
}

/** `priceCents` reads as "Price", as its values are shown in pesos. */
export function fieldLabel(field: string) {
  return toWords(field.endsWith('Cents') ? field.slice(0, -'Cents'.length) : field);
}

/** One recorded value as text. Values are never treated as HTML. */
export function formatValue(field: string, value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number')
    return field.endsWith('Cents') ? formatCents(value) : String(value);
  if (typeof value === 'string') return value === '' ? '(empty)' : value;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value.length > 0 ? value.join(', ') : '(none)';
  }
  return JSON.stringify(value);
}

export const timeFormat = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
