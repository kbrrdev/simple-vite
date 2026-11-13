import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { cn } from 'cn';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DetailSkeleton, LinesSkeleton } from '@/components/Loading';
import type { MoreMenuItem } from '@/components/MoreMenu';
import { RecordHeader } from '@/components/RecordHeader';
import { SaveBar } from '@/components/SaveBar';
import { PanelSection, SidePanel } from '@/components/SidePanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, errorMessage } from '@/lib/api';
import type { Permission } from '@/lib/auth';
import { useLeaveGuard } from '@/lib/use-leave-guard';
import { useHistoryItem } from '@/features/audit-log/history';
import {
  useCreateRole,
  useDeleteRole,
  usePermissions,
  useRole,
  useUpdateRole,
  type PermissionInfo,
  type Role,
  type RoleChanges,
} from './api';
import { groupPermissions } from './permission-groups';

const back = { to: '/roles', label: 'Back to roles' };
const formId = 'role';

function count(n: number, noun: string) {
  return `${n} ${n === 1 ? noun : `${noun}s`}`;
}

function people(n: number) {
  return n === 1 ? '1 person' : `${n} people`;
}

function BackLink() {
  return (
    <Button variant="ghost" asChild className="-ml-2">
      <Link to="/roles">Back to roles</Link>
    </Button>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

/** Loads the permission list, which both the editor and the Super admin view show. */
function PermissionList({ children }: { children: (permissions: PermissionInfo[]) => ReactNode }) {
  const permissions = usePermissions();

  if (permissions.isPending) {
    return <LinesSkeleton lines={6} label="Loading permissions…" />;
  }

  if (permissions.isError) {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-sm">
          {errorMessage(permissions.error)}
        </p>
        <Button variant="outline" size="sm" onClick={() => permissions.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return children(permissions.data.data);
}

/** Super admin cannot be changed, so it is shown rather than edited. */
function BuiltInRole({ role }: { role: Role }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <RecordHeader
        back={back}
        title={role.name}
        badges={<Badge variant="secondary">Built in</Badge>}
        facts={people(role.userCount)}
      />
      <p className="text-muted-foreground">
        Has every permission, including ones added later, and is the only role that manages roles
        and people. It cannot be changed or deleted.
      </p>

      <section aria-labelledby="built-in-permissions" className="rounded-lg border p-4">
        <h2 id="built-in-permissions" className="mb-3 font-medium">
          Permissions
        </h2>
        <PermissionList>
          {(permissions) => (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {permissions.map((permission) => (
                <li key={permission.key}>{permission.description}</li>
              ))}
            </ul>
          )}
        </PermissionList>
      </section>
    </div>
  );
}

function sameSet(a: Permission[], b: Permission[]) {
  return a.length === b.length && a.every((permission) => b.includes(permission));
}

/** The changes to send for an existing role, so that a save cannot undo another's change. */
function changesFrom(
  values: { name: string; description: string; granted: Permission[] },
  role: Role,
): RoleChanges {
  const changes: RoleChanges = {};
  if (values.name.trim() !== role.name) changes.name = values.name.trim();
  if (values.description.trim() !== role.description) {
    changes.description = values.description.trim();
  }
  if (!sameSet(values.granted, role.permissions)) changes.permissions = values.granted;
  return changes;
}

/**
 * The record page layout: name, description, and permissions on the left, and who has the
 * role on the right. Everything saves together through the save bar.
 */
function RoleEditor({ role }: { role?: Role }) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [granted, setGranted] = useState<Permission[]>(role?.permissions ?? []);
  const [nameMissing, setNameMissing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const create = useCreateRole();
  const update = useUpdateRole();
  const remove = useDeleteRole();
  const save = role ? update : create;
  const navigate = useNavigate();
  const history = useHistoryItem('role', role?.id);

  const changes = role ? changesFrom({ name, description, granted }, role) : {};
  const dirty = role
    ? Object.keys(changes).length > 0
    : Boolean(name.trim() || description.trim() || granted.length > 0);
  const leaveGuard = useLeaveGuard(dirty, 'Your changes to this role will be lost.');

  function toggle(permission: Permission, checked: boolean) {
    setGranted((current) =>
      checked ? [...current, permission] : current.filter((item) => item !== permission),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    setNameMissing(!trimmedName);
    if (!trimmedName) return;

    if (!role) {
      create.mutate(
        { name: trimmedName, description: description.trim(), permissions: granted },
        {
          onSuccess: ({ data }) => {
            toast.success('Role created');
            leaveGuard.allowLeave();
            navigate(`/roles/${data.id}`, { replace: true });
          },
        },
      );
      return;
    }

    if (!dirty) {
      toast.info('No changes to save.');
      return;
    }
    // Only what changed is sent, the same as other edits in this app.
    update.mutate({ id: role.id, body: changes }, { onSuccess: () => toast.success('Role saved') });
  }

  function discard() {
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setGranted(role?.permissions ?? []);
    setNameMissing(false);
    save.reset();
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const detail = (field: string) => apiError?.details.find((item) => item.field === field)?.message;
  // A taken name is a 409, which belongs with the name.
  const nameError =
    (nameMissing ? 'Enter a name.' : undefined) ??
    detail('name') ??
    (apiError?.status === 409 ? apiError.message : undefined);
  const shown = ['name', 'description', 'permissions'];
  const otherError =
    save.error &&
    apiError?.status !== 409 &&
    !apiError?.details.some((item) => shown.includes(item.field));
  const peopleWithRole = role?.userCount ?? 0;

  // The backend refuses to delete a role people have, so Delete says why it is off.
  const menu: MoreMenuItem[] = [...history];
  if (role) {
    menu.push({
      key: 'delete',
      label: 'Delete role',
      destructive: true,
      disabled: peopleWithRole > 0,
      reason:
        peopleWithRole > 0
          ? `Give its ${peopleWithRole === 1 ? 'person' : `${peopleWithRole} people`} another role first`
          : undefined,
      onSelect: () => setConfirmingDelete(true),
    });
  }

  return (
    // Room at the end for the save bar, so it never covers the last card.
    <div className={cn('mx-auto max-w-6xl space-y-6', dirty && 'pb-24')}>
      <RecordHeader
        back={back}
        title={role ? role.name : 'New role'}
        menu={menu}
        facts={
          role && `${people(peopleWithRole)} · ${count(role.permissions.length, 'permission')}`
        }
      />

      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      >
        <div className="min-w-0 space-y-4">
          <section aria-label="Details" className="grid gap-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Name</Label>
              <Input
                id="role-name"
                maxLength={50}
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? 'role-name-error' : undefined}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <FieldError id="role-name-error" message={nameError} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <textarea
                id="role-description"
                rows={2}
                maxLength={500}
                placeholder="What this role is for, such as packing and shipping orders"
                aria-invalid={Boolean(detail('description'))}
                aria-describedby={detail('description') ? 'role-description-error' : undefined}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive md:text-sm dark:bg-input/30"
              />
              <FieldError id="role-description-error" message={detail('description')} />
            </div>
          </section>

          <section aria-labelledby="role-permissions" className="space-y-4 rounded-lg border p-4">
            <div className="space-y-1">
              <h2 id="role-permissions" className="font-medium">
                Permissions
              </h2>
              <p className="text-sm text-muted-foreground">
                Changes apply to everyone with this role on their next click.
              </p>
            </div>
            <PermissionList>
              {(permissions) =>
                groupPermissions(permissions).map((group) => (
                  <fieldset key={group.label} className="space-y-1">
                    <legend className="mb-1 text-sm font-medium text-muted-foreground">
                      {group.label}
                    </legend>
                    {group.permissions.map((permission) => (
                      <label
                        key={permission.key}
                        className="flex min-h-11 items-center gap-3 text-sm md:min-h-8"
                      >
                        <input
                          type="checkbox"
                          className="size-5 shrink-0 accent-primary"
                          checked={granted.includes(permission.key)}
                          onChange={(event) => toggle(permission.key, event.target.checked)}
                        />
                        {permission.description}
                      </label>
                    ))}
                    {group.label === 'Products' && (
                      <p className="text-sm text-muted-foreground">
                        For staff who only count stock, give stock changes without product editing.
                        They see products read-only.
                      </p>
                    )}
                  </fieldset>
                ))
              }
            </PermissionList>
            <FieldError id="role-permissions-error" message={detail('permissions')} />
          </section>

          {otherError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(save.error)}
            </p>
          )}
        </div>

        <SidePanel>
          <PanelSection title="Summary">
            <p className="text-sm tabular-nums">{count(granted.length, 'permission')} selected</p>
          </PanelSection>
          {role && (
            <PanelSection title="People">
              <p className="text-sm text-muted-foreground">
                {peopleWithRole === 0
                  ? 'Nobody has this role yet.'
                  : `${people(peopleWithRole)} ${peopleWithRole === 1 ? 'has' : 'have'} this role.`}
              </p>
              {peopleWithRole > 0 && (
                <Link
                  to={`/people?roleId=${role.id}`}
                  className="inline-block text-sm underline underline-offset-3"
                >
                  View people
                </Link>
              )}
            </PanelSection>
          )}
        </SidePanel>
      </form>

      {dirty && <SaveBar formId={formId} saving={save.isPending} onDiscard={discard} />}

      {role && confirmingDelete && (
        <ConfirmDialog
          title="Delete role"
          description={`“${role.name}” is removed for good. Nobody has it, so no one loses access.`}
          actionLabel="Delete role"
          destructive
          pending={remove.isPending}
          error={remove.error}
          onConfirm={() =>
            remove.mutate(role.id, {
              onSuccess: () => {
                toast.success('Role deleted');
                leaveGuard.allowLeave();
                navigate('/roles', { replace: true });
              },
            })
          }
          onClose={() => {
            remove.reset();
            setConfirmingDelete(false);
          }}
        />
      )}

      {leaveGuard.dialog}
    </div>
  );
}

export function NewRolePage() {
  return <RoleEditor />;
}

export function RoleEditorPage() {
  const { id = '' } = useParams();
  const role = useRole(id);

  if (role.isPending) {
    return <DetailSkeleton />;
  }

  if (role.isError) {
    const notFound = role.error instanceof ApiError && role.error.status === 404;
    return (
      <div className="space-y-4">
        <BackLink />
        <h1 className="text-2xl font-semibold">{notFound ? 'Role not found' : 'Role'}</h1>
        {notFound ? (
          <p className="text-muted-foreground">This role does not exist, or its link is wrong.</p>
        ) : (
          <>
            <p role="alert">{errorMessage(role.error)}</p>
            <Button variant="outline" onClick={() => role.refetch()}>
              Try again
            </Button>
          </>
        )}
      </div>
    );
  }

  const data = role.data.data;
  if (data.builtIn) return <BuiltInRole role={data} />;

  // Keyed by updatedAt, so that the form shows the saved role after each change.
  return <RoleEditor key={data.updatedAt} role={data} />;
}
