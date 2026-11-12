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
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/api';
import type { Role } from '@/features/roles/api';
import { useSetRole, type Person } from './api';
import { noAccess, roleWarning } from './role-choice';
import { RoleSelect } from './RoleSelect';

interface Props {
  person: Person;
  roles: Role[];
  onClose: () => void;
}

/** Gives someone another role, or removes their access, which is the confirming step. */
export function ChangeRoleDialog({ person, roles, onClose }: Props) {
  const [value, setValue] = useState(person.role?.id ?? noAccess);
  const setRole = useSetRole();
  const removing = value === noAccess;
  const warning = roleWarning(roles, value);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value === (person.role?.id ?? noAccess)) {
      onClose();
      return;
    }

    setRole.mutate(
      { userId: person.id, roleId: removing ? null : value },
      {
        onSuccess: () => {
          toast.success(removing ? 'Access removed' : 'Role changed');
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>{person.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="person-role">Role</Label>
            <RoleSelect
              id="person-role"
              roles={roles}
              value={value}
              onChange={setValue}
              allowNoAccess
              describedBy={warning ? 'person-role-warning' : undefined}
            />
            {warning && (
              <p id="person-role-warning" className="text-sm text-muted-foreground">
                {warning}
              </p>
            )}
          </div>

          {setRole.error && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(setRole.error)}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={removing ? 'destructive' : 'default'}
              disabled={setRole.isPending}
            >
              {setRole.isPending ? 'Saving…' : removing ? 'Remove access' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
