import { useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { useUploadAsset } from '@/features/files/api';
import { AssetPicker } from '@/features/files/AssetPicker';
import { allowedTypes, uploadProblem } from '@/features/files/file-info';

export interface CategoryImage {
  id: string;
  url: string | null;
}

interface Props {
  image: CategoryImage | null;
  onChange: (image: CategoryImage | null) => void;
  /** The backend's message for this field, if any. */
  error?: string;
  /** Tells the form an upload is running, so that it waits before saving. */
  onUploadingChange: (uploading: boolean) => void;
}

export function CategoryImageField({ image, onChange, error, onUploadingChange }: Props) {
  const [picking, setPicking] = useState(false);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useUploadAsset();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared, so that choosing the same file again still triggers a change.
    event.target.value = '';
    if (!file) return;

    upload.reset();
    const problem = uploadProblem(file);
    setFileProblem(problem);
    if (problem) return;

    onUploadingChange(true);
    upload.mutate(file, {
      onSuccess: ({ data }) => onChange({ id: data.id, url: data.url }),
      onSettled: () => onUploadingChange(false),
    });
  }

  const message = fileProblem ?? (upload.error ? errorMessage(upload.error) : error);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm leading-none font-medium">Image</legend>
      <div className="flex items-center gap-3">
        {image?.url ? (
          <img
            src={image.url}
            alt="Category image"
            className="size-16 shrink-0 rounded-md bg-muted object-cover"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
            No image
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInput}
            type="file"
            accept={allowedTypes.join(',')}
            aria-label="Image file"
            className="sr-only"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={upload.isPending}
            onClick={() => fileInput.current?.click()}
          >
            {upload.isPending ? 'Uploading…' : 'Upload image'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>
            Choose from Files
          </Button>
          {image && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              Remove image
            </Button>
          )}
        </div>
      </div>
      {message && <p className="text-sm text-destructive">{message}</p>}

      {picking && (
        <AssetPicker
          onPick={(asset) => {
            onChange({ id: asset.id, url: asset.url });
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </fieldset>
  );
}
