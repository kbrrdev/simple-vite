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
import { useSaveCategory, type CategoryInput, type CategoryNode } from './api';
import { ImageField, type ChosenImage } from '@/features/files/ImageField';
import { IconPicker } from './IconPicker';
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
  const [image, setImage] = useState<ChosenImage | null>(
    category?.imageAssetId ? { id: category.imageAssetId, url: category.imageUrl } : null,
  );
  const [icon, setIcon] = useState<string | null>(category?.icon ?? null);
  const [uploading, setUploading] = useState(false);
  const [emptyName, setEmptyName] = useState(false);
  const save = useSaveCategory();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();
    setEmptyName(!trimmed);
    if (!trimmed) return;

    const values = {
      name: trimmed,
      parentId: parentId || null,
      imageAssetId: image?.id ?? null,
      icon,
    };
    const done = {
      onSuccess: () => {
        toast.success(category ? 'Category saved' : 'Category created');
        onClose();
      },
    };
    if (!category) {
      save.mutate(values, done);
      return;
    }

    // Only what changed is sent, so a save cannot undo a change someone else made meanwhile.
    const changes: Partial<CategoryInput> = {};
    if (values.name !== category.name) changes.name = values.name;
    if (values.parentId !== category.parentId) changes.parentId = values.parentId;
    if (values.imageAssetId !== category.imageAssetId) changes.imageAssetId = values.imageAssetId;
    if (values.icon !== category.icon) changes.icon = values.icon;
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    save.mutate({ id: category.id, ...changes }, done);
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const detail = (field: string) => apiError?.details.find((item) => item.field === field)?.message;
  // A duplicate name is a 409, which belongs next to the field like a validation error.
  const nameError = emptyName
    ? 'Enter a name.'
    : (detail('name') ?? (apiError?.status === 409 ? apiError.message : undefined));
  const parentError = detail('parentId');
  const imageError = detail('imageAssetId');
  const iconError = detail('icon');
  const otherError = save.error && !nameError && !parentError && !imageError && !iconError;

  let title = 'New category';
  if (category) title = 'Edit category';
  else if (initialParentId) title = 'New subcategory';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Customers see the name in the store, with the image, or the icon when there is no
              image.
            </DialogDescription>
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

          <ImageField
            legend="Image"
            image={image}
            onChange={setImage}
            error={imageError}
            onUploadingChange={setUploading}
          />

          <IconPicker value={icon} onChange={setIcon} error={iconError} />

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
