import type { Order, OrderStatus, PaymentStatus } from './api';

export const statusLabels: Record<OrderStatus, string> = {
  awaiting_payment: 'Awaiting payment',
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  returned: 'Returned',
  cancelled: 'Cancelled',
};

export const paymentLabels: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  submitted: 'Payment to check',
  paid: 'Paid',
  refunded: 'Refunded',
};

export function isOrderStatus(value: string | null): value is OrderStatus {
  return value !== null && Object.hasOwn(statusLabels, value);
}

export function isPaymentStatus(value: string | null): value is PaymentStatus {
  return value !== null && Object.hasOwn(paymentLabels, value);
}

/**
 * The moves staff can make from each status. It mirrors the backend as a hint, so that only
 * useful buttons show. The backend decides, and its 409 is shown when it refuses.
 */
export const nextStatuses: Partial<Record<OrderStatus, OrderStatus[]>> = {
  awaiting_payment: ['cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
};

export const moveLabels: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Mark confirmed',
  shipped: 'Mark shipped',
  delivered: 'Mark delivered',
  returned: 'Mark returned',
  cancelled: 'Cancel order',
};

/** A refund is recorded after a paid order has finished or been cancelled. */
export function canRefund(order: Order) {
  return (
    order.paymentStatus === 'paid' && ['cancelled', 'returned', 'delivered'].includes(order.status)
  );
}

export const dateTimeFormat = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
