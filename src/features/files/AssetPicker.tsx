import { useState } from 'react';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { errorMessage } from '@/lib/api';
import { pageSize, useAssets, type Asset } from './api';
import { formatType } from './file-info';

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

interface Props {
  onPick: (asset: Asset) => void;
  onClose: () => void;
}

/** Lets the user choose an image that was already uploaded on the Files page. */
export function AssetPicker({ onPick, onClose }: Props) {
  const [page, setPage] = useState(1);
  const assets = useAssets(page);

  const totalPages = Math.max(1, Math.ceil((assets.data?.meta.total ?? 0) / pageSize));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose an image</DialogTitle>
          <DialogDescription>Images uploaded on the Files page.</DialogDescription>
        </DialogHeader>

        {assets.isPending && <p className="text-muted-foreground">Loading…</p>}

        {assets.isError && (
          <div className="space-y-4">
            <p role="alert">{errorMessage(assets.error)}</p>
            <Button variant="outline" onClick={() => assets.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {assets.data?.meta.total === 0 && (
          <p className="text-muted-foreground">No images yet. Upload one instead.</p>
        )}

        {assets.data && assets.data.meta.total > 0 && (
          <>
            <ul className="grid max-h-[60svh] grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-4">
              {assets.data.data.map((asset) => {
                const label = `${formatType(asset.mimeType)} image uploaded ${dateFormat.format(new Date(asset.createdAt))}`;

                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      aria-label={`Choose ${label}`}
                      onClick={() => onPick(asset)}
                      className="block w-full rounded-md outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <img
                        src={asset.url}
                        alt={label}
                        loading="lazy"
                        className="aspect-square w-full rounded-md bg-muted object-cover"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              loading={assets.isPlaceholderData}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
