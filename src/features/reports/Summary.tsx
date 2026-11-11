import { formatCents } from '@/lib/money';
import type { DateRange } from './api';
import { useSummary } from './api';
import { LoadState } from './LoadState';

const counts = new Intl.NumberFormat('en-PH');

/** The headline figures for the range, exactly as the backend counts them. */
export function Summary({ range }: { range: DateRange }) {
  const summary = useSummary(range);
  const data = summary.data?.data;

  if (!data) return <LoadState query={summary} />;

  const headline = [
    { label: 'Gross sales', value: formatCents(data.grossSalesCents) },
    { label: 'Collected, after refunds', value: formatCents(data.netCollectedCents) },
    { label: 'Orders placed', value: counts.format(data.ordersPlaced) },
    { label: 'Average order', value: formatCents(data.averageOrderValueCents) },
  ];
  // A rate change during the range shows each rate on its own.
  const tax =
    data.taxByRate.length > 1
      ? data.taxByRate.map((rate) => ({
          label: `VAT ${rate.ratePercent}%`,
          value: formatCents(rate.taxCents),
        }))
      : [{ label: 'Tax', value: formatCents(data.taxCents) }];
  const more = [
    { label: 'Items sold', value: counts.format(data.itemsSold) },
    { label: 'Refunded', value: formatCents(data.refundedCents) },
    { label: 'Cancelled orders', value: counts.format(data.cancelledOrders) },
    { label: 'New customers', value: counts.format(data.newCustomers) },
    ...tax,
    { label: 'Shipping', value: formatCents(data.shippingCents) },
  ];

  return (
    <section aria-label="Summary" className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4">
        {headline.map((item) => (
          <div key={item.label}>
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {more.map((item) => (
          <div key={item.label} className="flex gap-1.5">
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className="font-medium tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
