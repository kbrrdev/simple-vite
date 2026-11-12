import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCan } from '@/lib/auth';
import { formatCents } from '@/lib/money';
import { useConfirmPayment, useRefundPayment, useRejectPayment, type Order } from './api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { canRefund } from './labels';
import { ActionCard } from '@/components/ActionCard';
import { Steps } from './Steps';
import { paymentSteps } from './order-steps';

type Action = 'confirm' | 'reject' | 'refund';

export function PaymentSection({ order }: { order: Order }) {
  const [action, setAction] = useState<Action | null>(null);
  const confirm = useConfirmPayment();
  const reject = useRejectPayment();
  const refund = useRefundPayment();
  const canManage = useCan('orders.manage');
  const canRecordRefund = useCan('orders.refund');
  const total = formatCents(order.totalCents);
  const submitted = order.paymentStatus === 'submitted';

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

  let actions;
  if (submitted && canManage) {
    actions = (
      <>
        <Button variant="outline" onClick={() => setAction('reject')}>
          Reject
        </Button>
        <Button onClick={() => setAction('confirm')}>Confirm payment</Button>
      </>
    );
  } else if (!submitted && canRecordRefund && canRefund(order)) {
    actions = (
      <Button variant="outline" onClick={() => setAction('refund')}>
        Record refund
      </Button>
    );
  }

  return (
    <ActionCard title="Payment" actions={actions}>
      <Steps label="Payment steps" steps={paymentSteps(order)}>
        {submitted && (
          <div className="pt-1">
            <p className="text-muted-foreground">Customer's reference</p>
            <p className="text-lg font-semibold tabular-nums select-all">
              {order.paymentReference}
            </p>
          </div>
        )}
      </Steps>

      {order.payment?.providerName && (
        <p className="text-sm text-muted-foreground">
          {order.payment.providerName}
          {order.payment.accountName && ` · ${order.payment.accountName}`}
          {order.payment.accountNumber && ` · ${order.payment.accountNumber}`}
          {!submitted && order.paymentReference && ` · Reference ${order.paymentReference}`}
        </p>
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
    </ActionCard>
  );
}
