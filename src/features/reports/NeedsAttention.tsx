import { ChevronRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import { ActionCard } from '@/components/ActionCard';
import { useOrderStatus } from './api';
import { LoadState } from './LoadState';

const tasks = [
  { key: 'paymentsToConfirm', label: 'payments to confirm', to: '/orders?paymentStatus=submitted' },
  { key: 'ordersToConfirm', label: 'orders to confirm', to: '/orders?status=pending' },
  { key: 'ordersToShip', label: 'orders to ship', to: '/orders?status=confirmed' },
] as const;

/** The work waiting for staff right now, each linking to the matching orders. */
export function NeedsAttention() {
  const status = useOrderStatus();
  const counts = status.data?.data.needsAttention;

  return (
    <ActionCard title="Needs attention">
      <LoadState query={status} />
      {counts && (
        <ul className="-m-4 grid sm:grid-cols-3">
          {tasks.map((task, index) => {
            const count = counts[task.key];
            const border = index > 0 ? 'border-t sm:border-t-0 sm:border-l' : '';

            return (
              <li key={task.key} className={border}>
                {count > 0 ? (
                  <Link
                    to={task.to}
                    className="flex min-h-11 items-center gap-2 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <span className="text-xl font-semibold tabular-nums">{count}</span>{' '}
                    <span className="flex-1 text-sm">{task.label}</span>
                    <ChevronRightIcon aria-hidden className="size-4 text-muted-foreground" />
                  </Link>
                ) : (
                  <p className="flex min-h-11 items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                    No {task.label}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </ActionCard>
  );
}
