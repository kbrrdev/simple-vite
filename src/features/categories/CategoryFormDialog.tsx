import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, errorMessage } from '@/lib/api';
import { useSaveCategory, type Category } from './api';

interface Props {
  /** The category to rename. Leave it out to create a new one. */
  category?: Category;
  onClose: () => void;
}

export function CategoryFormDialog({ category, onClose }: Props) {
  const [name, setName] = useState(category?.name ?? '');
  const [emptyName, setEmptyName] = useState(false);
  const save = useSaveCategory();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();
    setEmptyName(!trimmed);
    if (!trimmed) return;

    save.mutate({ id: category?.id, name: trimmed }, { onSuccess: onClose });
  }

  // A duplicate name is a 409, which belongs next to the field like a validation error.
  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const nameError = emptyName
    ? 'Enter a name.'
    : (apiError?.details.find((detail) => detail.field === 'name')?.message ??
      (apiError?.status === 409 ? apiError.message : undefined));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{category ? 'Rename category' : 'New category'}</DialogTitle>
            <DialogDescription>Customers see this name in the store.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              maxLength={100}
              required
              aria-invalid={Boolean(nameError)}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {nameError && <p className="text-sm text-destructive">{nameError}</p>}
          </div>
          {save.error && !nameError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(save.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
