import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { ListSkeleton } from '@/components/Loading';
import { useRoles, type Role } from './api';

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function RoleRow({ role }: { role: Role }) {
  // Super admin has every permission, including ones the app has not seen yet.
  const access = role.builtIn
    ? 'Every permission'
    : plural(role.permissions.length, 'permission', 'permissions');

  return (
    <li className="flex flex-col gap-1 border-t px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <Link
            to={`/roles/${role.id}`}
            className="font-medium underline-offset-3 hover:underline focus-visible:underline"
          >
            {role.name}
          </Link>
          {role.builtIn && <Badge variant="secondary">Built in</Badge>}
        </p>
        {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
      </div>
      <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground tabular-nums">
        <span>{access}</span>
        <span aria-hidden>·</span>
        {role.userCount > 0 ? (
          <Link
            to={`/people?roleId=${role.id}`}
            aria-label={`${plural(role.userCount, 'person', 'people')} with ${role.name}`}
            className="inline-flex min-h-11 items-center text-foreground underline-offset-3 hover:underline focus-visible:underline md:min-h-0"
          >
            {plural(role.userCount, 'person', 'people')}
          </Link>
        ) : (
          <span>Nobody yet</span>
        )}
      </p>
    </li>
  );
}

export function RolesPage() {
  const roles = useRoles();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Each staff member has one role, and a role decides what they can do.
          </p>
        </div>
        <Button asChild>
          <Link to="/roles/new">New role</Link>
        </Button>
      </div>

      {roles.isPending && <ListSkeleton rows={4} />}

      {roles.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(roles.error)}</p>
          <Button variant="outline" onClick={() => roles.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {roles.data && (
        <ul aria-label="Roles" className="overflow-hidden rounded-lg border">
          {roles.data.data.map((role) => (
            <RoleRow key={role.id} role={role} />
          ))}
        </ul>
      )}
    </div>
  );
}
