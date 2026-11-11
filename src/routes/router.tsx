import { createBrowserRouter, type RouteObject } from 'react-router';
import { LoginPage } from '@/features/auth/LoginPage';
import { CategoriesPage } from '@/features/categories/CategoriesPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { FilesPage } from '@/features/files/FilesPage';
import { OrderPage } from '@/features/orders/OrderPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { AdminLayout } from './AdminLayout';
import { NotFoundPage } from './NotFoundPage';
import { RequireAdmin } from './RequireAdmin';
import { RouteError } from './RouteError';

export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAdmin />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              {
                errorElement: <RouteError />,
                children: [
                  { index: true, element: <DashboardPage /> },
                  { path: '/orders', element: <OrdersPage /> },
                  { path: '/orders/:id', element: <OrderPage /> },
                  { path: '/categories', element: <CategoriesPage /> },
                  { path: '/files', element: <FilesPage /> },
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
