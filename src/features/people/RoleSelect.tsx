import { NativeSelect } from '@/components/NativeSelect';
import type { Role } from '@/features/roles/api';
import { noAccess } from './role-choice';

interface Props {
  id: string;
  roles: Role[];
  value: string;
  onChange: (value: string) => void;
  /** Offers No access, which makes the person a customer again. */
  allowNoAccess?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

export function RoleSelect({
  id,
  roles,
  value,
  onChange,
  allowNoAccess = false,
  invalid,
  describedBy,
}: Props) {
  return (
    <NativeSelect
      id={id}
      value={value}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.value)}
    >
      {!allowNoAccess && <option value="">Choose a role</option>}
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.name}
        </option>
      ))}
      {allowNoAccess && <option value={noAccess}>No access (customer)</option>}
    </NativeSelect>
  );
}
