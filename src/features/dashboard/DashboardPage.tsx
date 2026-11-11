import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { usePaymentsToCheck } from '@/features/orders/api';

export function DashboardPage() {
  const toCheck = usePaymentsToCheck();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {toCheck.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}

      {toCheck.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(toCheck.error)}</p>
          <Button variant="outline" onClick={() => toCheck.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {toCheck.data === 0 && <p className="text-muted-foreground">No payments to check.</p>}

      {toCheck.data !== undefined && toCheck.data > 0 && (
        <Link
          to="/orders?paymentStatus=submitted"
          className="flex min-h-11 items-center justify-between gap-4 rounded-lg border px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring md:max-w-sm"
        >
          <span className="font-medium tabular-nums">
            {toCheck.data} {toCheck.data === 1 ? 'payment' : 'payments'} to check
          </span>
          <span className="text-sm text-muted-foreground">Open</span>
        </Link>
      )}
    </div>
  );
}
