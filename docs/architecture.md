# Frontend Architecture

## Overview

This is a single-page admin app (CMS) built with Vite, React, and TypeScript. It manages the store through the `simple-express` API, and holds no business rules of its own.

Features are organized into folders, each with its pages, components, and API hooks.

`GET /api/products/admin/:id` requires a simple-express version that includes it.

## Request Lifecycle

```text
User
  |
  v
Route (React Router, with the admin guard)
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
├── main.tsx          Entry point, providers, and router
├── config/           Environment variables, validated at startup
├── lib/              API client, token store, generated API types, money formatting
├── components/       Shared UI
│   └── ui/           shadcn/ui components
├── routes/           Route table, layouts, and the admin guard
├── features/
│   └── <name>/       Pages, components, and hooks for one area, such as products
├── styles/           Tailwind entry point
└── test/             Test setup and helpers
```

## Screens and Backend Modules

| Screen          | Backend routes                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Login           | `POST /api/auth/login`, `/refresh`, `/logout`, `GET /api/auth/me`                                                                                      |
| Products        | `GET /api/products/admin`, `GET /api/products/admin/:id`, `POST /api/products`, `PATCH` and `DELETE /api/products/:id`, `/:id/images`, `/:id/variants` |
| Categories      | `GET /api/categories`, `POST /api/categories`, `PATCH` and `DELETE /api/categories/:id`                                                                |
| Orders          | `GET /api/orders/admin`, `GET /api/orders/admin/:id`, `PATCH /admin/:id/status`, `POST /admin/:id/payment/confirm`, `/reject`, `/refund`               |
| Payment methods | `GET /api/payment-methods/admin`, `POST /api/payment-methods`, `PATCH` and `DELETE /api/payment-methods/:id`                                           |
| Blogs           | `GET /api/blogs/admin`, `GET /api/blogs/admin/:id`, `POST /api/blogs`, `PATCH` and `DELETE /api/blogs/:id`                                             |
| Files           | `GET`, `POST` and `DELETE /api/assets`, all admin-only                                                                                                 |

Use the admin routes for reading. Public routes hide inactive products, inactive variants, and draft blogs.

Customer features, such as carts and addresses, belong to the storefront, not this app.

## Products

- Deleting a product or variant deactivates it, so that orders can keep referencing it. The UI calls this **Deactivate**, and an inactive item can be turned back on.
- A product has up to two options, such as Size and Color. They can be renamed, but not added or removed after creation.
- Each variant has its option values, price, stock, and an optional image from the product's images.
- A product has up to 10 images, each with alt text and a position.
- A category cannot be deleted while products use it.

## Authentication

- Log in with `POST /api/auth/login` and `client: 'web'`. The response holds the user and an access token, and sets the refresh token as a cookie.
- Access tokens last 15 minutes. Keep them in memory only, and send them as `Authorization: Bearer <token>`.
- The refresh token is an `httpOnly` cookie named `refreshToken`, limited to the `/api/auth` path. JavaScript cannot read it.
- Call `POST /api/auth/refresh` with an empty body and `credentials: 'include'`. It returns a new access token and rotates the cookie.
- On page load, call refresh once to restore the session, as memory is cleared.
- On a `401`, refresh once and retry the request once. If that fails, go to the login page.
- Log out with `POST /api/auth/logout`, which ends the session and clears the cookie.
- Only users with the `admin` role can use this app. The route guard checks `GET /api/auth/me`, but the backend enforces it with `403` on every admin route.
- Login returns `429` after repeated failures. Show a "try again later" message.

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

## Testing

Tests run with Vitest and React Testing Library. They render components as a user sees them, and mock the API client rather than the network.

- Render screens with `renderApp(path)` from `src/test/render.tsx`.
- Mock `request` and `refreshSession` with `vi.mock('@/lib/api', ...)`, and answer `/api/auth/me` with an admin user. See `src/routes/routes.test.tsx`.

## Build and Deployment

- `npm run build` produces static files in `dist/`.
- Serve them from a web server such as Caddy, on the same Ubuntu server setup as the backend.
- Send unknown paths to `index.html`, so that React Router can handle them.
- Cache files in `dist/assets/` for a long time, as their names change with every build. Do not cache `index.html`.
- Set security headers, including a Content Security Policy, at the web server.
- Never use the Vite dev server in production.
