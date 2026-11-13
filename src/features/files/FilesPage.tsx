import { useRef, useState, type ChangeEvent } from 'react';
import { Navigate } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ImagesIcon } from 'lucide-react';
import { Loading } from '@/components/Loading';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/api';
import { usePageParam } from '@/lib/use-page-param';
import { pageSize, useAssets, useUploadAsset, type Asset } from './api';
import { DeleteAssetDialog } from './DeleteAssetDialog';
import { allowedTypes, formatSize, formatType, uploadProblem } from './file-info';

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

export function FilesPage() {
  const [page, setPage] = usePageParam();
  const [deleting, setDeleting] = useState<Asset | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const assets = useAssets(page);
  const upload = useUploadAsset();

  const totalPages = Math.max(1, Math.ceil((assets.data?.meta.total ?? 0) / pageSize));

  // A delete can empty the last page, so step back to the new last page.
  if (assets.data && !assets.isPlaceholderData && page > totalPages) {
    return <Navigate to={`?page=${totalPages}`} replace />;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared, so that choosing the same file again still triggers a change.
    event.target.value = '';
    if (!file) return;

    upload.reset();
    const problem = uploadProblem(file);
    setFileProblem(problem);
    if (problem) return;

    // New uploads are listed first, so show the first page.
    upload.mutate(file, {
      onSuccess: () => {
        toast.success('Image uploaded');
        setPage(1);
      },
    });
  }

  const uploadError = fileProblem ?? (upload.error ? errorMessage(upload.error) : null);

  return (
    <div className="space-y-6">
      <input
        ref={fileInput}
        type="file"
        accept={allowedTypes.join(',')}
        aria-label="Image file"
        className="sr-only"
        onChange={handleFileChange}
      />
      <PageHeader
        title="Files"
        description="Images for products, categories, blog posts, banners, and payment QR codes."
        actions={
          <Button onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? 'Uploading…' : 'Upload image'}
          </Button>
        }
      />

      {uploadError && (
        <p role="alert" className="text-sm text-destructive">
          {uploadError}
        </p>
      )}

      {assets.isPending && (
        <Loading className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="space-y-2 rounded-lg border p-2">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </Loading>
      )}

      {assets.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(assets.error)}</p>
          <Button variant="outline" onClick={() => assets.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {assets.data?.meta.total === 0 && (
        <EmptyState icon={ImagesIcon} title="No images yet">
          Upload JPEG, PNG, or WebP images of up to 5 MB.
        </EmptyState>
      )}

      {assets.data && assets.data.meta.total > 0 && (
        <>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {assets.data.data.map((asset) => {
              const uploaded = dateFormat.format(new Date(asset.createdAt));

              return (
                <li key={asset.id} className="space-y-2 rounded-lg border p-2">
                  <img
                    src={asset.url}
                    alt={`${formatType(asset.mimeType)} image uploaded ${uploaded}`}
                    loading="lazy"
                    className="aspect-square w-full rounded-md bg-muted object-cover"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatType(asset.mimeType)} · {formatSize(asset.sizeBytes)}
                      <br />
                      {uploaded}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Delete image uploaded ${uploaded}`}
                      onClick={() => setDeleting(asset)}
                    >
                      Delete
                    </Button>
                  </div>
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

      {deleting && <DeleteAssetDialog asset={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
