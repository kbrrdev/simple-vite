import type { Order, OrderStatus, PaymentStatus } from './api';
import { dateTimeFormat, paymentLabels, statusLabels } from './labels';

export type StepState = 'done' | 'current' | 'upcoming' | 'stopped';

export interface Step {
  /** Stable across states, so React keeps each row. */
  key: string;
  label: string;
  state: StepState;
  /** A sentence under the current step that says what it means. */
  note?: string;
}

/** Marks the steps before `current` as done and the ones after it as upcoming. */
function pathTo(path: { key: string; label: string }[], current: string): Step[] {
  const index = path.findIndex((step) => step.key === current);
  return path.map((step, i) => ({
    ...step,
    state: i < index ? 'done' : i === index ? 'current' : 'upcoming',
  }));
}

const statusNotes: Partial<Record<OrderStatus, string>> = {
  awaiting_payment: "Waiting for the customer's payment.",
  pending: 'Ready to confirm. Confirm it when you start preparing it.',
  confirmed: 'Being prepared. Mark it shipped when it leaves.',
  shipped: 'On its way. Mark it delivered, or returned if it comes back.',
  delivered: 'The customer has the order.',
};

/**
 * The order's path through its statuses, with the current one marked. It mirrors the
 * backend's flow as a hint. Orders do not record when each step happened.
 */
export function statusSteps(order: Order): Step[] {
  if (order.status === 'cancelled') {
    return [
      {
        key: 'cancelled',
        label: statusLabels.cancelled,
        state: 'stopped',
        note: 'The order was cancelled, and its stock went back on sale.',
      },
    ];
  }

  // Cash on delivery orders skip the wait for payment.
  const statuses: OrderStatus[] =
    order.paymentType === 'manual'
      ? ['awaiting_payment', 'pending', 'confirmed', 'shipped', 'delivered']
      : ['pending', 'confirmed', 'shipped', 'delivered'];
  const path = statuses.map((status) => ({ key: status, label: statusLabels[status] }));

  if (order.status === 'returned') {
    // A returned order was shipped first, so every step up to Shipped is done.
    const throughShipped = path.slice(0, statuses.indexOf('shipped') + 1);
    return [
      ...throughShipped.map((step) => ({ ...step, state: 'done' as const })),
      {
        key: 'returned',
        label: statusLabels.returned,
        state: 'stopped',
        note: 'Its stock was not added back. Adjust it by hand if the items can be sold again.',
      },
    ];
  }

  return pathTo(path, order.status).map((step) =>
    step.state === 'current' ? { ...step, note: statusNotes[order.status] } : step,
  );
}

function unpaidNote(order: Order) {
  if (order.status === 'cancelled') return 'Not paid. The order was cancelled.';
  if (order.paymentType === 'cod')
    return 'Cash on delivery. It is paid when the order is delivered.';
  if (order.paymentDueAt) {
    const due = dateTimeFormat.format(new Date(order.paymentDueAt));
    return `Waiting for the customer to pay by ${due}.`;
  }
  return 'Waiting for the customer to pay.';
}

/** The order's payment path, with the current step marked. Refunded only shows once it happens. */
export function paymentSteps(order: Order): Step[] {
  const keys: PaymentStatus[] =
    order.paymentType === 'manual' ? ['unpaid', 'submitted', 'paid'] : ['unpaid', 'paid'];
  if (order.paymentStatus === 'refunded') keys.push('refunded');

  const path = keys.map((key) => ({ key, label: paymentLabels[key] }));
  const notes: Record<PaymentStatus, string> = {
    unpaid: unpaidNote(order),
    submitted: 'Check that the payment arrived, then confirm or reject it.',
    paid: 'Paid.',
    refunded: 'You recorded a refund made outside the app.',
  };

  return pathTo(path, order.paymentStatus).map((step) =>
    step.state === 'current' ? { ...step, note: notes[order.paymentStatus] } : step,
  );
}
