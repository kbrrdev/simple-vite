import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { useUpdateOrderStatus, type Order, type OrderStatus } from './api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { moveLabels, nextStatuses, statusLabels } from './labels';
import { ActionCard } from '@/components/ActionCard';
import { statusSteps } from './order-steps';
import { Steps } from './Steps';

// These cannot be undone, so they ask first.
const confirmText: Partial<Record<OrderStatus, { title: string; description: string }>> = {
  cancelled: {
    title: 'Cancel order',
    description: 'The order is cancelled and its stock goes back on sale. This cannot be undone.',
  },
  returned: {
    title: 'Mark returned',
    description:
      'The order is marked returned. Its stock is not added back, so adjust it by hand if the items can be sold again.',
  },
};

export function StatusSection({ order }: { order: Order }) {
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);
  const update = useUpdateOrderStatus();
  const canManage = useCan('orders.manage');
  const moves = canManage ? (nextStatuses[order.status] ?? []) : [];

  function move(status: OrderStatus) {
    update.mutate(
      { id: order.id, status },
      {
        onSuccess: () => {
          toast.success(`Order is now ${statusLabels[status].toLowerCase()}`);
          setConfirming(null);
        },
        // Confirmed moves show the error in their dialog instead.
        onError: (error) => {
          if (!confirmText[status]) toast.error(errorMessage(error));
        },
      },
    );
  }

  const dialog = confirming ? confirmText[confirming] : undefined;
  // The move forward is the one staff usually want, so it goes last, where the main action sits.
  const forward = moves.find((status) => !confirmText[status]);
  const ordered = [...moves.filter((status) => status !== forward), ...(forward ? [forward] : [])];

  const actions =
    ordered.length > 0
      ? ordered.map((status) => (
          <Button
            key={status}
            variant={status === forward ? 'default' : 'outline'}
            disabled={update.isPending}
            onClick={() => (confirmText[status] ? setConfirming(status) : move(status))}
          >
            {moveLabels[status]}
          </Button>
        ))
      : undefined;

  return (
    <ActionCard title="Status" actions={actions}>
      <Steps label="Status steps" steps={statusSteps(order)} />

      {confirming && dialog && (
        <ConfirmDialog
          title={dialog.title}
          description={dialog.description}
          actionLabel={moveLabels[confirming] ?? dialog.title}
          destructive
          pending={update.isPending}
          error={update.error}
          onConfirm={() => move(confirming)}
          onClose={() => {
            update.reset();
            setConfirming(null);
          }}
        />
      )}
    </ActionCard>
  );
}
