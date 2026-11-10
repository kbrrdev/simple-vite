import { Link } from 'react-router';

/** Shown when a screen fails to render, so one broken screen does not break the whole app. */
export function RouteError() {
  return (
    <div className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        This screen failed to load. Reload the page, or go back to the dashboard.
      </p>
      <Link to="/" className="text-sm underline">
        Back to the dashboard
      </Link>
    </div>
  );
}
