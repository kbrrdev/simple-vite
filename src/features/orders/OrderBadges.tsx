import { Badge } from '@/components/ui/badge';
import type { OrderStatus, PaymentStatus } from './api';
import { paymentLabels, statusLabels } from './labels';

type Tone = 'warning' | 'info' | 'success' | 'secondary';

// Amber when staff need to act, blue while in progress, green when done, and grey while
// waiting on the customer or closed. Red stays for danger, so a cancelled order is grey.
const statusTones: Record<OrderStatus, Tone> = {
  awaiting_payment: 'secondary',
  pending: 'warning',
  confirmed: 'info',
  shipped: 'info',
  delivered: 'success',
  returned: 'secondary',
  cancelled: 'secondary',
};

const paymentTones: Record<PaymentStatus, Tone> = {
  unpaid: 'secondary',
  submitted: 'warning',
  paid: 'success',
  refunded: 'secondary',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={statusTones[status]}>{statusLabels[status]}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={paymentTones[status]}>{paymentLabels[status]}</Badge>;
}
