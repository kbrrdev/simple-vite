import { CircleCheckIcon, ChevronRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import { ListSkeleton } from '@/components/Loading';
import { useOrderStatus } from './api';
import { LoadState } from './LoadState';

const tasks = [
  {
    key: 'paymentsToConfirm',
    title: 'Confirm payments',
    caption: 'Customers sent a payment reference',
    // Read aloud as the link's name, such as "Confirm 3 payments".
    action: (count: number) => `Confirm ${count} ${count === 1 ? 'payment' : 'payments'}`,
    to: '/orders?paymentStatus=submitted',
  },
  {
    key: 'ordersToConfirm',
    title: 'Confirm orders',
    caption: 'Placed and waiting for you',
    action: (count: number) => `Confirm ${count} ${count === 1 ? 'order' : 'orders'}`,
    to: '/orders?status=pending',
  },
  {
    key: 'ordersToShip',
    title: 'Ship orders',
    caption: 'Confirmed and ready to send',
    action: (count: number) => `Ship ${count} ${count === 1 ? 'order' : 'orders'}`,
    to: '/orders?status=confirmed',
  },
] as const;

/**
 * The work waiting for staff right now, as a to-do list linking to the matching orders. Tasks
 * with nothing waiting are left out, and with none at all it says so in one quiet line.
 */
export function NeedsAttention() {
  const status = useOrderStatus();
  const counts = status.data?.data.needsAttention;
  const waiting = counts ? tasks.filter((task) => counts[task.key] > 0) : [];

  return (
    <section aria-labelledby="needs-attention-heading" className="@container space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="needs-attention-heading" className="text-lg font-semibold">
          Needs attention
        </h2>
        {waiting.length > 0 && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {waiting.length} {waiting.length === 1 ? 'task' : 'tasks'}
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

      {waiting.length > 0 && counts && (
        // A bordered list while the section is narrow, and cards a third of the width once it
        // is 672px or wider, so that Review stays beside its task. The sidebar takes some of
        // the window, so this follows the section's width rather than the window's.
        <ul className="overflow-hidden rounded-lg border @2xl:grid @2xl:grid-cols-3 @2xl:gap-4 @2xl:overflow-visible @2xl:rounded-none @2xl:border-0">
          {waiting.map((task) => {
            const count = counts[task.key];
            return (
              <li
                key={task.key}
                className="border-t first:border-t-0 @2xl:overflow-hidden @2xl:rounded-lg @2xl:border @2xl:first:border-t"
              >
                {/* One link per task, so phones get a large target and keyboards one stop. */}
                <Link
                  to={task.to}
                  aria-label={task.action(count)}
                  className="group flex min-h-16 items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset @2xl:h-full @2xl:flex-col @2xl:items-stretch @2xl:gap-4 @2xl:p-4"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3 @2xl:items-start">
                    <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md bg-primary px-2 text-base font-bold text-primary-foreground tabular-nums">
                      {count}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{task.title}</span>
                      <span className="block text-xs text-muted-foreground">{task.caption}</span>
                    </span>
                  </span>
                  {/* Looks like a button, but is part of the link. */}
                  <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border bg-background px-3 text-sm font-medium group-hover:bg-muted @2xl:self-end">
                    Review
                    <ChevronRightIcon aria-hidden className="size-4" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
