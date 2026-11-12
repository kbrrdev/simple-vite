import { Link, Navigate, useLocation, useSearchParams } from 'react-router';
import { NativeSelect } from '@/components/NativeSelect';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/api';
import { formatCents } from '@/lib/money';
import { usePageParam } from '@/lib/use-page-param';
import { ListSkeleton } from '@/components/Loading';
import { pageSize, useOrders, type Order } from './api';
import { PaymentBadge, StatusBadge } from './OrderBadges';
import {
  dateTimeFormat,
  isOrderStatus,
  isPaymentStatus,
  paymentLabels,
  statusLabels,
} from './labels';

function OrderRow({ order }: { order: Order }) {
  const { search } = useLocation();
  const customer = order.isGuest ? `Guest · ${order.customerEmail}` : order.customerEmail;

  return (
    <li>
      <Link
        to={`/orders/${order.id}`}
        state={{ listSearch: search }}
        className="flex flex-col gap-1 border-t px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset md:flex-row md:items-center md:gap-4"
      >
        <div className="md:w-44">
          <p className="font-medium tabular-nums">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {dateTimeFormat.format(new Date(order.createdAt))}
          </p>
        </div>
        <p className="min-w-0 truncate text-sm md:flex-1">{customer}</p>
        <div className="flex items-center justify-between gap-2 md:contents">
          <div className="flex flex-wrap gap-1.5 md:w-56">
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
          </div>
          <p className="font-medium tabular-nums md:w-28 md:text-right">
            {formatCents(order.totalCents)}
          </p>
        </div>
      </Link>
    </li>
  );
}

export function OrdersPage() {
  const [page, setPage] = usePageParam();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const paymentParam = searchParams.get('paymentStatus');
  const status = isOrderStatus(statusParam) ? statusParam : undefined;
  const paymentStatus = isPaymentStatus(paymentParam) ? paymentParam : undefined;
  const orders = useOrders({ page, status, paymentStatus });

  const totalPages = Math.max(1, Math.ceil((orders.data?.meta.total ?? 0) / pageSize));
  const filtered = Boolean(status || paymentStatus);
  const checkingPayments = paymentStatus === 'submitted';

  // A change can empty the last page, so step back to the new last page.
  if (orders.data && !orders.isPlaceholderData && page > totalPages) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(totalPages));
    return <Navigate to={`?${params}`} replace />;
  }

  /** Sets one filter and goes back to the first page. */
  function setFilter(name: 'status' | 'paymentStatus', value: string) {
    setSearchParams((params) => {
      if (value) params.set(name, value);
      else params.delete(name);
      params.delete('page');
      return params;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Button
          variant={checkingPayments ? 'default' : 'outline'}
          aria-pressed={checkingPayments}
          onClick={() => setFilter('paymentStatus', checkingPayments ? '' : 'submitted')}
        >
          Payments to check
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:flex md:items-end">
        <div className="space-y-2 md:w-48">
          <Label htmlFor="order-status">Status</Label>
          <NativeSelect
            id="order-status"
            value={status ?? ''}
            onChange={(event) => setFilter('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 md:w-48">
          <Label htmlFor="order-payment">Payment</Label>
          <NativeSelect
            id="order-payment"
            value={paymentStatus ?? ''}
            onChange={(event) => setFilter('paymentStatus', event.target.value)}
          >
            <option value="">All payments</option>
            {Object.entries(paymentLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        {filtered && (
          <Button variant="ghost" onClick={() => setSearchParams({})}>
            Clear filters
          </Button>
        )}
      </div>

      {orders.isPending && <ListSkeleton />}

      {orders.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(orders.error)}</p>
          <Button variant="outline" onClick={() => orders.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {orders.data?.meta.total === 0 && (
        <p className="text-muted-foreground">
          {filtered ? 'No orders match these filters.' : 'No orders yet.'}
        </p>
      )}

      {orders.data && orders.data.meta.total > 0 && (
        <>
          <ul
            aria-label="Orders"
            className="overflow-hidden rounded-lg border [&>li:first-child>a]:border-t-0"
          >
            {orders.data.data.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            loading={orders.isPlaceholderData}
          />
        </>
      )}
    </div>
  );
}
