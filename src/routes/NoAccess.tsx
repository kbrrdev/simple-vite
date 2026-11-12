import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

/** Shown instead of a page the user's role cannot use. */
export function NoAccess() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">No access</h1>
      <p className="text-muted-foreground">
        Your role does not include this page. Ask a super admin if you need it.
      </p>
      <Button variant="outline" asChild>
        <Link to="/">Back to the dashboard</Link>
      </Button>
    </div>
  );
}
