import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/money';
import type { Order, OrderStatus } from './api';
import { unpaidNote } from './order-steps';
import type { OrderAction } from './use-order-actions';

const statusSteps: Partial<Record<OrderStatus, { title: string; text: string }>> = {
  pending: {
    title: 'Confirm the order',
    text: 'It is ready. Confirm it when you start preparing it.',
  },
  confirmed: {
    title: 'Ship the order',
    text: 'It is being prepared. Mark it shipped when it leaves.',
  },
  shipped: {
    title: 'Waiting for delivery',
    text: 'It is on its way. Mark it delivered when the customer has it.',
  },
};

/** What the next step is, or null when the order has finished. */
function describe(order: Order): { title: string; text: string; reference?: string } | null {
  if (order.paymentStatus === 'submitted') {
    const account = order.payment?.providerName
      ? `${order.payment.providerName} account`
      : 'account';
    return {
      title: 'Check the payment',
      text: `The customer says they sent ${formatCents(order.totalCents)}. Find their reference in the ${account}, then confirm or reject it.`,
      reference: order.paymentReference ?? undefined,
    };
  }
  if (order.status === 'awaiting_payment') {
    return { title: 'Waiting for payment', text: unpaidNote(order) };
  }
  return statusSteps[order.status] ?? null;
}

/** The one thing to do with the order now, with its buttons. Finished orders have none. */
export function NextStep({ order, actions }: { order: Order; actions: OrderAction[] }) {
  const headingId = useId();
  const step = describe(order);
  if (!step) return null;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col overflow-hidden rounded-lg border border-foreground/25"
    >
      <div className="space-y-2 p-4">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Next step
        </p>
        <h2 id={headingId} className="text-lg font-semibold">
          {step.title}
        </h2>
        <p className="text-sm text-muted-foreground">{step.text}</p>
        {step.reference && (
          <div className="pt-1">
            <p className="text-sm text-muted-foreground">Customer's reference</p>
            <p className="text-xl font-semibold tabular-nums select-all">{step.reference}</p>
          </div>
        )}
      </div>
      {actions.length > 0 && (
        <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 *:w-full sm:flex-row sm:justify-end sm:*:w-auto">
          {actions.map((action) => (
            <Button
              key={action.key}
              variant={action.primary ? 'default' : 'outline'}
              disabled={action.disabled}
              onClick={action.run}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
