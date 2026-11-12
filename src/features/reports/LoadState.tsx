import type { ReactNode } from 'react';
import { LinesSkeleton } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';

interface Props {
  query: { isPending: boolean; isError: boolean; error: Error | null; refetch: () => unknown };
  /** Shapes in the card's layout while it loads. Lines of text by default. */
  skeleton?: ReactNode;
}

/** A card's loading shapes or its error with Try again, so that each card fails on its own. */
export function LoadState({ query, skeleton = <LinesSkeleton /> }: Props) {
  if (query.isPending) return skeleton;
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
