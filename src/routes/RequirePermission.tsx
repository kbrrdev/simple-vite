import { Link, Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import { useCan, type Permission } from '@/lib/auth';

/**
 * Shows its pages only to roles with `permission`. Others see why, instead of a screen of
 * errors. The backend still checks every request.
 */
export function RequirePermission({ permission }: { permission: Permission }) {
  const allowed = useCan(permission);

  if (allowed) return <Outlet />;

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
