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
| `npm run api:types`    | Regenerates `src/lib/api-schema.d.ts` from the running API |

Run `npm run api:types` whenever the backend's API changes, and commit the result.

## Notes

- `openapi-typescript` declares TypeScript 5 as a peer dependency. `overrides` in `package.json` lets it use TypeScript 6, which keeps the same compiler API.
- Add shadcn/ui components with `npx shadcn@latest add <name>`.
