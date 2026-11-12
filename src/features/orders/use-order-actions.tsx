import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { errorMessage } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { formatCents } from '@/lib/money';
import {
  useConfirmPayment,
  useRefundPayment,
  useRejectPayment,
  useUpdateOrderStatus,
  type Order,
  type OrderStatus,
} from './api';
import { canRefund, moveLabels, nextStatuses, statusLabels } from './labels';

export interface OrderAction {
  key: string;
  label: string;
  /** The main action, shown filled. */
  primary?: boolean;
  /** Red in the More menu. */
  destructive?: boolean;
  /** True while a move that does not ask first is saving, so a double click cannot send twice. */
  disabled?: boolean;
  run: () => void;
}

interface Confirming {
  title: string;
  description: string;
  actionLabel: string;
  destructive: boolean;
  /** The mutation behind the dialog, looked up on each render for its pending state and error. */
  mutation: 'confirm' | 'reject' | 'refund' | 'update';
  send: () => void;
}

// These status moves cannot be undone, so they ask first.
const moveConfirmText: Partial<Record<OrderStatus, string>> = {
  cancelled: 'The order is cancelled and its stock goes back on sale. This cannot be undone.',
  returned:
    'The order is marked returned. Its stock is not added back, so adjust it by hand if the items can be sold again.',
};

/**
 * The actions the order allows and the role can use, split into the next step and the rarer
 * ones for the More menu. The rules mirror the backend as a hint, and its errors are shown.
 */
export function useOrderActions(order: Order): {
  next: OrderAction[];
  more: OrderAction[];
  dialog: ReactNode;
} {
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const confirmPayment = useConfirmPayment();
  const rejectPayment = useRejectPayment();
  const refund = useRefundPayment();
  const update = useUpdateOrderStatus();
  const canManage = useCan('orders.manage');
  const canRecordRefund = useCan('orders.refund');
  const mutations = { confirm: confirmPayment, reject: rejectPayment, refund, update };

  const total = formatCents(order.totalCents);
  const submitted = order.paymentStatus === 'submitted';

  function done(message: string) {
    toast.success(message);
    setConfirming(null);
  }

  function move(status: OrderStatus) {
    update.mutate(
      { id: order.id, status },
      {
        onSuccess: () => done(`Order is now ${statusLabels[status].toLowerCase()}`),
        // Moves that ask first show the error in their dialog instead.
        onError: (error) => {
          if (!moveConfirmText[status]) toast.error(errorMessage(error));
        },
      },
    );
  }

  const next: OrderAction[] = [];
  const more: OrderAction[] = [];

  if (submitted && canManage) {
    next.push(
      {
        key: 'reject',
        label: 'Reject',
        run: () =>
          setConfirming({
            title: 'Reject payment',
            description: 'This cancels the order and puts its stock back on sale.',
            actionLabel: 'Reject payment',
            destructive: true,
            mutation: 'reject',
            send: () =>
              rejectPayment.mutate(order.id, { onSuccess: () => done('Payment rejected') }),
          }),
      },
      {
        key: 'confirm',
        label: 'Confirm payment',
        primary: true,
        run: () =>
          setConfirming({
            title: 'Confirm payment',
            description: `Confirm that ${total} arrived with reference ${order.paymentReference ?? ''}?`,
            actionLabel: 'Confirm payment',
            destructive: false,
            mutation: 'confirm',
            send: () =>
              confirmPayment.mutate(order.id, { onSuccess: () => done('Payment confirmed') }),
          }),
      },
    );
  }

  const moves = canManage ? (nextStatuses[order.status] ?? []) : [];
  for (const status of moves) {
    const label = moveLabels[status] ?? statusLabels[status];
    const description = moveConfirmText[status];

    if (!description) {
      // The move forward is the next step, unless a payment is waiting to be checked first.
      const action = { key: status, label, disabled: update.isPending, run: () => move(status) };
      if (submitted) more.push(action);
      else next.push({ ...action, primary: true });
      continue;
    }

    more.push({
      key: status,
      label,
      destructive: true,
      run: () =>
        setConfirming({
          title: label,
          description,
          actionLabel: label,
          destructive: true,
          mutation: 'update',
          send: () => move(status),
        }),
    });
  }

  if (canRecordRefund && canRefund(order)) {
    more.push({
      key: 'refund',
      label: 'Record refund',
      destructive: true,
      run: () =>
        setConfirming({
          title: 'Record refund',
          description: `Record that you refunded ${total} to the customer outside the app.`,
          actionLabel: 'Record refund',
          destructive: true,
          mutation: 'refund',
          send: () => refund.mutate(order.id, { onSuccess: () => done('Refund recorded') }),
        }),
    });
  }

  const active = confirming && mutations[confirming.mutation];
  const dialog = confirming && active && (
    <ConfirmDialog
      title={confirming.title}
      description={confirming.description}
      actionLabel={confirming.actionLabel}
      destructive={confirming.destructive}
      pending={active.isPending}
      error={active.error}
      onConfirm={confirming.send}
      onClose={() => {
        active.reset();
        setConfirming(null);
      }}
    />
  );

  return { next, more, dialog };
}
