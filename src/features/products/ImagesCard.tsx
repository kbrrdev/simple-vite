import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { MoreHorizontalIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ActionCard } from '@/components/ActionCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/api';
import { useUploadAsset } from '@/features/files/api';
import { AssetPicker } from '@/features/files/AssetPicker';
import { allowedTypes, uploadProblem } from '@/features/files/file-info';
import {
  useAddImage,
  useRemoveImage,
  useReorderImages,
  useUpdateImageAltText,
  type Product,
} from './api';

/** The backend allows up to this many images per product. */
const maxImages = 10;

type Image = Product['images'][number];

interface AltTextDialogProps {
  title: string;
  imageUrl: string;
  initialAltText: string;
  actionLabel: string;
  pending: boolean;
  error: Error | null;
  onSave: (altText: string) => void;
  onClose: () => void;
}

/** Shows the photo with its alt text field, for adding an image or editing its text. */
function AltTextDialog({
  title,
  imageUrl,
  initialAltText,
  actionLabel,
  pending,
  error,
  onSave,
  onClose,
}: AltTextDialogProps) {
  const [altText, setAltText] = useState(initialAltText);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(altText.trim());
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Alt text describes the photo for shoppers who cannot see it. It is optional.
            </DialogDescription>
          </DialogHeader>
          <img src={imageUrl} alt="" className="max-h-48 w-full rounded-md object-contain" />
          <div className="space-y-2">
            <Label htmlFor="image-alt-text">Alt text</Label>
            <Input
              id="image-alt-text"
              maxLength={255}
              placeholder="Blue trail runner, side view"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(error)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TileProps {
  image: Image;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (offset: -1 | 1) => void;
  onEdit: () => void;
  onRemove: () => void;
}

function ImageTile({ image, index, count, disabled, onMove, onEdit, onRemove }: TileProps) {
  const name = image.altText || `Image ${index + 1}`;

  return (
    <li className="space-y-1">
      <img
        src={image.url}
        alt={image.altText}
        loading="lazy"
        className="aspect-square w-full rounded-md bg-muted object-cover"
      />
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          {index === 0 && <Badge>Main image</Badge>}
          <p
            className={`truncate text-xs ${image.altText ? '' : 'text-muted-foreground'}`}
            title={image.altText}
          >
            {image.altText || 'No alt text'}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label={`More actions for ${name}`}
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem
              className="min-h-11 md:min-h-8"
              disabled={index === 0}
              onSelect={() => onMove(-1)}
            >
              Move earlier
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 md:min-h-8"
              disabled={index === count - 1}
              onSelect={() => onMove(1)}
            >
              Move later
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 md:min-h-8" onSelect={onEdit}>
              Edit alt text
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              className="min-h-11 md:min-h-8"
              onSelect={onRemove}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

export function ImagesCard({ product }: { product: Product }) {
  const [adding, setAdding] = useState<{ assetId: string; url: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<Image | null>(null);
  const [removing, setRemoving] = useState<Image | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useUploadAsset();
  const add = useAddImage();
  const updateAltText = useUpdateImageAltText();
  const remove = useRemoveImage();
  const reorder = useReorderImages();

  const images = product.images;
  const full = images.length >= maxImages;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared, so that choosing the same file again still triggers a change.
    event.target.value = '';
    if (!file) return;

    upload.reset();
    const problem = uploadProblem(file);
    setFileProblem(problem);
    if (problem) return;

    upload.mutate(file, {
      onSuccess: ({ data }) => setAdding({ assetId: data.id, url: data.url }),
    });
  }

  function move(index: number, offset: -1 | 1) {
    const ids = images.map((image) => image.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    reorder.mutate(
      { product, imageIds: ids },
      { onError: (error) => toast.error(errorMessage(error)) },
    );
  }

  const uploadError = fileProblem ?? (upload.error ? errorMessage(upload.error) : null);

  return (
    <ActionCard
      title={`Images (${images.length} of ${maxImages})`}
      actions={
        <>
          <Button variant="outline" disabled={full} onClick={() => setPicking(true)}>
            Choose from Files
          </Button>
          <Button disabled={full || upload.isPending} onClick={() => fileInput.current?.click()}>
            {upload.isPending ? 'Uploading…' : 'Upload image'}
          </Button>
        </>
      }
    >
      <input
        ref={fileInput}
        type="file"
        accept={allowedTypes.join(',')}
        aria-label="Image file"
        className="sr-only"
        onChange={handleFileChange}
      />

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No images yet. The first image is the one shoppers see first.
        </p>
      ) : (
        <ul aria-label="Images" className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <ImageTile
              key={image.id}
              image={image}
              index={index}
              count={images.length}
              disabled={reorder.isPending}
              onMove={(offset) => move(index, offset)}
              onEdit={() => setEditing(image)}
              onRemove={() => setRemoving(image)}
            />
          ))}
        </ul>
      )}

      {full && (
        <p className="text-sm text-muted-foreground">
          A product can have up to {maxImages} images. Remove one to add another.
        </p>
      )}
      {uploadError && (
        <p role="alert" className="text-sm text-destructive">
          {uploadError}
        </p>
      )}

      {picking && (
        <AssetPicker
          onPick={(asset) => {
            setPicking(false);
            setAdding({ assetId: asset.id, url: asset.url });
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {adding && (
        <AltTextDialog
          title="Add image"
          imageUrl={adding.url}
          initialAltText=""
          actionLabel="Add image"
          pending={add.isPending}
          error={add.error}
          onSave={(altText) =>
            add.mutate(
              { productId: product.id, assetId: adding.assetId, altText },
              {
                onSuccess: () => {
                  toast.success('Image added');
                  setAdding(null);
                },
              },
            )
          }
          onClose={() => {
            add.reset();
            setAdding(null);
          }}
        />
      )}

      {editing && (
        <AltTextDialog
          title="Edit alt text"
          imageUrl={editing.url}
          initialAltText={editing.altText}
          actionLabel="Save"
          pending={updateAltText.isPending}
          error={updateAltText.error}
          onSave={(altText) =>
            updateAltText.mutate(
              { productId: product.id, imageId: editing.id, altText },
              {
                onSuccess: () => {
                  toast.success('Alt text saved');
                  setEditing(null);
                },
              },
            )
          }
          onClose={() => {
            updateAltText.reset();
            setEditing(null);
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Remove image"
          description="The image is removed from this product. The file stays in Files."
          actionLabel="Remove"
          destructive
          pending={remove.isPending}
          error={remove.error}
          onConfirm={() =>
            remove.mutate(
              { productId: product.id, imageId: removing.id },
              {
                onSuccess: () => {
                  toast.success('Image removed');
                  setRemoving(null);
                },
              },
            )
          }
          onClose={() => {
            remove.reset();
            setRemoving(null);
          }}
        />
      )}
    </ActionCard>
  );
}
