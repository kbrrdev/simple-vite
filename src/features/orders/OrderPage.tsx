import { Link, useLocation, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { ApiError, errorMessage } from '@/lib/api';
import { formatCents } from '@/lib/money';
import { HistoryLink } from '@/features/audit-log/HistoryLink';
import { useOrder, type Order } from './api';
import { dateTimeFormat } from './labels';
import { PaymentSection } from './PaymentSection';
import { StatusSection } from './StatusSection';

/** Returns to the list with the filters it had, when the user came from it. */
function useBackLink() {
  const state: unknown = useLocation().state;
  const listSearch =
    typeof state === 'object' && state !== null && 'listSearch' in state ? state.listSearch : '';
  return `/orders${typeof listSearch === 'string' ? listSearch : ''}`;
}

function Items({ order }: { order: Order }) {
  return (
    <section aria-labelledby="items-heading" className="rounded-lg border">
      <h2 id="items-heading" className="px-4 pt-4 pb-2 font-medium">
        Items
      </h2>
      <ul>
        {order.items.map((item) => {
          const options = [
            item.option1Value && `${item.option1Name}: ${item.option1Value}`,
            item.option2Value && `${item.option2Name}: ${item.option2Value}`,
          ].filter(Boolean);

          return (
            <li key={item.id} className="flex gap-3 border-t px-4 py-3">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  className="size-12 shrink-0 rounded-md bg-muted object-cover"
                />
              ) : (
                <div className="size-12 shrink-0 rounded-md bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.productName}</p>
                {options.length > 0 && (
                  <p className="text-sm text-muted-foreground">{options.join(' · ')}</p>
                )}
                <p className="text-sm text-muted-foreground tabular-nums">
                  {item.quantity} × {formatCents(item.unitPriceCents)}
                </p>
              </div>
              <p className="font-medium tabular-nums">{formatCents(item.lineTotalCents)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Totals({ order }: { order: Order }) {
  const tax = order.pricesIncludeTax
    ? `VAT ${order.taxRatePercent}% (included)`
    : `VAT ${order.taxRatePercent}%`;
  const rows = [
    ['Subtotal', order.subtotalCents],
    ['Shipping', order.shippingCents],
    [tax, order.taxCents],
  ] as const;

  return (
    <section aria-labelledby="totals-heading" className="rounded-lg border p-4">
      <h2 id="totals-heading" className="sr-only">
        Totals
      </h2>
      <dl className="space-y-1 text-sm tabular-nums">
        {rows.map(([label, cents]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{formatCents(cents)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatCents(order.totalCents)}</dd>
        </div>
      </dl>
    </section>
  );
}

function Customer({ order }: { order: Order }) {
  const address = order.shippingAddress;

  return (
    <section aria-labelledby="customer-heading" className="space-y-3 rounded-lg border p-4">
      <h2 id="customer-heading" className="font-medium">
        Customer
      </h2>
      <p className="text-sm">
        {order.customerEmail}
        {order.isGuest && <span className="text-muted-foreground"> · Guest</span>}
      </p>
      <address className="space-y-0.5 text-sm not-italic">
        <p className="font-medium">{address.recipientName}</p>
        <p>
          <a href={`tel:${address.phone}`} className="underline underline-offset-3">
            {address.phone}
          </a>
        </p>
        <p>{address.line1}</p>
        {address.line2 && <p>{address.line2}</p>}
        <p>
          {address.barangay}, {address.city}
        </p>
        <p>
          {address.province} {address.postalCode}
        </p>
      </address>
    </section>
  );
}

export function OrderPage() {
  const { id = '' } = useParams();
  const order = useOrder(id);
  const backLink = useBackLink();

  const back = (
    <Button variant="ghost" asChild className="-ml-2">
      <Link to={backLink}>Back to orders</Link>
    </Button>
  );

  if (order.isPending) {
    return (
      <p role="status" className="text-muted-foreground">
        Loading…
      </p>
    );
  }

  if (order.isError) {
    const notFound = order.error instanceof ApiError && order.error.status === 404;
    return (
      <div className="space-y-4">
        {back}
        <h1 className="text-2xl font-semibold">{notFound ? 'Order not found' : 'Order'}</h1>
        {notFound ? (
          <p className="text-muted-foreground">This order does not exist, or its link is wrong.</p>
        ) : (
          <>
            <p role="alert">{errorMessage(order.error)}</p>
            <Button variant="outline" onClick={() => order.refetch()}>
              Try again
            </Button>
          </>
        )}
      </div>
    );
  }

  const data = order.data.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {back}
          <HistoryLink entityType="order" entityId={data.id} />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-2xl font-semibold tabular-nums">{data.orderNumber}</h1>
          <p className="text-xl font-semibold tabular-nums">{formatCents(data.totalCents)}</p>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          Placed {dateTimeFormat.format(new Date(data.createdAt))} · {data.customerEmail}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PaymentSection order={data} />
        <StatusSection order={data} />
      </div>

      <Items order={data} />
      <Totals order={data} />
      <Customer order={data} />
    </div>
  );
}
