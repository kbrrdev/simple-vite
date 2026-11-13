import { ViewTabs } from '@/components/ViewTabs';
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

/** A view's filters, keeping the search, so "To ship" while searching shows that person's. */
function viewHref({ status, paymentStatus }: View, search?: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (paymentStatus) params.set('paymentStatus', paymentStatus);
  return `?${params}`;
}

interface Props {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
}

/**
 * The order views. Each is selected when the filters match it exactly. Counts come from the
 * backend's order report, for roles that can read it.
 */
export function OrderTabs({ status, paymentStatus, search }: Props) {
  const canCount = useCan('reports.operations');
  const report = useOrderStatus(canCount);
  const counts = report.data?.data.needsAttention;

  return (
    <ViewTabs
      label="Order views"
      tabs={views.map((view) => ({
        label: view.label,
        to: viewHref(view, search),
        selected: view.status === status && view.paymentStatus === paymentStatus,
        count: view.count && counts ? counts[view.count] : undefined,
      }))}
    />
  );
}
