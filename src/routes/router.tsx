import { createBrowserRouter, type RouteObject } from 'react-router';
import { AuditLogPage } from '@/features/audit-log/AuditLogPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { BlogEditorPage, NewBlogPage } from '@/features/blogs/BlogEditorPage';
import { BlogsPage } from '@/features/blogs/BlogsPage';
import { CategoriesPage } from '@/features/categories/CategoriesPage';
import { FilesPage } from '@/features/files/FilesPage';
import { OrderPage } from '@/features/orders/OrderPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { PaymentMethodsPage } from '@/features/payment-methods/PaymentMethodsPage';
import { PeoplePage } from '@/features/people/PeoplePage';
import { NewProductPage } from '@/features/products/NewProductPage';
import { ProductPage } from '@/features/products/ProductPage';
import { ProductsPage } from '@/features/products/ProductsPage';
import { DashboardPage } from '@/features/reports/DashboardPage';
import { NewRolePage, RoleEditorPage } from '@/features/roles/RoleEditorPage';
import { RolesPage } from '@/features/roles/RolesPage';
import { AdminLayout } from './AdminLayout';
import { NotFoundPage } from './NotFoundPage';
import { RequirePermission, RequireSuperAdmin } from './RequirePermission';
import { RequireStaff } from './RequireStaff';
import { RouteError } from './RouteError';

export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireStaff />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              {
                errorElement: <RouteError />,
                children: [
                  { index: true, element: <DashboardPage /> },
                  {
                    element: <RequirePermission permission="orders.view" />,
                    children: [
                      { path: '/orders', element: <OrdersPage /> },
                      { path: '/orders/:id', element: <OrderPage /> },
                    ],
                  },
                  {
                    element: <RequirePermission permission="products.manage" />,
                    children: [{ path: '/products/new', element: <NewProductPage /> }],
                  },
                  {
                    element: <RequirePermission permission="products.view" />,
                    children: [
                      { path: '/products', element: <ProductsPage /> },
                      { path: '/products/:id', element: <ProductPage /> },
                    ],
                  },
                  {
                    element: <RequirePermission permission="categories.manage" />,
                    children: [{ path: '/categories', element: <CategoriesPage /> }],
                  },
                  {
                    element: <RequirePermission permission="payment_methods.manage" />,
                    children: [{ path: '/payment-methods', element: <PaymentMethodsPage /> }],
                  },
                  {
                    element: <RequirePermission permission="blogs.manage" />,
                    children: [
                      { path: '/blogs', element: <BlogsPage /> },
                      { path: '/blogs/new', element: <NewBlogPage /> },
                      { path: '/blogs/:id', element: <BlogEditorPage /> },
                    ],
                  },
                  {
                    element: <RequirePermission permission="assets.manage" />,
                    children: [{ path: '/files', element: <FilesPage /> }],
                  },
                  {
                    element: <RequirePermission permission="audit_logs.view" />,
                    children: [{ path: '/audit-log', element: <AuditLogPage /> }],
                  },
                  {
                    element: <RequireSuperAdmin />,
                    children: [
                      { path: '/roles', element: <RolesPage /> },
                      { path: '/roles/new', element: <NewRolePage /> },
                      { path: '/roles/:id', element: <RoleEditorPage /> },
                      { path: '/people', element: <PeoplePage /> },
                    ],
                  },
                  { path: '*', element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
