import { Badge } from '@/components/ui/badge';
import type { OrderStatus, PaymentStatus } from './api';
import { paymentLabels, statusLabels } from './labels';

// Red only for orders that stopped, and a filled badge for payments that need a staff check.
export function StatusBadge({ status }: { status: OrderStatus }) {
  const stopped = status === 'cancelled' || status === 'returned';
  return <Badge variant={stopped ? 'destructive' : 'outline'}>{statusLabels[status]}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={status === 'submitted' ? 'default' : 'secondary'}>
      {paymentLabels[status]}
    </Badge>
  );
}
