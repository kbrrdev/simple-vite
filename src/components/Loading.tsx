import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingProps {
  /** What screen readers hear, as the grey shapes have no text. */
  label?: string;
  className?: string;
  children: ReactNode;
}

/** Grey shapes in the layout of what is loading, announced as a status with a hidden label. */
export function Loading({ label = 'Loading…', className, children }: LoadingProps) {
  return (
    <div role="status" className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Varied widths, so that placeholder rows read as text rather than as a grid of bars.
const titleWidths = ['w-2/5', 'w-1/3', 'w-1/2', 'w-1/4'];
const captionWidths = ['w-1/3', 'w-1/2', 'w-1/4', 'w-2/5'];

/** Rows in the bordered list the list pages use, optionally with a thumbnail. */
export function ListSkeleton({
  rows = 5,
  media = false,
  label,
}: {
  rows?: number;
  media?: boolean;
  label?: string;
}) {
  return (
    <Loading label={label} className="overflow-hidden rounded-lg border">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={cn('flex min-h-16 items-center gap-3 px-4 py-3', index > 0 && 'border-t')}
        >
          {media && <Skeleton className="size-10 shrink-0" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className={cn('h-4', titleWidths[index % titleWidths.length])} />
            <Skeleton className={cn('h-3', captionWidths[index % captionWidths.length])} />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </Loading>
  );
}

/** Lines of text, for a card whose content is still loading. */
export function LinesSkeleton({ lines = 3, label }: { lines?: number; label?: string }) {
  return (
    <Loading label={label} className="space-y-3">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn('h-4', index === lines - 1 ? 'w-2/3' : index % 2 ? 'w-5/6' : 'w-full')}
        />
      ))}
    </Loading>
  );
}

/** One block the size of what is loading, such as a chart or a preview. */
export function BlockSkeleton({ className, label }: { className: string; label?: string }) {
  return (
    <Loading label={label}>
      <Skeleton className={className} />
    </Loading>
  );
}

/** A record's page: its title, then two cards of fields. */
export function DetailSkeleton() {
  return (
    <Loading className="space-y-6">
      <Skeleton className="h-8 w-56" />
      {[4, 3].map((lines, card) => (
        <div key={card} className="space-y-4 rounded-lg border p-6">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: lines }, (_, index) => (
            <Skeleton key={index} className={cn('h-4', index % 2 ? 'w-1/2' : 'w-3/4')} />
          ))}
        </div>
      ))}
    </Loading>
  );
}

/** The app's frame, shown while the session is restored or a screen first downloads. */
export function ShellSkeleton() {
  return (
    <Loading className="flex min-h-svh flex-col md:flex-row">
      <div className="flex h-11 items-center gap-3 border-b bg-sidebar px-4 md:hidden">
        <Skeleton className="size-5" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="hidden w-56 shrink-0 flex-col gap-3 border-r bg-sidebar p-4 md:flex">
        <Skeleton className="mb-4 h-5 w-28" />
        {titleWidths.concat(captionWidths).map((width, index) => (
          <Skeleton key={index} className={cn('h-4', width)} />
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-6 p-4 md:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </Loading>
  );
}
