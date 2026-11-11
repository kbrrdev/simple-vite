import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { NativeSelect } from '@/components/NativeSelect';
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
import { useSaveCategory, type CategoryNode } from './api';
import { CategoryImageField, type CategoryImage } from './CategoryImageField';
import { parentOptions } from './tree';

interface Props {
  tree: CategoryNode[];
  /** The category to edit. Leave it out to create a new one. */
  category?: CategoryNode;
  /** The parent a new category starts under. */
  parentId?: string;
  onClose: () => void;
}

export function CategoryFormDialog({ tree, category, parentId: initialParentId, onClose }: Props) {
  const [name, setName] = useState(category?.name ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? initialParentId ?? '');
  const [image, setImage] = useState<CategoryImage | null>(
    category?.imageAssetId ? { id: category.imageAssetId, url: category.imageUrl } : null,
  );
  const [uploading, setUploading] = useState(false);
  const [emptyName, setEmptyName] = useState(false);
  const save = useSaveCategory();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();
    setEmptyName(!trimmed);
    if (!trimmed) return;

    save.mutate(
      {
        id: category?.id,
        name: trimmed,
        parentId: parentId || null,
        imageAssetId: image?.id ?? null,
      },
      {
        onSuccess: () => {
          toast.success(category ? 'Category saved' : 'Category created');
          onClose();
        },
      },
    );
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const detail = (field: string) => apiError?.details.find((item) => item.field === field)?.message;
  // A duplicate name is a 409, which belongs next to the field like a validation error.
  const nameError = emptyName
    ? 'Enter a name.'
    : (detail('name') ?? (apiError?.status === 409 ? apiError.message : undefined));
  const parentError = detail('parentId');
  const imageError = detail('imageAssetId');
  const otherError = save.error && !nameError && !parentError && !imageError;

  let title = 'New category';
  if (category) title = 'Edit category';
  else if (initialParentId) title = 'New subcategory';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Customers see the name and image in the store.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              maxLength={100}
              required
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'category-name-error' : undefined}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {nameError && (
              <p id="category-name-error" className="text-sm text-destructive">
                {nameError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-parent">Parent</Label>
            <NativeSelect
              id="category-parent"
              aria-invalid={Boolean(parentError)}
              aria-describedby={parentError ? 'category-parent-error' : undefined}
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">None (top level)</option>
              {parentOptions(tree, category).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
            {parentError && (
              <p id="category-parent-error" className="text-sm text-destructive">
                {parentError}
              </p>
            )}
          </div>

          <CategoryImageField
            image={image}
            onChange={setImage}
            error={imageError}
            onUploadingChange={setUploading}
          />

          {otherError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(save.error)}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || uploading}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
