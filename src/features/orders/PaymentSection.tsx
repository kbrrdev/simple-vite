import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/money';
import { useConfirmPayment, useRefundPayment, useRejectPayment, type Order } from './api';
import { ConfirmDialog } from './ConfirmDialog';
import { canRefund, dateTimeFormat } from './labels';

type Action = 'confirm' | 'reject' | 'refund';

/** A plain sentence for payments that need no action from staff. */
function paymentNote(order: Order) {
  if (order.paymentStatus === 'refunded') return 'The refund is recorded.';
  if (order.paymentStatus === 'paid') return 'Paid.';
  if (order.paymentType === 'cod')
    return 'Cash on delivery. It is paid when the order is delivered.';
  if (order.status === 'cancelled') return 'Not paid. The order was cancelled.';
  if (order.paymentDueAt) {
    return `Waiting for the customer to pay by ${dateTimeFormat.format(new Date(order.paymentDueAt))}.`;
  }
  return 'Waiting for the customer to pay.';
}

export function PaymentSection({ order }: { order: Order }) {
  const [action, setAction] = useState<Action | null>(null);
  const confirm = useConfirmPayment();
  const reject = useRejectPayment();
  const refund = useRefundPayment();
  const total = formatCents(order.totalCents);

  const dialogs = {
    confirm: {
      mutation: confirm,
      title: 'Confirm payment',
      description: `Confirm that ${total} arrived with reference ${order.paymentReference ?? ''}?`,
      actionLabel: 'Confirm payment',
      done: 'Payment confirmed',
      destructive: false,
    },
    reject: {
      mutation: reject,
      title: 'Reject payment',
      description: 'This cancels the order and puts its stock back on sale.',
      actionLabel: 'Reject payment',
      done: 'Payment rejected',
      destructive: true,
    },
    refund: {
      mutation: refund,
      title: 'Record refund',
      description: `Record that you refunded ${total} to the customer outside the app.`,
      actionLabel: 'Record refund',
      done: 'Refund recorded',
      destructive: true,
    },
  };
  const dialog = action ? dialogs[action] : null;

  function close() {
    dialog?.mutation.reset();
    setAction(null);
  }

  return (
    <section aria-labelledby="payment-heading" className="space-y-3 rounded-lg border p-4">
      <h2 id="payment-heading" className="font-medium">
        Payment
      </h2>
      {order.payment?.providerName && (
        <p className="text-sm text-muted-foreground">
          {order.payment.providerName}
          {order.payment.accountName && ` · ${order.payment.accountName}`}
          {order.payment.accountNumber && ` · ${order.payment.accountNumber}`}
        </p>
      )}

      {order.paymentStatus === 'submitted' ? (
        <>
          <div>
            <p className="text-sm text-muted-foreground">Customer's reference</p>
            <p className="text-lg font-semibold tabular-nums select-all">
              {order.paymentReference}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setAction('confirm')}>Confirm payment</Button>
            <Button variant="outline" onClick={() => setAction('reject')}>
              Reject
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm">{paymentNote(order)}</p>
      )}

      {canRefund(order) && (
        <Button variant="outline" onClick={() => setAction('refund')}>
          Record refund
        </Button>
      )}

      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          description={dialog.description}
          actionLabel={dialog.actionLabel}
          destructive={dialog.destructive}
          pending={dialog.mutation.isPending}
          error={dialog.mutation.error}
          onConfirm={() =>
            dialog.mutation.mutate(order.id, {
              onSuccess: () => {
                toast.success(dialog.done);
                setAction(null);
              },
            })
          }
          onClose={close}
        />
      )}
    </section>
  );
}
