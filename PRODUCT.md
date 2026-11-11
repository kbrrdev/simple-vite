# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Shop staff and owners** run daily operations: they check new orders, confirm or reject manual payments, update order status, adjust stock and prices, and publish blog posts. They are not technical, and they often work from a phone.
- **A developer or operator** sets up each store, creates admin accounts, and manages the catalog structure (categories, product options).

## Product Purpose

A reusable admin app (CMS) for stores built on the `simple-express` API. It is cloned and deployed for each store, so the same back office serves many businesses. Success means staff can handle a day's orders and catalog changes quickly and without mistakes, on any device, and a developer can stand up a new store without changing the admin.

## Positioning

The admin holds no business rules. The backend owns prices, stock, orders, payments, and permissions, and the admin is a thin, safe interface over them. That makes it easy to reuse for every store built on the same API.

## Operating Context

- Philippine stores. Money is shown in pesos (`en-PH`, PHP), and amounts are integer cents.
- Payments include manual methods that staff confirm, reject, or refund by hand.
- Typical use is short, frequent checks on a phone ("did the payment arrive?"), plus longer catalog editing sessions on a laptop.

## Capabilities and Constraints

- Built: login, categories, files. Planned: products (up to two options, variants, up to 10 images), orders, payment methods, blogs.
- Only the `admin` role can use the app.
- Deleting a product or variant deactivates it, and it can be turned back on.
- Images: JPEG, PNG, or WebP, 5 MB or smaller.
- Destructive or money actions (cancel, refund, deactivate, delete) need confirmation.
- The backend's error messages are shown as they are.

## Brand Commitments

White-label. The product name is the generic "Store Admin", with no store branding of its own.

Open: whether each deployment can set its own store name or logo.

## Evidence on Hand

None. There are no real store names, customers, or data. Future work must not invent store branding, sample customers, or sales figures.

## Product Principles

1. Fast on a phone for the daily jobs: orders and payment confirmation come first.
2. Hard to make costly mistakes. Money and destructive actions are clear, confirmed, and reversible where the backend allows it.
3. The backend is the authority. The UI hints at rules but never decides them.
4. Neutral and reusable. Nothing store-specific is built into the admin.

## Accessibility & Inclusion

Open: no formal standard is confirmed. The current baseline is labelled inputs, real buttons, and keyboard use.
