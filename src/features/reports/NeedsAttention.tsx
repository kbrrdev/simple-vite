import {
  ChevronRightIcon,
  CircleCheckIcon,
  ClipboardCheckIcon,
  CreditCardIcon,
  TruckIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { ListSkeleton } from '@/components/Loading';
import { useOrderStatus } from './api';
import { LoadState } from './LoadState';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const tasks = [
  {
    key: 'paymentsToConfirm',
    icon: CreditCardIcon,
    what: (count: number) => plural(count, 'payment', 'payments'),
    rest: 'to confirm',
    caption: 'Customers sent a payment reference',
    // Read aloud as the link's name, such as "Confirm 3 payments".
    action: (count: number) => `Confirm ${plural(count, 'payment', 'payments')}`,
    to: '/orders?paymentStatus=submitted',
  },
  {
    key: 'ordersToConfirm',
    icon: ClipboardCheckIcon,
    what: (count: number) => plural(count, 'order', 'orders'),
    rest: 'to confirm',
    caption: 'Placed and waiting for you',
    action: (count: number) => `Confirm ${plural(count, 'order', 'orders')}`,
    to: '/orders?status=pending',
  },
  {
    key: 'ordersToShip',
    icon: TruckIcon,
    what: (count: number) => plural(count, 'order', 'orders'),
    rest: 'to ship',
    caption: 'Confirmed and ready to send',
    action: (count: number) => `Ship ${plural(count, 'order', 'orders')}`,
    to: '/orders?status=confirmed',
  },
] as const;

/**
 * The work waiting for staff right now, after Shopify's Home: one card with a row per task,
 * each linking to the matching orders. Tasks with nothing waiting are left out, and with none
 * at all the card says so.
 */
export function NeedsAttention() {
  const status = useOrderStatus();
  const counts = status.data?.data.needsAttention;
  const waiting = counts ? tasks.filter((task) => counts[task.key] > 0) : [];

  return (
    <section aria-labelledby="needs-attention-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="needs-attention-heading" className="text-lg font-semibold">
          Needs attention
        </h2>
        {waiting.length > 0 && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {plural(waiting.length, 'task', 'tasks')}
          </p>
        )}
      </div>

      <LoadState query={status} skeleton={<ListSkeleton rows={3} />} />

      {counts && waiting.length === 0 && (
        <p className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
          <CircleCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            <span className="font-medium">All caught up.</span>{' '}
            <span className="text-muted-foreground">
              No payments to confirm, orders to confirm, or orders to ship.
            </span>
          </span>
        </p>
      )}

      {counts && waiting.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-lg border">
          {waiting.map((task) => {
            const count = counts[task.key];
            const Icon = task.icon;
            return (
              <li key={task.key}>
                {/* The whole row is one link, so phones get a large target and keyboards one stop. */}
                <Link
                  to={task.to}
                  aria-label={task.action(count)}
                  className="flex min-h-12 items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon aria-hidden className="size-4 text-muted-foreground" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">
                      <span className="font-semibold tabular-nums">{task.what(count)}</span>{' '}
                      {task.rest}
                    </span>
                    <span className="block text-xs text-muted-foreground">{task.caption}</span>
                  </span>
                  <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
