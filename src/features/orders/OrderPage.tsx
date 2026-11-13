import { useId, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { DetailSkeleton } from '@/components/Loading';
import { RecordHeader } from '@/components/RecordHeader';
import { Button } from '@/components/ui/button';
import { ApiError, errorMessage } from '@/lib/api';
import { formatCents } from '@/lib/money';
import { useHistoryItem } from '@/features/audit-log/history';
import { useOrder, type Order } from './api';
import { dateTimeFormat } from './labels';
import { NextStep } from './NextStep';
import { OrderActivity } from './OrderActivity';
import { PaymentBadge, StatusBadge } from './OrderBadges';
import { paymentSteps, statusSteps } from './order-steps';
import { Steps } from './Steps';
import { useOrderActions } from './use-order-actions';

/** Returns to the list with the filters it had, when the user came from it. */
function useBackLink() {
  const state: unknown = useLocation().state;
  const listSearch =
    typeof state === 'object' && state !== null && 'listSearch' in state ? state.listSearch : '';
  return `/orders${typeof listSearch === 'string' ? listSearch : ''}`;
}

function Items({ order }: { order: Order }) {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const tax = order.pricesIncludeTax
    ? `VAT ${order.taxRatePercent}% (included)`
    : `VAT ${order.taxRatePercent}%`;
  const rows = [
    ['Subtotal', order.subtotalCents],
    ['Shipping', order.shippingCents],
    [tax, order.taxCents],
  ] as const;

  return (
    <section aria-labelledby="items-heading" className="rounded-lg border">
      <div className="flex items-baseline justify-between gap-4 px-4 pt-4 pb-2">
        <h2 id="items-heading" className="font-medium">
          Items
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {count} {count === 1 ? 'item' : 'items'}
        </p>
      </div>
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
      {/* Exactly as the backend sends them. The browser never adds them up. */}
      <dl aria-label="Totals" className="space-y-1 border-t p-4 text-sm tabular-nums">
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

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-3 border-t p-4 first:border-t-0">
      <h2 id={headingId} className="font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Where the order is, who it is for, where it goes, and how it was paid. */
function SidePanel({ order }: { order: Order }) {
  const address = order.shippingAddress;

  return (
    <div className="rounded-lg border">
      <PanelSection title="Progress">
        <Steps label="Status steps" steps={statusSteps(order)} />
      </PanelSection>

      <PanelSection title="Customer">
        <p className="text-sm break-words">
          {order.customerEmail}
          {order.isGuest && <span className="text-muted-foreground"> · Guest</span>}
        </p>
      </PanelSection>

      <PanelSection title="Ship to">
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
      </PanelSection>

      <PanelSection title="Payment">
        <Steps label="Payment steps" steps={paymentSteps(order)} />
        {(order.payment?.providerName || order.paymentReference) && (
          <div className="space-y-0.5 text-sm text-muted-foreground">
            {order.payment?.providerName && (
              <p>
                {order.payment.providerName}
                {order.payment.accountName && ` · ${order.payment.accountName}`}
              </p>
            )}
            {order.payment?.accountNumber && (
              <p className="tabular-nums">{order.payment.accountNumber}</p>
            )}
            {order.paymentReference && (
              <p className="tabular-nums">Reference {order.paymentReference}</p>
            )}
          </div>
        )}
      </PanelSection>
    </div>
  );
}

function OrderDetails({ order, backLink }: { order: Order; backLink: string }) {
  const { next, more, dialog } = useOrderActions(order);
  const history = useHistoryItem('order', order.id);
  const menu = [
    ...history,
    ...more.map((action) => ({
      key: action.key,
      label: action.label,
      onSelect: action.run,
      destructive: action.destructive,
      disabled: action.disabled,
    })),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <RecordHeader
        back={{ to: backLink, label: 'Back to orders' }}
        title={<span className="tabular-nums">{order.orderNumber}</span>}
        badges={
          <>
            <PaymentBadge status={order.paymentStatus} />
            <StatusBadge status={order.status} />
          </>
        }
        menu={menu}
        facts={`Placed ${dateTimeFormat.format(new Date(order.createdAt))} · ${order.customerEmail}`}
      />

      {/* One column on phones, in the order staff need it. From lg the panel moves to the
          right, and the last row takes any extra height so the main cards stay together. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_auto_auto_1fr]">
        <div className="min-w-0 lg:col-start-1 [&:empty]:hidden">
          <NextStep order={order} actions={next} />
        </div>
        <div className="min-w-0 lg:col-start-1">
          <Items order={order} />
        </div>
        <div className="min-w-0 lg:col-start-2 lg:row-span-4 lg:row-start-1">
          <SidePanel order={order} />
        </div>
        <div className="min-w-0 lg:col-start-1 [&:empty]:hidden">
          <OrderActivity order={order} />
        </div>
      </div>

      {dialog}
    </div>
  );
}

export function OrderPage() {
  const { id = '' } = useParams();
  const order = useOrder(id);
  const backLink = useBackLink();

  if (order.isPending) {
    return <DetailSkeleton />;
  }

  if (order.isError) {
    const notFound = order.error instanceof ApiError && order.error.status === 404;
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="-ml-2">
          <Link to={backLink}>Back to orders</Link>
        </Button>
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

  return <OrderDetails order={order.data.data} backLink={backLink} />;
}
