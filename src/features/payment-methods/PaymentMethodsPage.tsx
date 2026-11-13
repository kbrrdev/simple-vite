import { useState } from 'react';
import { MoreHorizontalIcon, WalletIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { errorMessage } from '@/lib/api';
import { ListSkeleton } from '@/components/Loading';
import {
  useDeletePaymentMethod,
  usePaymentMethods,
  useUpdatePaymentMethod,
  type PaymentMethod,
} from './api';
import { PaymentMethodDialog } from './PaymentMethodDialog';

type Confirming = { method: PaymentMethod; action: 'turn-off' | 'delete' };

export function PaymentMethodsPage() {
  const [editing, setEditing] = useState<PaymentMethod | 'new' | null>(null);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const methods = usePaymentMethods();
  const update = useUpdatePaymentMethod();
  const remove = useDeletePaymentMethod();

  function turnOn(method: PaymentMethod) {
    update.mutate(
      { id: method.id, body: { enabled: true } },
      {
        onSuccess: () => toast.success(`${method.providerName} is offered at checkout again`),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  const turningOff = confirming?.action === 'turn-off';
  const pending = turningOff ? update : remove;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment methods"
        description="How customers pay. Checkout offers the methods that are on."
        actions={<Button onClick={() => setEditing('new')}>New payment method</Button>}
      />

      {methods.isPending && <ListSkeleton rows={3} media />}

      {methods.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(methods.error)}</p>
          <Button variant="outline" onClick={() => methods.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {methods.data?.data.length === 0 && (
        <EmptyState
          icon={WalletIcon}
          title="No payment methods yet"
          action={<Button onClick={() => setEditing('new')}>New payment method</Button>}
        >
          Add one so customers can pay by e-wallet or bank transfer.
        </EmptyState>
      )}

      {methods.data && methods.data.data.length > 0 && (
        <ul aria-label="Payment methods" className="overflow-hidden rounded-lg border">
          {methods.data.data.map((method, index) => (
            <li
              key={method.id}
              className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t' : ''}`}
            >
              {method.qrUrl ? (
                <img
                  src={method.qrUrl}
                  alt=""
                  loading="lazy"
                  className="size-10 shrink-0 rounded-md bg-muted object-cover"
                />
              ) : (
                <div className="size-10 shrink-0 rounded-md bg-muted" />
              )}
              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
                <p className="flex items-center gap-2 font-medium sm:w-48">
                  <span className="truncate">{method.providerName}</span>
                  {!method.enabled && <Badge variant="secondary">Off</Badge>}
                </p>
                <p className="truncate text-sm text-muted-foreground sm:flex-1">
                  {method.accountName} ·{' '}
                  <span className="tabular-nums">{method.accountNumber}</span>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Edit ${method.providerName}`}
                onClick={() => setEditing(method)}
              >
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`More actions for ${method.providerName}`}
                  >
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  {method.enabled ? (
                    <DropdownMenuItem
                      className="min-h-11 md:min-h-8"
                      onSelect={() => setConfirming({ method, action: 'turn-off' })}
                    >
                      Turn off
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="min-h-11 md:min-h-8"
                      onSelect={() => turnOn(method)}
                    >
                      Turn on
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    className="min-h-11 md:min-h-8"
                    onSelect={() => setConfirming({ method, action: 'delete' })}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <PaymentMethodDialog
          method={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title={turningOff ? 'Turn off payment method' : 'Delete payment method'}
          description={
            turningOff
              ? `Customers can't choose ${confirming.method.providerName} at checkout. Orders already placed keep it.`
              : `Delete ${confirming.method.providerName}? A method that orders have used can't be deleted, only turned off.`
          }
          actionLabel={turningOff ? 'Turn off' : 'Delete'}
          destructive
          pending={pending.isPending}
          error={pending.error}
          onConfirm={() => {
            const close = (message: string) => {
              toast.success(message);
              setConfirming(null);
            };
            if (turningOff) {
              update.mutate(
                { id: confirming.method.id, body: { enabled: false } },
                { onSuccess: () => close('Payment method turned off') },
              );
            } else {
              remove.mutate(confirming.method.id, {
                onSuccess: () => close('Payment method deleted'),
              });
            }
          }}
          onClose={() => {
            pending.reset();
            setConfirming(null);
          }}
        />
      )}
    </div>
  );
}
