import { Link } from 'react-router';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { useCan } from '@/lib/auth';
import { useOrderStatus } from '@/features/reports/api';
import type { OrderStatus, PaymentStatus } from './api';

type CountKey = 'paymentsToConfirm' | 'ordersToConfirm' | 'ordersToShip';

interface View {
  label: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  /** The Needs attention count for the view, when staff have work waiting in it. */
  count?: CountKey;
}

// The work staff do most, in the order it happens, matching the Dashboard's Needs attention.
const views: View[] = [
  { label: 'All' },
  { label: 'Payments to check', paymentStatus: 'submitted', count: 'paymentsToConfirm' },
  { label: 'To confirm', status: 'pending', count: 'ordersToConfirm' },
  { label: 'To ship', status: 'confirmed', count: 'ordersToShip' },
  { label: 'Shipped', status: 'shipped' },
];

function viewHref({ status, paymentStatus }: View) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (paymentStatus) params.set('paymentStatus', paymentStatus);
  const search = params.toString();
  return search ? `?${search}` : '?';
}

interface Props {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

/**
 * Saved views of the list as tabs. Each sets the same URL filters as the dropdowns, and is
 * selected when the filters match it exactly. Counts come from the backend's order report, for
 * roles that can read it.
 */
export function OrderTabs({ status, paymentStatus }: Props) {
  const canCount = useCan('reports.operations');
  const report = useOrderStatus(canCount);
  const counts = report.data?.data.needsAttention;

  return (
    // Phones scroll the row sideways rather than wrapping it.
    <nav aria-label="Order views" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max border-b">
        {views.map((view) => {
          const selected = view.status === status && view.paymentStatus === paymentStatus;
          const count = view.count && counts ? counts[view.count] : 0;

          return (
            <li key={view.label}>
              <Link
                to={viewHref(view)}
                aria-current={selected ? 'page' : undefined}
                className={cn(
                  '-mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset md:min-h-9',
                  selected
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {view.label}
                {/* Keeps the count apart from the label when read aloud, as "To ship 2". */}{' '}
                {count > 0 && (
                  <Badge variant="warning" className="tabular-nums">
                    {count}
                  </Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
