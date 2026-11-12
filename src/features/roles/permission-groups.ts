import type { PermissionInfo } from './api';

/** Groups for the role editor, by the area of the app each permission opens. */
const groups = [
  { label: 'Orders', prefixes: ['orders.'] },
  { label: 'Products', prefixes: ['products.', 'inventory.'] },
  { label: 'Content', prefixes: ['categories.', 'blogs.', 'assets.'] },
  { label: 'Settings', prefixes: ['payment_methods.'] },
  { label: 'Reports', prefixes: ['reports.'] },
  { label: 'Audit log', prefixes: ['audit_logs.'] },
];

/**
 * The backend's permissions in their groups, keeping the backend's order. Permissions the app
 * does not know yet go under Other, so that they can still be granted.
 */
export function groupPermissions(permissions: PermissionInfo[]) {
  const grouped = groups.map((group) => ({
    label: group.label,
    permissions: permissions.filter((permission) =>
      group.prefixes.some((prefix) => permission.key.startsWith(prefix)),
    ),
  }));
  const known = new Set(grouped.flatMap((group) => group.permissions));
  const other = permissions.filter((permission) => !known.has(permission));

  return [...grouped, { label: 'Other', permissions: other }].filter(
    (group) => group.permissions.length > 0,
  );
}
