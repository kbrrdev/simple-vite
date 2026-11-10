import { Button } from '@/components/ui/button';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** True while the next page loads, so that a double click cannot skip a page. */
  loading?: boolean;
}

export function Pagination({ page, totalPages, onPageChange, loading = false }: Props) {
  return (
    <nav aria-label="Pagination" className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1 || loading}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages || loading}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
