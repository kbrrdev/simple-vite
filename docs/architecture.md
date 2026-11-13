# Frontend Architecture

## Overview

This is a single-page admin app (CMS) built with Vite, React, and TypeScript. It manages the store through the `simple-express` API, and holds no business rules of its own.

Features are organized into folders, each with its pages, components, and API hooks.

## Request Lifecycle

```text
User
  |
  v
Route (React Router, with the staff and permission guards)
  |
  v
Page
  |
  v
Query or mutation hook (TanStack Query)
  |
  v
API client (adds the access token, refreshes it on 401)
  |
  v
simple-express API
  |
  v
Rendered result, or loading, error, and empty states
```

## Application Structure

```text
src/
├── main.tsx          Entry point and providers
├── config/           Environment variables, validated at startup
├── lib/              API client and access token, auth hooks, generated API types, money formatting
├── components/       Shared UI
│   └── ui/           shadcn/ui components
├── routes/           Router, layouts, and the staff and permission guards
├── features/
│   └── <name>/       Pages, components, and hooks for one area, such as products
├── styles/           Tailwind entry point
└── test/             Test setup and helpers
```

## Screens and Backend Modules

| Screen          | Status | Backend routes                                                                                                                                         |
| --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Login           | Built  | `POST /api/auth/login`, `/refresh`, `/logout`, `GET /api/auth/me`                                                                                      |
| Dashboard       | Built  | `GET /api/reports/summary`, `/sales`, `/top-products`, `/order-status`, `/low-stock`                                                                   |
| Products        | Built  | `GET /api/products/admin`, `GET /api/products/admin/:id`, `POST /api/products`, `PATCH` and `DELETE /api/products/:id`, `/:id/images`, `/:id/variants` |
| Categories      | Built  | `GET /api/categories/tree`, `POST /api/categories`, `PATCH` and `DELETE /api/categories/:id`                                                           |
| Orders          | Built  | `GET /api/orders/admin`, `GET /api/orders/admin/:id`, `PATCH /admin/:id/status`, `POST /admin/:id/payment/confirm`, `/reject`, `/refund`               |
| Payment methods | Built  | `GET /api/payment-methods/admin`, `POST /api/payment-methods`, `PATCH` and `DELETE /api/payment-methods/:id`                                           |
| Blogs           | Built  | `GET /api/blogs/admin`, `GET /api/blogs/admin/:id`, `POST /api/blogs`, `PATCH` and `DELETE /api/blogs/:id`                                             |
| Banners         | Built  | `GET /api/banners/admin`, `POST /api/banners`, `PATCH` and `DELETE /api/banners/:id`, all needing `banners.manage`                                     |
| Files           | Built  | `GET`, `POST` and `DELETE /api/assets`, all admin-only                                                                                                 |
| Audit log       | Built  | `GET /api/audit-logs`                                                                                                                                  |
| Roles           | Built  | `GET`, `POST`, `PATCH` and `DELETE /api/roles`, `GET /api/roles/permissions`, all super admin only                                                     |
| People          | Built  | `GET /api/users`, `PATCH /api/users/:id/role`, both super admin only                                                                                   |

Use the admin routes for reading. Public routes hide inactive products, inactive variants, and draft blogs.

Customer features, such as carts and addresses, belong to the storefront, not this app.

## Categories

- Categories nest up to three levels, such as Men › Shoes › Running. The screen reads the whole tree from `/api/categories/tree`, without pages.
- Names are unique among categories with the same parent.
- Changing the parent moves the category with everything below it. The form only offers parents that keep it within three levels, but the backend decides.
- A category can have an image, uploaded or chosen from Files with `AssetPicker` from `features/files`.
- A category cannot be deleted while it has subcategories or products use it. An image a category uses cannot be deleted from Files.

## Orders

- The list filters by `status` and `paymentStatus`, kept in the URL with the page. **Payments to check** is `paymentStatus=submitted`, and the Dashboard links to it with a count.
- The search box sends `search`, which the backend matches against the order number (`1048` or `ORD-001048`), the customer's email, the recipient's name, and the payment reference. It is kept in the URL, tabs keep it, and Clear filters removes it.
- Tabs above the list, in `OrderTabs.tsx` on the shared `ViewTabs`, are saved views that set the same filters: All, Payments to check, To confirm (`pending`), To ship (`confirmed`), and Shipped. A tab is selected only when the filters match it exactly, and the dropdowns cover everything else.
- The tabs show how many orders wait in each view, from the Needs attention counts in `GET /api/reports/order-status`. That report needs `reports.operations`, so other roles see the tabs without counts. Order changes refresh the reports.
- The order page shows only the status moves the backend allows. `nextStatuses` in `features/orders/labels.ts` mirrors `adminTransitions` as a hint, and the backend's `409` is shown when it refuses.
- `useOrderActions` in `features/orders/use-order-actions.tsx` splits those actions by role: checking a submitted payment or the move forward goes in the **Next step** card, and Cancel order, Mark returned, and Record refund go in the **More** menu, with History.
- The order page's **Activity** lists the order's entries from `GET /api/audit-logs`, then when it was placed. Orders do not record when each status was reached, so this is all the history there is. It needs `audit_logs.view`, and is left out without it. Order changes refresh it.
- Status badges are tinted by meaning in `OrderBadges.tsx`: amber when staff need to act, blue in progress, green done, and grey when waiting on the customer or closed.
- Confirming a payment marks the order paid. Rejecting one cancels the order and puts its stock back.
- A refund is recorded, not sent: staff refund the customer outside the app, after the order is delivered, returned, or cancelled.
- Marking an order returned does not restock it. Staff adjust stock by hand.
- Cash on delivery orders become paid when they are marked delivered.
- Totals are shown exactly as the backend sends them. The browser never adds them up.
- An item sold on sale shows its list price struck through, from `listPriceCents`, when it differs from the price paid.

## Dashboard

- The Dashboard is the reports page. It starts with **Needs attention**, a to-do list of payments to confirm, orders to confirm, and orders to ship, each linking to the matching orders. Tasks with nothing waiting are left out, and with none it says "All caught up."
- The summary, the sales chart, and best sellers share one date range. Ranges are calendar days in Manila time, both included, kept in the URL as `from` and `to`. With none, the backend uses the last 30 days.
- Needs attention and low stock show the store as it is now, so the range does not change them.
- Every figure comes from the backend. The browser formats it and never adds anything up. Sale discounts is the amount sales took off list prices.
- The sales chart uses Recharts, loaded with `React.lazy` so that its code only downloads with the chart. Its table view lists the same figures for screen readers.
- Each card loads and fails on its own, so a slow report never blocks Needs attention.

## Roles and People

- Only super admins see these screens, through `RequireSuperAdmin` and the `superAdmin` flag from `/me`. Admin can hold every permission too, so the permissions cannot tell them apart.
- Roles groups the backend's permissions by area, in `features/roles/permission-groups.ts`, and labels each with the backend's description. A permission the app does not know yet appears under Other.
- Super admin is built in, and is shown but not edited. Editing a role sends only the fields that changed.
- A role people have cannot be deleted. Delete is disabled with the number of people as a hint, and the backend's `409` stays the authority.
- People lists everyone with a role (`type=staff`). The search, role, and page are kept in the URL.
- Add staff searches customers (`type=customer`), as staff start as customers who registered in the store.
- No access makes someone a customer again, and the dialog says they can no longer sign in. Your own row cannot be changed, as the backend refuses it so that a super admin always remains.
- Changes to roles and people refresh both lists, as roles show how many people have them.

## Audit log

- The backend records every staff change, and nobody can edit or remove an entry. The screen only reads `GET /api/audit-logs`, and needs `audit_logs.view`.
- Type, person, item, the From and To days, and the page are kept in the URL. The days are calendar days in Manila time, both included, and no days means all of them.
- Clicking someone's email shows only their changes. Scripts such as `db:set-role` have no person, and show as System.
- Each entry shows the fields it changed, before and after. Fields ending in `Cents` are shown in pesos, and redacted values as `[redacted]`. Everything is shown as text.
- Order, product, blog, and role pages have History in their header's More menu, from `useHistoryItem` in `features/audit-log/history.ts`, for roles with `audit_logs.view`. Variants and product images are logged under their own ids, so a product's History leaves them out.
- Action names the app does not know yet are turned into words, so new backend actions still read well.

## Payment methods

- The screen lists every method, on or off, in one list, as the backend returns them all.
- Orders copy a method's provider, account, and QR when they are placed, so edits only change new orders.
- A method that orders have used cannot be deleted, only turned off. The backend's `409` explains this.
- The QR code is an image from Files, picked with the shared `ImageField` from `features/files`.

## Banners

- Banners are the storefront's promotional images, managed with `banners.manage`. The screen lists every banner, on, off, or scheduled, from `GET /api/banners/admin`, in position order.
- Each has an image, an optional phone image, alt text, and an optional title, subtitle, link, and start and end time. Images come from `ImageField`, uploaded or chosen from Files, and an image a banner uses cannot be deleted from Files.
- Links must start with `/` or `https://`, and an end must come after its start. The form checks both as a hint, and the backend decides.
- A store has at most `meta.maxBanners` banners, counting ones that are off. New banner is disabled at the limit, and the backend's `409` stays the authority.
- The badge says whether the store shows a banner now: Live, Scheduled, Ended, or Off. `bannerStatus` mirrors the backend's public list as a hint.
- Times are typed in the browser's time zone and sent as ISO. Editing sends only the fields that changed.
- A new banner goes after the last one. Move up and Move down renumber the positions 0, 1, 2, and so on, with one `PATCH` for each banner that changes, as positions can tie after a delete.
- Delete removes a banner for good, so Turn off is offered for hiding it.

## Blog

- Posts are written in **Markdown**. The backend stores the text as it is, so the storefront must render it the same way.
- Posts may use only the elements in `features/blogs/markdown.ts`: headings from level 2 down, paragraphs, bold, italic, links, lists, quotes, code, rules, and images. Raw HTML is never rendered. The storefront must use the same list.
- Images in the text are added with the toolbar's Image button, from Files or uploaded, with alt text, as `![alt](url)` on their own line. They show only when `isUploadedImage` finds them at the API's origin, or `VITE_IMAGE_URL`'s when uploads are in S3, so an image from another site never loads. The storefront must apply the same rule.
- The backend does not track images inside a post's text, so Files can delete one a post still shows. Its delete dialog says so.
- The list has All, Published, and Drafts tabs, which set `published` in the URL.
- The editor follows Shopify's: the title and text on the left, and Visibility, the cover, and the author on the right. Everything saves together through the save bar, which sends only what changed.
- Drafts are hidden from the public. Choosing Draft under Visibility and saving moves a post back to drafts, without a dialog, as it can be undone. Deleting removes it for good, and asks first.
- The editor asks before leaving with unsaved changes, through `useLeaveGuard`, and the browser asks when the tab is closed.
- The preview loads `react-markdown` only when it opens.

## Products

- The list searches by name and filters by category, which includes subcategories. Search, category, sort, and page are kept in the URL.
- Tabs for All, Active, and Inactive set `active` on `GET /api/products/admin`, keeping the other filters. They have no counts, as the backend has no product counts.
- New products are created with all their variants at once. The form builds a variant for each combination of option values, and prices are typed in pesos and sent as cents.
- Images can only be added after a product exists, so creating one opens its page.
- The product page follows Shopify's: details, images, and variants on the left, and status and category in a side panel. The details and category save together through the save bar, which sends only the fields that changed, so a save cannot undo a change made meanwhile. Unsaved edits survive a status or variant change, as the form is keyed by the product's id.
- The first image is the main one. Moving an image renumbers the positions 0, 1, 2, and so on, with one `PATCH` for each image that changes, as positions can tie after a removal.
- A new variant cannot have an image, as the backend's create body has none. Staff give it one with Edit, from the product's own images.
- Editing a variant sends only the fields that changed, so that a price change cannot overwrite a stock change made meanwhile.

- `GET /api/products/admin/:id` requires a simple-express version that includes it.
- Deleting a product or variant deactivates it, so that orders can keep referencing it. The UI calls this **Deactivate**, and an inactive item can be turned back on.
- A product has up to two options, such as Size and Color. They can be renamed, but not added or removed after creation.
- Each variant has its option values, price, stock, and an optional image from the product's images.
- A product has up to 10 images, each with alt text and a position.

## Authentication

- Log in with `POST /api/auth/login` and `client: 'web'`. The response holds the user and an access token, and sets the refresh token as a cookie.
- Access tokens last 15 minutes. Keep them in memory only, and send them as `Authorization: Bearer <token>`.
- The refresh token is an `httpOnly` cookie named `refreshToken`, limited to the `/api/auth` path. JavaScript cannot read it.
- Call `POST /api/auth/refresh` with an empty body and `credentials: 'include'`. It returns a new access token and rotates the cookie.
- On page load, call refresh once to restore the session, as memory is cleared.
- On a `401`, refresh once and retry the request once. If that fails, go to the login page.
- Log out with `POST /api/auth/logout`, which ends the session and clears the cookie.
- Only staff, meaning users with a role, can use this app. Customers have no role, and see "Staff only".
- Login returns `429` after repeated failures. Show a "try again later" message.

## Roles and Permissions

- Each staff user has one role, and a role is a set of permissions, such as `orders.view` or `products.manage`. Super admins manage roles on the Roles screen.
- `GET /api/auth/me` returns the user's `role`, `permissions`, and `superAdmin`. The backend checks permissions on every request and answers `403`, so the app only hides what a role cannot use.
- `useCan(permission)` from `src/lib/auth.ts` tells a component whether to show a control.
- `RequirePermission` in `src/routes/` guards each page with the permission its reads need, and shows "No access" instead of loading it. Nav links the role cannot use are left out.
- Controls follow the permission their request needs. Some are worth knowing:
  - A role with `inventory.manage` but not `products.manage` sees products read-only, and its Edit stock sends only `stock`, which the backend accepts on its own.
  - Upload and Choose from Files need `assets.manage` as well as the screen's own permission.
  - Refunds need `orders.refund`, separate from the other order actions in `orders.manage`.
  - The Dashboard shows Needs attention and low stock with `reports.operations`, and the sales figures with `reports.sales`.

## Talking to the API

- The API's address comes from `VITE_API_URL`, such as `http://localhost:3000`.
- Send requests with `credentials: 'include'`, so that the refresh cookie travels with them.
- The backend only accepts origins listed in its `CORS_ORIGINS`. Its default, `http://localhost:5173`, is Vite's dev server.
- The refresh cookie is `SameSite=Lax`, so the app and the API must share a registrable domain, such as `admin.your-store.com` and `api.your-store.com`. Different ports on `localhost` are fine.
- Every response has an `X-Request-Id` header, which the browser can read.
- Lists take `page` and `limit`, with `limit` up to 100, and return `meta: { page, limit, total }`.
- Errors look like `{ error: { message, details?, requestId? } }`. `details` lists `{ field, message }` pairs, and `requestId` appears on `500` errors.
- Uploading takes two steps. Send the image to `POST /api/assets` in a `file` form field, then attach the returned `id` to a product or blog. Files must be JPEG, PNG, or WebP, and 5 MB or smaller.
- Money is in integer cents, such as `priceCents` and `totalCents`. Format it for display only, for example with `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`.

## API Types

- Types are generated from the backend's OpenAPI document with `openapi-typescript`, into `src/lib/api-schema.d.ts`.
- `npm run api:types` regenerates the file from a running development API, at `/api-docs.json`. The backend does not serve the document in production.
- The file is committed, so that CI can type-check without a running backend.
- Regenerate it whenever the backend changes, and let TypeScript show what broke.

## Data Fetching

- Each feature keeps its query and mutation hooks in `features/<name>/api.ts`, built on `request` from `src/lib/api.ts`.
- Query keys start with the feature name, such as `['products', filters]`.
- List filters and the page number are read from the URL's search parameters.
- After a mutation, invalidate the queries it affects.
- A failed mutation shows a toast by default. Forms that show errors inline set `meta: { toast: false }`.
- Use `errorMessage()` from `src/lib/api.ts` for error text. It adds the `requestId` on `500` errors.

## Styling

- Use Tailwind CSS utility classes. Move repeated markup into shared components rather than creating custom CSS classes.
- shadcn/ui components are copied into `src/components/ui`, and are this project's own code. Add each one only when a screen needs it.

## Configuration

Configuration comes from `VITE_` environment variables, documented in `.env.example` and read only through `src/config/`. They are built into the bundle, so they are public.

- `VITE_API_URL` is the simple-express API, and is required.
- `VITE_STORE_NAME` is shown in the header, on the login page, and in the browser tab. It defaults to "Store Admin".
- `VITE_IMAGE_URL` is where uploaded images are served from when the API stores them in S3, matching its `S3_PUBLIC_URL`. It is optional. Blog posts only show images from it or from the API.

## Testing

Tests run with Vitest and React Testing Library. They render components as a user sees them, and mock the API client rather than the network.

- Render screens with `renderApp(path)` from `src/test/render.tsx`.
- Mock `request` and `refreshSession` with `vi.mock('@/lib/api', ...)`, and answer `/api/auth/me` with a user from `src/test/users.ts`: `admin` has every permission, `staff` has the seeded Staff role, and `customer` has none. See `src/routes/routes.test.tsx`.

## Build and Deployment

- `npm run build` produces static files in `dist/`.
- Each screen's code is a separate file, loaded the first time its route opens with React Router's route `lazy`. Login and the Dashboard come with the main file, as people land on them. While a screen loads, the current page stays up with a thin bar above it, and a failed download shows the route error with Reload.
- Recharts and `react-markdown` load only with the chart and the Markdown preview. Keep large libraries out of the main file the same way.
- Serve them from a web server such as Caddy, on the same Ubuntu server setup as the backend.
- Send unknown paths to `index.html`, so that React Router can handle them.
- Cache files in `dist/assets/` for a long time, as their names change with every build. Do not cache `index.html`.
- Set security headers, including a Content Security Policy, at the web server. Its `img-src` must allow the origin of uploaded images, which is the API or the S3 public URL.
- Never use the Vite dev server in production.
