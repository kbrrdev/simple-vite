import type { Role } from '@/features/roles/api';

/** The select value for removing access. The backend is sent `null`, which makes a customer. */
export const noAccess = 'none';

/** What a choice means, for the choices that are worth a second look. */
export function roleWarning(roles: Role[], value: string) {
  if (value === noAccess) return 'They can no longer sign in to this app.';
  if (roles.find((role) => role.id === value)?.builtIn) {
    return 'They will manage roles and people, including yours.';
  }
  return undefined;
}
