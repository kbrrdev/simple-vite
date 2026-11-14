import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { IndexCard, IndexError, IndexList, type IndexColumn } from '@/components/IndexCard';
import { InboxIcon, SearchIcon } from 'lucide-react';
import { NativeSelect } from '@/components/NativeSelect';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

// The widths match the row's below, so the headings sit over their values.
const columns: IndexColumn[] = [
  { label: 'Order', className: 'md:w-44' },
  { label: 'Customer', className: 'md:flex-1' },
  { label: 'Status', className: 'md:w-56' },
  { label: 'Total', className: 'md:w-28 md:text-right' },
];

function OrderRow({ order }: { order: Order }) {
  const { search } = useLocation();
  const customer = order.isGuest ? `Guest · ${order.customerEmail}` : order.customerEmail;

  return (
    <li>
      <Link
        to={`/orders/${order.id}`}
        state={{ listSearch: search }}
        className="flex flex-col gap-1 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset md:flex-row md:items-center md:gap-4"
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

      <IndexCard
        tabs={<OrderTabs status={status} paymentStatus={paymentStatus} search={search} />}
        filters={
          <>
            <form role="search" onSubmit={handleSearch} className="flex gap-2 md:flex-1">
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
            <div className="grid grid-cols-2 gap-2 md:flex">
              <Label htmlFor="order-status" className="sr-only">
                Status
              </Label>
              <NativeSelect
                id="order-status"
                className="md:w-44"
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
              <Label htmlFor="order-payment" className="sr-only">
                Payment
              </Label>
              <NativeSelect
                id="order-payment"
                className="md:w-44"
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
          </>
        }
        columns={orders.data?.meta.total ? columns : undefined}
        footer={
          orders.data &&
          orders.data.meta.total > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              loading={orders.isPlaceholderData}
            />
          )
        }
      >
        {orders.isPending && <ListSkeleton bare />}

        {orders.isError && <IndexError error={orders.error} onRetry={() => orders.refetch()} />}

        {orders.data?.meta.total === 0 &&
          (filtered ? (
            <EmptyState bare icon={SearchIcon} title="No orders match these filters">
              Try another search or view, or clear the filters.
            </EmptyState>
          ) : (
            <EmptyState bare icon={InboxIcon} title="No orders yet">
              Orders show here as soon as customers check out.
            </EmptyState>
          ))}

        {orders.data && orders.data.meta.total > 0 && (
          <IndexList label="Orders">
            {orders.data.data.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </IndexList>
        )}
      </IndexCard>
    </div>
  );
}
