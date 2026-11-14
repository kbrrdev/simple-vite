import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';

export interface IndexColumn {
  label: string;
  /** The width the rows give this column from `md` up, such as `md:w-40`. */
  className?: string;
}

interface Props {
  /** The list's views, as `ViewTabs`. */
  tabs?: ReactNode;
  /** Search and filter fields, in one row from `md` up. */
  filters?: ReactNode;
  /** Headings over the rows from `md` up, where the rows line up as columns. */
  columns?: IndexColumn[];
  /** Usually `Pagination`. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * A list in one card, after Shopify Admin's index pages: views, then filters, then column
 * headings and rows, with the pages at the foot.
 */
export function IndexCard({ tabs, filters, columns, footer, children }: Props) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      {tabs}
      {filters && (
        <div className="flex flex-col gap-2 border-b p-3 md:flex-row md:flex-wrap md:items-center">
          {filters}
        </div>
      )}
      {columns && (
        // The rows say what each value is to screen readers, so the headings are only visual.
        <div
          aria-hidden
          className="hidden gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground md:flex"
        >
          {columns.map((column) => (
            <span key={column.label} className={cn('truncate', column.className)}>
              {column.label}
            </span>
          ))}
        </div>
      )}
      {children}
      {footer && <div className="border-t px-4 py-2">{footer}</div>}
    </section>
  );
}

/** A failed list inside the card, with Try again. */
export function IndexError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="space-y-4 p-4">
      <p role="alert">{errorMessage(error)}</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/** The rows' list, without its own border, as the card has one. */
export function IndexList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="divide-y">
      {children}
    </ul>
  );
}
