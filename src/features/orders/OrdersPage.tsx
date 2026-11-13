import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { InboxIcon, SearchIcon } from 'lucide-react';
import { NativeSelect } from '@/components/NativeSelect';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/api';
import { formatCents } from '@/lib/money';
import { usePageParam } from '@/lib/use-page-param';
import { ListSkeleton } from '@/components/Loading';
import { pageSize, useOrders, type Order } from './api';
import { PaymentBadge, StatusBadge } from './OrderBadges';
import { OrderTabs } from './OrderTabs';
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
  const search = searchParams.get('search')?.trim() || undefined;
  const orders = useOrders({ page, status, paymentStatus, search });

  const totalPages = Math.max(1, Math.ceil((orders.data?.meta.total ?? 0) / pageSize));
  const filtered = Boolean(status || paymentStatus || search);

  // A change can empty the last page, so step back to the new last page.
  if (orders.data && !orders.isPlaceholderData && page > totalPages) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(totalPages));
    return <Navigate to={`?${params}`} replace />;
  }

  /** Sets one filter and goes back to the first page. */
  function setFilter(name: 'status' | 'paymentStatus' | 'search', value: string) {
    setSearchParams((params) => {
      if (value) params.set(name, value);
      else params.delete(name);
      params.delete('page');
      return params;
    });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('search');
    setFilter('search', typeof value === 'string' ? value.trim() : '');
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" />

      <form role="search" onSubmit={handleSearch} className="flex max-w-xl gap-2">
        <Label htmlFor="order-search" className="sr-only">
          Search orders
        </Label>
        {/* Keyed by the URL, so that Back and Clear filters reset the box. */}
        <Input
          key={search ?? ''}
          id="order-search"
          name="search"
          type="search"
          enterKeyHint="search"
          defaultValue={search ?? ''}
          placeholder="Search by order number, email, name, or reference"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <OrderTabs status={status} paymentStatus={paymentStatus} search={search} />

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

      {orders.data?.meta.total === 0 &&
        (filtered ? (
          <EmptyState icon={SearchIcon} title="No orders match these filters">
            Try another search or view, or clear the filters.
          </EmptyState>
        ) : (
          <EmptyState icon={InboxIcon} title="No orders yet">
            Orders show here as soon as customers check out.
          </EmptyState>
        ))}

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
