import { formatCents } from '@/lib/money';
import { scheduleStatus, type ScheduleStatus } from '@/lib/schedule';
import type { Coupon, DiscountKind, Promotion, Sale } from './api';

/** The badge for each status: Active is green, Scheduled blue, and the rest grey. */
export const statusBadges: Record<
  ScheduleStatus,
  { label: string; variant: 'success' | 'info' | 'secondary' }
> = {
  live: { label: 'Active', variant: 'success' },
  scheduled: { label: 'Scheduled', variant: 'info' },
  ended: { label: 'Expired', variant: 'secondary' },
  off: { label: 'Off', variant: 'secondary' },
};

/** One line of the combined list, whatever kind of discount it is. */
export interface DiscountRow {
  kind: DiscountKind;
  id: string;
  /** The sale's or promotion's name, or the coupon's code. */
  title: string;
  /** What kind it is, in the words staff use, such as Flash sale or Automatic. */
  type: string;
  /** What it does, such as "20% off · 12 products". */
  summary: string;
  /** Use so far, from the backend, where it counts any. */
  usage?: string;
  status: ScheduleStatus;
  isActive: boolean;
  createdAt: string;
  /** Its editor page, once the kind has one. */
  href?: string;
}

function amount(type: 'percent' | 'fixed' | null, value: number | null) {
  if (value === null) return '';
  return type === 'percent' ? `${value}% off` : `${formatCents(value)} off`;
}

function count(n: number, noun: string, plural = `${noun}s`) {
  return `${n} ${n === 1 ? noun : plural}`;
}

/** Products and categories together, such as "12 products, 2 categories". */
function scope(productIds: string[], categoryIds: string[]) {
  const parts = [
    productIds.length > 0 && count(productIds.length, 'product'),
    categoryIds.length > 0 && count(categoryIds.length, 'category', 'categories'),
  ].filter(Boolean);
  return parts.join(', ');
}

export function saleRow(sale: Sale): DiscountRow {
  return {
    kind: 'sales',
    id: sale.id,
    href: `/discounts/sales/${sale.id}`,
    title: sale.name,
    // A flash sale is a sale with a stock cap, as the backend describes it.
    type: sale.stockCap === null ? 'Sale' : 'Flash sale',
    summary: [
      amount(sale.discountType, sale.discountValue),
      scope(sale.productIds, sale.categoryIds),
    ]
      .filter(Boolean)
      .join(' · '),
    usage: sale.stockCap === null ? undefined : `${sale.soldCount} of ${sale.stockCap} sold`,
    status: scheduleStatus(sale),
    isActive: sale.isActive,
    createdAt: sale.createdAt,
  };
}

export function couponRow(coupon: Coupon): DiscountRow {
  let what =
    coupon.discountType === 'free_shipping'
      ? 'Free shipping'
      : amount(coupon.discountType, coupon.discountValue);
  if (coupon.discountType === 'percent' && coupon.maxDiscountCents !== null) {
    what += ` up to ${formatCents(coupon.maxDiscountCents)}`;
  }
  if (coupon.minSubtotalCents !== null) {
    what += ` · over ${formatCents(coupon.minSubtotalCents)}`;
  }

  return {
    kind: 'coupons',
    id: coupon.id,
    href: `/discounts/coupons/${coupon.id}`,
    title: coupon.code,
    type: coupon.isAutomatic ? 'Automatic' : 'Coupon',
    summary: what,
    usage: `${count(coupon.usedCount, 'use')} · ${formatCents(coupon.discountGivenCents)} given`,
    status: scheduleStatus(coupon),
    isActive: coupon.isActive,
    createdAt: coupon.createdAt,
  };
}

export function promotionRow(promotion: Promotion): DiscountRow {
  let summary: string;
  if (promotion.type === 'buy_x_get_y') {
    const off = promotion.getPercentOff === 100 ? 'free' : `${promotion.getPercentOff}% off`;
    summary = `Buy ${promotion.buyQuantity} get ${promotion.getQuantity} ${off}`;
    const on = scope(promotion.productIds, promotion.categoryIds);
    if (on) summary += ` · ${on}`;
  } else {
    summary = `${count(promotion.productIds.length, 'product')} · ${amount(promotion.discountType, promotion.discountValue)}`;
    if (promotion.discountType === 'fixed') summary += ' each set';
  }

  return {
    kind: 'promotions',
    id: promotion.id,
    title: promotion.name,
    type: promotion.type === 'buy_x_get_y' ? 'Buy X get Y' : 'Bundle',
    summary,
    status: scheduleStatus(promotion),
    isActive: promotion.isActive,
    createdAt: promotion.createdAt,
  };
}
