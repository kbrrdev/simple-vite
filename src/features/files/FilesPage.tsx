import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
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

/** Whether a drag carries files, rather than text or a link from the page. */
function carriesFiles(event: DragEvent) {
  return event.dataTransfer.types.includes('Files');
}

export function FilesPage() {
  const [page, setPage] = usePageParam();
  const [deleting, setDeleting] = useState<Asset | null>(null);
  // Files that could not be uploaded, each with its name and why.
  const [problems, setProblems] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  // Entering a child fires dragleave on the parent, so drags are counted rather than flagged.
  const dragDepth = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const assets = useAssets(page);
  const upload = useUploadAsset();

  const totalPages = Math.max(1, Math.ceil((assets.data?.meta.total ?? 0) / pageSize));

  // A delete can empty the last page, so step back to the new last page.
  if (assets.data && !assets.isPlaceholderData && page > totalPages) {
    return <Navigate to={`?page=${totalPages}`} replace />;
  }

  /**
   * Checks each file, then uploads the good ones one at a time, as the backend takes one file
   * per request. A bad or refused file is listed and the rest still go.
   */
  async function uploadFiles(files: File[]) {
    if (files.length === 0 || progress) return;

    const found: string[] = [];
    const valid = files.filter((file) => {
      const problem = uploadProblem(file);
      if (problem) found.push(`${file.name}: ${problem}`);
      return !problem;
    });
    setProblems(found);
    if (valid.length === 0) return;

    let uploaded = 0;
    setProgress({ done: 0, total: valid.length });
    for (const [index, file] of valid.entries()) {
      try {
        await upload.mutateAsync(file);
        uploaded += 1;
      } catch (error) {
        found.push(`${file.name}: ${errorMessage(error)}`);
        setProblems([...found]);
      }
      setProgress({ done: index + 1, total: valid.length });
    }
    setProgress(null);

    if (uploaded > 0) {
      toast.success(uploaded === 1 ? 'Image uploaded' : `${uploaded} images uploaded`);
      // New uploads are listed first, so show the first page.
      setPage(1);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Cleared, so that choosing the same files again still triggers a change.
    event.target.value = '';
    void uploadFiles(files);
  }

  return (
    <div
      className="relative space-y-6"
      onDragEnter={(event) => {
        if (!carriesFiles(event)) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!carriesFiles(event)) return;
        dragDepth.current -= 1;
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDragOver={(event) => {
        // Allows the drop. Without it the browser opens the image instead.
        if (carriesFiles(event)) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        void uploadFiles(Array.from(event.dataTransfer.files));
      }}
    >
      {dragging && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-2 z-20 flex items-start justify-center rounded-xl border-2 border-dashed border-foreground/40 bg-background/80 pt-32"
        >
          <p className="rounded-lg bg-background px-4 py-2 font-medium shadow-lg">
            Drop images to upload them
          </p>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        multiple
        accept={allowedTypes.join(',')}
        aria-label="Image files"
        className="sr-only"
        onChange={handleFileChange}
      />
      <PageHeader
        title="Files"
        description="Images for products, categories, blog posts, banners, and payment QR codes. Drop images anywhere on this page to upload them."
        actions={
          <Button onClick={() => fileInput.current?.click()} disabled={Boolean(progress)}>
            {progress ? 'Uploading…' : 'Upload images'}
          </Button>
        }
      />

      {progress && (
        <p role="status" className="text-sm text-muted-foreground tabular-nums">
          Uploading {Math.min(progress.done + 1, progress.total)} of {progress.total}…
        </p>
      )}

      {problems.length > 0 && (
        <div role="alert" className="space-y-1 text-sm text-destructive">
          {problems.length === 1 ? (
            <p>{problems[0]}</p>
          ) : (
            <>
              <p>These images were not uploaded:</p>
              <ul className="list-disc pl-5">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </>
          )}
        </div>
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
          Drop images here, or upload JPEG, PNG, or WebP images of up to 5 MB.
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
