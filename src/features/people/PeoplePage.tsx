import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { NativeSelect } from '@/components/NativeSelect';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { usePageParam } from '@/lib/use-page-param';
import { useRoles, type Role } from '@/features/roles/api';
import { ListSkeleton } from '@/components/Loading';
import { AddStaffDialog } from './AddStaffDialog';
import { pageSize, usePeople, type Person } from './api';
import { ChangeRoleDialog } from './ChangeRoleDialog';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const joinedFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

interface RowProps {
  person: Person;
  isYou: boolean;
  /** True until the roles have loaded, as the dialog lists them. */
  disabled: boolean;
  onChangeRole: () => void;
}

function PersonRow({ person, isYou, disabled, onChangeRole }: RowProps) {
  return (
    <li className="flex flex-col gap-2 border-t px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{person.email}</span>
          {isYou && <Badge variant="secondary">You</Badge>}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Joined {joinedFormat.format(new Date(person.createdAt))}
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:contents">
        <p className="text-sm sm:w-40">{person.role?.name}</p>
        {/* The backend refuses changes to your own role, so that a super admin always remains. */}
        {isYou ? (
          <span className="text-xs text-muted-foreground sm:w-28 sm:text-right">
            Cannot change yours
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="sm:w-28"
            disabled={disabled}
            aria-label={`Change role for ${person.email}`}
            onClick={onChangeRole}
          >
            Change role
          </Button>
        )}
      </div>
    </li>
  );
}

export function PeoplePage() {
  const [page, setPage] = usePageParam();
  const [searchParams, setSearchParams] = useSearchParams();
  const [changing, setChanging] = useState<Person | null>(null);
  const [adding, setAdding] = useState(false);
  const { data: me } = useSession();
  const search = searchParams.get('search')?.trim() || undefined;
  const roleParam = searchParams.get('roleId');
  const roleId = roleParam && uuid.test(roleParam) ? roleParam : undefined;
  const people = usePeople({ page, type: 'staff', search, roleId });
  const roles = useRoles();
  const roleList: Role[] = roles.data?.data ?? [];

  const totalPages = Math.max(1, Math.ceil((people.data?.meta.total ?? 0) / pageSize));
  const filtered = Boolean(search || roleId);

  // A change can empty the last page, so step back to the new last page.
  if (people.data && !people.isPlaceholderData && page > totalPages) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(totalPages));
    return <Navigate to={`?${params}`} replace />;
  }

  /** Sets one filter and goes back to the first page. */
  function setFilter(name: 'search' | 'roleId', value: string) {
    setSearchParams((params) => {
      if (value) params.set(name, value);
      else params.delete(name);
      params.delete('page');
      return params;
    });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('search');
    setFilter('search', typeof value === 'string' ? value.trim() : '');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">People</h1>
          <p className="text-sm text-muted-foreground">
            Everyone who can sign in to this app, and their role.
          </p>
        </div>
        <Button disabled={!roles.data} onClick={() => setAdding(true)}>
          Add staff
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_14rem] md:items-end">
        <form role="search" onSubmit={handleSearch} className="space-y-2">
          <Label htmlFor="people-search">Search</Label>
          <div className="flex gap-2">
            {/* Keyed by the URL, so that Back and Clear filters update the field. */}
            <Input
              key={search ?? ''}
              id="people-search"
              name="search"
              type="search"
              placeholder="Email"
              defaultValue={search}
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </div>
        </form>
        <div className="space-y-2">
          <Label htmlFor="people-role">Role</Label>
          <NativeSelect
            id="people-role"
            value={roleId ?? ''}
            onChange={(event) => setFilter('roleId', event.target.value)}
          >
            <option value="">All roles</option>
            {roleList.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {filtered && (
        <Button variant="ghost" onClick={() => setSearchParams({})} className="-mt-2">
          Clear filters
        </Button>
      )}

      {people.isPending && <ListSkeleton />}

      {people.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(people.error)}</p>
          <Button variant="outline" onClick={() => people.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {people.data?.meta.total === 0 && (
        <p className="text-muted-foreground">
          {filtered ? 'No staff match these filters.' : 'No staff yet.'}
        </p>
      )}

      {people.data && people.data.meta.total > 0 && (
        <>
          <ul aria-label="People" className="overflow-hidden rounded-lg border">
            {people.data.data.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                isYou={person.id === me?.id}
                disabled={!roles.data}
                onChangeRole={() => setChanging(person)}
              />
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            loading={people.isPlaceholderData}
          />
        </>
      )}

      {roles.isError && (
        <p role="alert" className="text-sm">
          Roles could not load, so roles cannot be changed: {errorMessage(roles.error)}
        </p>
      )}

      {changing && roles.data && (
        <ChangeRoleDialog person={changing} roles={roleList} onClose={() => setChanging(null)} />
      )}
      {adding && roles.data && <AddStaffDialog roles={roleList} onClose={() => setAdding(false)} />}
    </div>
  );
}
