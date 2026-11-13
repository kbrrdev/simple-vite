import { Loading } from '@/components/Loading';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCents } from '@/lib/money';
import type { DateRange } from './api';
import { useSummary } from './api';
import { LoadState } from './LoadState';

const counts = new Intl.NumberFormat('en-PH');

/** The headline figures for the range, exactly as the backend counts them. */
export function Summary({ range }: { range: DateRange }) {
  const summary = useSummary(range);
  const data = summary.data?.data;

  if (!data) {
    return (
      <LoadState
        query={summary}
        skeleton={
          <Loading className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-32" />
              </div>
            ))}
          </Loading>
        }
      />
    );
  }

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
    // Each kind on its own, as discountCents adds them together.
    { label: 'Sale discounts', value: formatCents(data.saleDiscountCents) },
    { label: 'Promotion discounts', value: formatCents(data.promotionDiscountCents) },
    { label: 'Coupon discounts', value: formatCents(data.couponDiscountCents) },
    { label: 'Cancelled orders', value: counts.format(data.cancelledOrders) },
    { label: 'New customers', value: counts.format(data.newCustomers) },
    ...tax,
    { label: 'Shipping', value: formatCents(data.shippingCents) },
  ];

  return (
    <section aria-label="Summary" className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4">
        {headline.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className="text-xl font-semibold break-words tabular-nums md:text-2xl">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      {/* A grid keeps each label over its own value, so pairs never mix when they wrap. */}
      <dl
        aria-label="More figures"
        className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 sm:grid-cols-3 lg:grid-cols-6"
      >
        {more.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="font-medium break-words tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
