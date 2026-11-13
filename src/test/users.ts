import type { Permission, User } from '@/lib/auth';

const everything: Permission[] = [
  'orders.view',
  'orders.manage',
  'orders.refund',
  'products.view',
  'products.manage',
  'inventory.manage',
  'categories.manage',
  'blogs.manage',
  'banners.manage',
  'assets.manage',
  'payment_methods.manage',
  'reports.operations',
  'reports.sales',
  'audit_logs.view',
];

/** A super admin, who has every permission. */
export const admin: User = {
  id: '1',
  email: 'admin@example.com',
  role: { id: 'r1', name: 'Super admin' },
  superAdmin: true,
  permissions: everything,
  createdAt: '',
};

/** The seeded Staff role: orders, stock, and files, without refunds, prices, or sales. */
export const staff: User = {
  ...admin,
  id: '2',
  email: 'staff@example.com',
  role: { id: 'r2', name: 'Staff' },
  superAdmin: false,
  permissions: [
    'orders.view',
    'orders.manage',
    'products.view',
    'inventory.manage',
    'assets.manage',
    'reports.operations',
  ],
};

export const customer: User = {
  ...admin,
  id: '3',
  email: 'jane@example.com',
  role: null,
  superAdmin: false,
  permissions: [],
};
