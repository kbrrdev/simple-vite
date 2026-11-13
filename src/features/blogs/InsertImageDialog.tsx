import { useState } from 'react';
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
import { ImageField, type ChosenImage } from '@/features/files/ImageField';

interface Props {
  onInsert: (alt: string, url: string) => void;
  onClose: () => void;
}

/** Picks an image from Files, or uploads one, with alt text, for the middle of a post. */
export function InsertImageDialog({ onInsert, onClose }: Props) {
  const [image, setImage] = useState<ChosenImage | null>(null);
  const [alt, setAlt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ image?: string; alt?: string }>({});

  function insert() {
    const found = {
      image: image?.url ? undefined : 'Choose an image.',
      alt: alt.trim() ? undefined : 'Describe the image for people who cannot see it.',
    };
    setErrors(found);
    if (!image?.url || !alt.trim()) return;
    onInsert(alt.trim(), image.url);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {/* Not a form: the dialog belongs to the post's form, which a submit here would send. */}
        <div className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
            <DialogDescription>It goes on its own line where the cursor is.</DialogDescription>
          </DialogHeader>

          <ImageField
            legend="Image"
            image={image}
            onChange={setImage}
            error={errors.image}
            onUploadingChange={setUploading}
          />

          <div className="space-y-2">
            <Label htmlFor="insert-image-alt">Alt text</Label>
            <Input
              id="insert-image-alt"
              maxLength={200}
              aria-invalid={Boolean(errors.alt)}
              aria-describedby={errors.alt ? 'insert-image-alt-error' : undefined}
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  insert();
                }
              }}
            />
            {errors.alt && (
              <p id="insert-image-alt-error" className="text-sm text-destructive">
                {errors.alt}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={uploading} onClick={insert}>
              Insert image
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
