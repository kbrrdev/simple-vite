import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { errorMessage } from '@/lib/api';

interface Props {
  title: string;
  description: ReactNode;
  actionLabel: string;
  /** Red for actions that cancel, refund, deactivate, or delete. */
  destructive?: boolean;
  pending: boolean;
  error: Error | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Asks before an action, and shows the backend's message if it refuses. */
export function ConfirmDialog({
  title,
  description,
  actionLabel,
  destructive = false,
  pending,
  error,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(error)}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? 'Saving…' : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
