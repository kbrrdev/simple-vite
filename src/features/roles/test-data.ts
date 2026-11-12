import type { PermissionInfo, Role } from './api';

export const permissionList: PermissionInfo[] = [
  { key: 'orders.view', description: 'List and view any order' },
  { key: 'orders.manage', description: 'Change order status, and confirm or reject payments' },
  { key: 'orders.refund', description: 'Record refunds' },
  { key: 'products.view', description: 'See all products and variants' },
  { key: 'products.manage', description: 'Create and edit products' },
  { key: 'inventory.manage', description: 'Change variant stock only' },
  { key: 'blogs.manage', description: 'Write blogs and read drafts' },
  { key: 'audit_logs.view', description: 'Read the audit log' },
];

function makeRole(overrides: Partial<Role>): Role {
  return {
    id: 'role-id',
    name: 'Role',
    description: '',
    builtIn: false,
    permissions: [],
    userCount: 0,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

export const superAdminRole = makeRole({
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Super admin',
  builtIn: true,
  permissions: permissionList.map((permission) => permission.key),
  userCount: 1,
});

export const staffRole = makeRole({
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Staff',
  description: 'Packs and ships orders',
  permissions: ['orders.view', 'orders.manage'],
  userCount: 2,
});

export const editorRole = makeRole({
  id: '00000000-0000-4000-8000-000000000003',
  name: 'Editor',
  permissions: ['blogs.manage'],
});

export const roleList = [editorRole, staffRole, superAdminRole];
