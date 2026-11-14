import { formatCents } from '@/lib/money';
import type { ReportSales, ReportSummary } from './api';
import { compactCents } from './sales-format';

type Point = ReportSales['points'][number];
type Changes = NonNullable<ReportSummary['changes']>;

export interface Metric {
  key: 'gross' | 'collected' | 'orders' | 'average';
  label: string;
  /** The card's figure, from the summary. */
  summary: keyof Changes & keyof ReportSummary;
  /** The same figure for each point, for the trend line and the chart. */
  point: Exclude<keyof Point, 'date'>;
  /** What the chart calls the points, when they count something slightly different. */
  pointLabel?: string;
  money: boolean;
}

/** The headline figures, after Shopify's: each a card, and the one picked fills the chart. */
export const metrics: Metric[] = [
  {
    key: 'gross',
    label: 'Gross sales',
    summary: 'grossSalesCents',
    point: 'grossSalesCents',
    money: true,
  },
  {
    key: 'collected',
    label: 'Collected, after refunds',
    summary: 'netCollectedCents',
    point: 'netCollectedCents',
    money: true,
  },
  {
    key: 'orders',
    label: 'Orders placed',
    summary: 'ordersPlaced',
    point: 'orders',
    // The summary counts cancelled orders as placed, and the points leave them out.
    pointLabel: 'Orders, apart from cancelled',
    money: false,
  },
  {
    key: 'average',
    label: 'Average order',
    summary: 'averageOrderValueCents',
    point: 'averageOrderValueCents',
    money: true,
  },
];

export function findMetric(key: string | null) {
  return metrics.find((metric) => metric.key === key) ?? metrics[0];
}

const counts = new Intl.NumberFormat('en-PH');

/** A metric's value for display, in pesos or as a count. */
export function formatMetric(metric: Metric, value: number) {
  return metric.money ? formatCents(value) : counts.format(value);
}

/** A short axis label: "₱48.3K" for money, or the count. */
export function axisMetric(metric: Metric, value: number) {
  return metric.money ? compactCents(value) : counts.format(value);
}

const percent = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 });

/**
 * The backend's percent change, as the badge shows it and as it is read aloud. Null when the
 * previous period had none, as no percent can say how far it rose from nothing.
 */
export function describeChange(change: number | null | undefined) {
  if (change === null || change === undefined) return null;
  const amount = `${percent.format(Math.abs(change))}%`;
  if (change > 0) return { direction: 'up' as const, text: amount, spoken: `up ${amount}` };
  if (change < 0) return { direction: 'down' as const, text: amount, spoken: `down ${amount}` };
  return { direction: 'flat' as const, text: '0%', spoken: 'no change' };
}
