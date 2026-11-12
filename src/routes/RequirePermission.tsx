import { Outlet } from 'react-router';
import { useCan, useSession, type Permission } from '@/lib/auth';
import { NoAccess } from './NoAccess';

/**
 * Shows its pages only to roles with `permission`. Others see why, instead of a screen of
 * errors. The backend still checks every request.
 */
export function RequirePermission({ permission }: { permission: Permission }) {
  const allowed = useCan(permission);
  return allowed ? <Outlet /> : <NoAccess />;
}

/**
 * Shows its pages only to super admins. Admin can hold every permission too, so this reads
 * the `superAdmin` flag rather than the permissions.
 */
export function RequireSuperAdmin() {
  const { data: user } = useSession();
  return user?.superAdmin ? <Outlet /> : <NoAccess />;
}
