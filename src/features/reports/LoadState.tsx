import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';

interface Props {
  query: { isPending: boolean; isError: boolean; error: Error | null; refetch: () => unknown };
}

/** A card's loading line or its error with Try again, so that each card fails on its own. */
export function LoadState({ query }: Props) {
  if (query.isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading…
      </p>
    );
  }
  if (query.isError) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm">
          {errorMessage(query.error)}
        </p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  return null;
}
