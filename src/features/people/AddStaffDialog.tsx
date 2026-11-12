import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/api';
import type { Role } from '@/features/roles/api';
import { pageSize, usePeople, useSetRole } from './api';
import { roleWarning } from './role-choice';
import { RoleSelect } from './RoleSelect';

interface Props {
  roles: Role[];
  onClose: () => void;
}

/** Finds a customer by email and gives them a role, which lets them into this app. */
export function AddStaffDialog({ roles, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [problems, setProblems] = useState<{ person?: string; role?: string }>({});
  const customers = usePeople({ page: 1, type: 'customer', search: term }, Boolean(term));
  const setRole = useSetRole();
  const found = customers.data?.data ?? [];
  const more = (customers.data?.meta.total ?? 0) > found.length;
  const warning = roleId ? roleWarning(roles, roleId) : undefined;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserId('');
    setTerm(search.trim());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing = {
      person: userId ? undefined : 'Choose who to give access.',
      role: roleId ? undefined : 'Choose a role.',
    };
    setProblems(missing);
    if (missing.person || missing.role) return;

    setRole.mutate(
      { userId, roleId },
      {
        onSuccess: () => {
          toast.success('Access given');
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add staff</DialogTitle>
          <DialogDescription>
            Find their customer account by email. They register in the store first.
          </DialogDescription>
        </DialogHeader>

        <form role="search" onSubmit={handleSearch} className="space-y-2">
          <Label htmlFor="staff-search">Email</Label>
          <div className="flex gap-2">
            <Input
              id="staff-search"
              type="search"
              placeholder="jane@"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </div>
        </form>

        <form id="add-staff" onSubmit={handleSubmit} noValidate className="grid gap-4">
          {term && customers.isPending && (
            <p role="status" className="text-sm text-muted-foreground">
              Searching…
            </p>
          )}
          {customers.isError && (
            <p role="alert" className="text-sm">
              {errorMessage(customers.error)}
            </p>
          )}
          {customers.data && found.length === 0 && (
            <p className="text-sm text-muted-foreground">No customers match “{term}”.</p>
          )}
          {found.length > 0 && (
            <fieldset
              className="space-y-1"
              aria-describedby={problems.person ? 'staff-person-error' : undefined}
            >
              <legend className="mb-1 text-sm font-medium">Customer</legend>
              {found.map((person) => (
                <label
                  key={person.id}
                  className="flex min-h-11 items-center gap-3 text-sm md:min-h-8"
                >
                  <input
                    type="radio"
                    name="staff-person"
                    className="size-5 shrink-0 accent-primary"
                    checked={userId === person.id}
                    onChange={() => setUserId(person.id)}
                  />
                  <span className="min-w-0 truncate">{person.email}</span>
                </label>
              ))}
              {more && (
                <p className="text-sm text-muted-foreground">
                  Showing the first {pageSize}. Type more of the email to narrow it down.
                </p>
              )}
            </fieldset>
          )}
          {problems.person && (
            <p id="staff-person-error" className="text-sm text-destructive">
              {problems.person}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="staff-role">Role</Label>
            <RoleSelect
              id="staff-role"
              roles={roles}
              value={roleId}
              onChange={setRoleId}
              invalid={Boolean(problems.role)}
              describedBy={
                [problems.role && 'staff-role-error', warning && 'staff-role-warning']
                  .filter(Boolean)
                  .join(' ') || undefined
              }
            />
            {problems.role && (
              <p id="staff-role-error" className="text-sm text-destructive">
                {problems.role}
              </p>
            )}
            {warning && (
              <p id="staff-role-warning" className="text-sm text-muted-foreground">
                {warning}
              </p>
            )}
          </div>

          {setRole.error && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(setRole.error)}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-staff" disabled={setRole.isPending}>
            {setRole.isPending ? 'Saving…' : 'Give access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
