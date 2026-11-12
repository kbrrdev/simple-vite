import { Navigate, Outlet, useLocation } from 'react-router';
import { ShellSkeleton } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { useLogout, useSession } from '@/lib/auth';

/** Lets in staff, meaning anyone with a role. Customers have none. */
export function RequireStaff() {
  const session = useSession();
  const logout = useLogout();
  const location = useLocation();

  if (session.isPending) return <ShellSkeleton />;

  if (session.isError) {
    return (
      <div className="space-y-4 p-8">
        <p role="alert">{errorMessage(session.error)}</p>
        <Button onClick={() => session.refetch()}>Try again</Button>
      </div>
    );
  }

  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // The backend enforces this on every admin route. The check here only avoids a broken screen.
  if (!session.data.role) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-8">
        <h1 className="text-xl font-semibold">Staff only</h1>
        <p className="text-muted-foreground">
          {session.data.email} is a customer account. Ask a super admin to give it a role.
        </p>
        <Button onClick={() => logout.mutate()} disabled={logout.isPending}>
          Log out
        </Button>
      </div>
    );
  }

  return <Outlet />;
}
