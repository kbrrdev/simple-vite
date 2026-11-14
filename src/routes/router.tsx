import { createBrowserRouter, type RouteObject } from 'react-router';
import { ShellSkeleton } from '@/components/Loading';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/reports/DashboardPage';
import { AdminLayout } from './AdminLayout';
import { NotFoundPage } from './NotFoundPage';
import { RequirePermission, RequireSuperAdmin } from './RequirePermission';
import { RequireStaff } from './RequireStaff';
import { RouteError } from './RouteError';

// Login and the Dashboard are where people land, so they come with the app. Every other
// screen's code downloads the first time it opens, and the current page stays up meanwhile.
export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    // Shown on first load while the screen's code downloads.
    hydrateFallbackElement: <ShellSkeleton />,
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
                      {
                        path: '/orders',
                        lazy: async () => ({
                          Component: (await import('@/features/orders/OrdersPage')).OrdersPage,
                        }),
                      },
                      {
                        path: '/orders/:id',
                        lazy: async () => ({
                          Component: (await import('@/features/orders/OrderPage')).OrderPage,
                        }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission permission="products.manage" />,
                    children: [
                      {
                        path: '/products/new',
                        lazy: async () => ({
                          Component: (await import('@/features/products/NewProductPage'))
                            .NewProductPage,
                        }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission permission="products.view" />,
                    children: [
                      {
                        path: '/products',
                        lazy: async () => ({
                          Component: (await import('@/features/products/ProductsPage'))
                            .ProductsPage,
                        }),
                      },
                      {
                        path: '/products/:id',
                        lazy: async () => ({
                          Component: (await import('@/features/products/ProductPage')).ProductPage,
                        }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission permission="categories.manage" />,
                    children: [
                      {
                        path: '/categories',
                        lazy: async () => ({
                          Component: (await import('@/features/categories/CategoriesPage'))
                            .CategoriesPage,
                        }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission permission="store.manage" />,
                    children: [
                      {
                        path: '/store-details',
                        lazy: async () => ({
                          Component: (await import('@/features/store-info/StoreDetailsPage'))
                            .StoreDetailsPage,
                        }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission permission="payment_methods.manage" />,
                    children: [
                      {
                        path: '/payment-methods',
                        lazy: async () => ({
                          Component: (await import('@/features/payment-methods/PaymentMethodsPage'))
                            .PaymentMethodsPage,
                        }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission permission="blogs.manage" />,
                    children: [
                      {
                        path: '/blogs',
                        lazy: async () => ({
                          Component: (await import('@/features/blogs/BlogsPage')).BlogsPage,
                        }),
                      },
                      {
                        path: '/blogs/new',
                        lazy: async () => ({
                          Component: (await import('@/features/blogs/BlogEditorPage')).NewBlogPage,
                        }),
                      },
                      {
                        path: '/blogs/:id',
                        lazy: async () => ({
                          Component: (await import('@/features/blogs/BlogEditorPage'))
                            .BlogEditorPage,
                        }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission permission="banners.manage" />,
                    children: [
                      {
                        path: '/banners',
                        lazy: async () => ({
                          Component: (await import('@/features/banners/BannersPage')).BannersPage,
                        }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission permission="promotions.manage" />,
                    children: [
                      {
                        path: '/discounts',
                        lazy: async () => ({
                          Component: (await import('@/features/discounts/DiscountsPage'))
                            .DiscountsPage,
                        }),
                      },
                      {
                        path: '/discounts/sales/new',
                        lazy: async () => ({
                          Component: (await import('@/features/discounts/SaleEditorPage'))
                            .NewSalePage,
                        }),
                      },
                      {
                        path: '/discounts/sales/:id',
                        lazy: async () => ({
                          Component: (await import('@/features/discounts/SaleEditorPage'))
                            .SaleEditorPage,
                        }),
                      },
                      {
                        path: '/discounts/coupons/new',
                        lazy: async () => ({
                          Component: (await import('@/features/discounts/CouponEditorPage'))
                            .NewCouponPage,
                        }),
                      },
                      {
                        path: '/discounts/coupons/:id',
                        lazy: async () => ({
                          Component: (await import('@/features/discounts/CouponEditorPage'))
                            .CouponEditorPage,
                        }),
                      },
                      {
                        path: '/discounts/promotions/new',
                        lazy: async () => ({
                          Component: (await import('@/features/discounts/PromotionEditorPage'))
                            .NewPromotionPage,
                        }),
                      },
                      {
                        path: '/discounts/promotions/:id',
                        lazy: async () => ({
                          Component: (await import('@/features/discounts/PromotionEditorPage'))
                            .PromotionEditorPage,
                        }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission permission="assets.manage" />,
                    children: [
                      {
                        path: '/files',
                        lazy: async () => ({
                          Component: (await import('@/features/files/FilesPage')).FilesPage,
                        }),
                      },
                    ],
                  },
                  {
                    element: <RequirePermission permission="audit_logs.view" />,
                    children: [
                      {
                        path: '/audit-log',
                        lazy: async () => ({
                          Component: (await import('@/features/audit-log/AuditLogPage'))
                            .AuditLogPage,
                        }),
                      },
                    ],
                  },
                  {
                    element: <RequireSuperAdmin />,
                    children: [
                      {
                        path: '/roles',
                        lazy: async () => ({
                          Component: (await import('@/features/roles/RolesPage')).RolesPage,
                        }),
                      },
                      {
                        path: '/roles/new',
                        lazy: async () => ({
                          Component: (await import('@/features/roles/RoleEditorPage')).NewRolePage,
                        }),
                      },
                      {
                        path: '/roles/:id',
                        lazy: async () => ({
                          Component: (await import('@/features/roles/RoleEditorPage'))
                            .RoleEditorPage,
                        }),
                      },
                      {
                        path: '/people',
                        lazy: async () => ({
                          Component: (await import('@/features/people/PeoplePage')).PeoplePage,
                        }),
                      },
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
