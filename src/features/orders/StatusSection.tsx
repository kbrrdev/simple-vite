import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { useUpdateOrderStatus, type Order, type OrderStatus } from './api';
import { ConfirmDialog } from './ConfirmDialog';
import { moveLabels, nextStatuses, statusLabels } from './labels';

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
  const moves = nextStatuses[order.status] ?? [];

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
  // The first move forward is the one staff usually want.
  const forward = moves.find((status) => !confirmText[status]);

  return (
    <section aria-labelledby="status-heading" className="space-y-3 rounded-lg border p-4">
      <h2 id="status-heading" className="font-medium">
        Status
      </h2>
      {moves.length === 0 ? (
        <p className="text-sm">No further changes.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {moves.map((status) => (
            <Button
              key={status}
              variant={status === forward ? 'default' : 'outline'}
              disabled={update.isPending}
              onClick={() => (confirmText[status] ? setConfirming(status) : move(status))}
            >
              {moveLabels[status]}
            </Button>
          ))}
        </div>
      )}

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
    </section>
  );
}
