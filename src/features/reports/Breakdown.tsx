import { ActionCard } from '@/components/ActionCard';
import { LinesSkeleton } from '@/components/Loading';
import { formatCents } from '@/lib/money';
import type { ReportSummary } from './api';

const counts = new Intl.NumberFormat('en-PH');
const percent = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 });

/**
 * The rest of the summary, one figure a row, after Shopify's sales breakdown. Each is shown as
 * the backend sends it. The discounts are listed apart, as `discountCents` adds them together.
 */
export function Breakdown({ summary }: { summary: ReportSummary | undefined }) {
  if (!summary) {
    return (
      <ActionCard title="Breakdown">
        <LinesSkeleton lines={6} />
      </ActionCard>
    );
  }

  // A rate change during the range shows each rate on its own.
  const tax =
    summary.taxByRate.length > 1
      ? summary.taxByRate.map((rate) => ({
          label: `VAT ${rate.ratePercent}%`,
          value: formatCents(rate.taxCents),
        }))
      : [{ label: 'Tax', value: formatCents(summary.taxCents) }];
  const groups = [
    [
      { label: 'Collected, before refunds', value: formatCents(summary.collectedCents) },
      { label: 'Refunded', value: formatCents(summary.refundedCents) },
    ],
    [
      { label: 'Sale discounts', value: formatCents(summary.saleDiscountCents) },
      { label: 'Promotion discounts', value: formatCents(summary.promotionDiscountCents) },
      { label: 'Coupon discounts', value: formatCents(summary.couponDiscountCents) },
      ...tax,
      { label: 'Shipping', value: formatCents(summary.shippingCents) },
    ],
    [
      { label: 'Items sold', value: counts.format(summary.itemsSold) },
      { label: 'Cancelled orders', value: counts.format(summary.cancelledOrders) },
    ],
    [
      { label: 'Customers', value: counts.format(summary.customers) },
      { label: 'New customers', value: counts.format(summary.newCustomers) },
      {
        label: 'Returning customers',
        value: `${counts.format(summary.returningCustomers)} (${percent.format(summary.returningCustomerRatePercent)}%)`,
      },
    ],
  ];

  return (
    <ActionCard title="Breakdown">
      <dl aria-label="More figures" className="-mx-4 -my-4 divide-y text-sm">
        {groups.map((group) => (
          <div key={group[0].label} className="space-y-2 px-4 py-3">
            {group.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="font-medium tabular-nums">{item.value}</dd>
              </div>
            ))}
          </div>
        ))}
      </dl>
    </ActionCard>
  );
}
