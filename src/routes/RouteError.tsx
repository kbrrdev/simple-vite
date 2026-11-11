import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

/** Shown when a screen fails to render, so one broken screen does not break the whole app. */
export function RouteError() {
  return (
    <div className="mx-auto max-w-md space-y-4 p-4 md:p-8">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        This screen failed to load. Reload the page, or go back to the dashboard.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <Button variant="outline" asChild>
          <Link to="/">Back to the dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
