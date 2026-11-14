# simple-vite

The admin app (CMS) for the [simple-express](https://github.com/kbrrdev/simple-express) store API, built with Vite, React, and TypeScript.

See [docs/architecture.md](docs/architecture.md) for how it works.

## Setup

Requires Node.js 24 and a running simple-express API.

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs at `http://localhost:5173`, which the backend allows by default. Log in with an admin account. In simple-express, `npm run db:make-admin` makes one.

## Scripts

| Script                 | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Development server                                         |
| `npm run build`        | Type-checks and builds static files into `dist/`           |
| `npm run preview`      | Serves the build locally                                   |
| `npm run typecheck`    | TypeScript                                                 |
| `npm run lint`         | ESLint                                                     |
| `npm run format`       | Prettier                                                   |
| `npm run format:check` | Prettier, without writing changes                          |
| `npm test`             | Vitest                                                     |
| `npm run test:watch`   | Vitest in watch mode                                       |
| `npm run e2e`          | Playwright, in a browser against the running API           |
| `npm run api:types`    | Regenerates `src/lib/api-schema.d.ts` from the running API |

Run `npm run api:types` whenever the backend's API changes, and commit the result.

## Browser tests

`npm run e2e` runs the flows in `e2e/` in Chromium against a real, seeded simple-express API. They create and clean up their own records, so use a development database, never a real store.

```bash
npx playwright install chromium   # Once
npm run e2e
```

- The API must be running on `http://localhost:3000`, or set `E2E_API_URL`, with the seeded `admin@example.com` and `staff@example.com` accounts.
- If something already serves `http://localhost:5173`, such as `npm run dev`, the tests use it. Otherwise they build the app and serve it with `vite preview`.
- Each run logs in three times. The API allows 10 logins per 15 minutes, so a fourth run in a row gets `429`. Wait, or restart the API, which resets the count.
- `npx playwright show-report` opens the last run's report, with a trace of each failure.

## Notes

- `openapi-typescript` declares TypeScript 5 as a peer dependency. `overrides` in `package.json` lets it use TypeScript 6, which keeps the same compiler API.
- Add shadcn/ui components with `npx shadcn@latest add <name>`.
