# Frontend Development Guidelines

## Tech Stack

- Vite
- React
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- openapi-typescript
- Vitest and React Testing Library
- ESLint
- Prettier
- npm, on Node.js 24

## Project Boundaries

This is the admin app (CMS) for the `simple-express` backend.

- The backend API is the authority for business rules, prices, stock, orders, payments, and permissions.
- Use the backend API for every business operation. Never access the database directly.
- Do not duplicate business logic that belongs to the backend.
- The UI may mirror backend rules as hints, such as the allowed order status changes or the image limit. The backend's error remains the authority, and is shown as is.
- The backend's OpenAPI document is the contract. Do not redefine API types by hand.
- This app has its own repository. There is no monorepo.

## Core Principles

- Keep the implementation simple and maintainable.
- Prioritize readability over clever solutions.
- Follow conventional software engineering practices.
- Avoid overengineering and unnecessary abstractions.
- Prefer established project patterns over introducing new ones.
- Use async/await for asynchronous operations.
- Handle errors consistently.
- Never expose secrets in the bundle, and never log tokens or personal data.

## AI Coding Philosophy

Write code like an experienced, pragmatic senior software engineer.

The goal is to produce production-quality code that is simple, readable, and easy to maintain.

- Prefer straightforward solutions over complicated implementations.
- Do not write code just to demonstrate advanced programming techniques.
- Avoid unnecessary design patterns and abstraction layers.
- Do not create abstractions just to make code reusable.
- Avoid excessive interfaces, wrappers, factories, and helper functions.
- Do not split simple logic into multiple files without a good reason.
- Avoid deeply nested logic and unnecessarily complex conditions.
- Avoid clever one-liners when a few readable lines are clearer.
- Do not add unnecessary comments explaining obvious code.
- Do not generate excessive documentation for simple implementations.
- Do not anticipate requirements that have not been requested.
- Do not introduce unnecessary dependencies.
- Reuse existing utilities, components, and hooks whenever appropriate.
- Only introduce complexity when there is a clear technical reason.

### Before Implementing

1. Understand the existing code and project structure.
2. Identify the simplest solution that satisfies the requirement.
3. Check whether existing utilities, components, or hooks can be reused.
4. Check the backend's OpenAPI document for the endpoints involved.
5. Consider the impact on existing functionality.
6. Avoid modifying unrelated files.
7. Do not introduce new dependencies without a good reason.

### Code Review Mindset

Before considering an implementation complete, ask:

- Is this more complicated than necessary?
- Can this be implemented with fewer abstractions?
- Is the code easy for another developer to understand?
- Am I solving an actual requirement or anticipating unnecessary future requirements?
- Would an experienced developer consider this a reasonable implementation?

If a simpler solution works just as well, choose the simpler solution.

## Project Architecture

- Use a structure organized by feature.
- Keep pages thin. Put data loading in hooks, which call the shared API client directly.
- Keep shared components, utilities, and the API client in a common location.
- Import from `src/` with the `@/` alias.
- Keep application configuration centralized.
- Avoid unnecessary architectural layers.

## TypeScript

- Use strict TypeScript settings.
- Avoid `any` whenever possible.
- Use API types generated from the backend's OpenAPI document. Never write them by hand.
- Use `import type` for type-only imports.
- Avoid unnecessary type assertions and non-null assertions.
- Validate external input before using it.
- Prefer simple and clear type definitions.

## React

- Use function components and hooks.
- Keep components small and focused.
- Do not put business logic or API calls directly in components.
- Derive values from props and state instead of copying them into more state.
- Use effects only to synchronize with systems outside React.
- Handle loading, error, and empty states for every request.
- Use semantic, accessible HTML, with labels for inputs and real buttons for actions.
- Use stable keys for lists.
- Do not use `dangerouslySetInnerHTML`.
- Use plain controlled forms. Do not add a form library without a good reason.
- Disable submit buttons while saving, so that a double click cannot send twice.
- Ask for confirmation before cancelling, refunding, deactivating, or deleting.
- Keep list filters and the page number in the URL, so that links and the back button work.

## API and Data

- Talk to the backend through one API client.
- Use TanStack Query for data from the API. Do not copy it into other state.
- Invalidate the affected queries after a change, instead of updating caches by hand.
- Handle the backend's response shapes: `{ data }`, `{ data, meta }`, and `{ error }`.
- Store and send money as integer cents. Format it only for display.
- Parse peso input, such as `199.99`, into cents as text, without decimal arithmetic. Allow at most two decimal places.
- Never calculate authoritative prices, totals, stock, or payment status in the browser.
- Keep request and response handling consistent.

## Validation and Error Handling

- Validate form input before sending it. The backend remains the authority.
- Show the backend's per-field `details` next to the matching fields.
- Show the `requestId` from a `500` error, so that support can find it.
- Use error boundaries so that one failing screen does not break the whole app.
- Never swallow errors silently.
- Show meaningful messages, and never show stack traces.

## Security

- Keep the access token in memory only. Never put it in `localStorage`, `sessionStorage`, or a URL.
- Refresh the session through the `httpOnly` cookie, with `credentials: 'include'`.
- On a `401`, refresh once and retry the request once. If that fails, send the user to log in.
- Hide controls by role for convenience only. The backend enforces permissions.
- Render API data as text. Never insert it as HTML.
- Never log tokens, passwords, or personal data to the console.

## Code Quality

- Follow ESLint rules.
- Use Prettier for code formatting.
- Avoid duplicated code.
- Use meaningful variable, function, and component names.
- Remove unused code, imports, and debugging statements.
- Keep functions and components focused and easy to understand.
- Prefer readable implementations over unnecessarily compact code.

## Environment and Build

- Use environment variables for configuration, read in one place.
- Only variables starting with `VITE_` reach the browser, and anyone can read them. Never put secrets in them.
- Never commit `.env` files or secrets.
- Keep `.env.example` updated.
- Do not hardcode the API URL.
- `npm run build` produces static files in `dist/`. Serve them with a web server, never with the Vite dev server.

## Testing

- Write tests for important behavior.
- Test loading, error, and forbidden states, as well as success.
- Test what the user sees and does, not implementation details.
- Mock at the API client boundary. Do not add a mocking library without a good reason.
- Prioritize meaningful tests over excessive test coverage.

## Dependencies

- Prefer established and actively maintained packages.
- Avoid adding dependencies for functionality that can be implemented simply with existing tools.
- Do not introduce additional libraries without a clear reason.
- Keep dependencies minimal.
- Use only free tools and services. Do not use paid products or free trials.
- Prefer open-source packages with permissive licenses, such as MIT or Apache-2.0.

## Planning First

- Treat every request as planning, even when it sounds like an instruction to build.
- Do not create or change anything until the user says "go execute". Reading files and running read-only checks are fine.
- Each "go execute" covers only the work just planned. New work goes back to planning.

## Git and Project Changes

- Before starting new changes, ask whether to commit the current work.
- Never merge into `main`, even when asked to push. Open a pull request instead, and the user merges it manually.
- Keep changes focused on the requested task.
- Do not modify unrelated files.
- Follow existing naming conventions.
- Do not remove existing functionality without a clear requirement.
- Keep `.env.example` and documentation updated when configuration or setup changes.
- Do not commit secrets, credentials, or generated files that should be ignored.

## Before Completing a Task

- Ensure the implementation meets the requested requirements.
- Run TypeScript type checking.
- Run ESLint.
- Run relevant tests.
- Run the production build.
- Apply Prettier formatting.
- Fix errors introduced by the changes.
- Summarize what was implemented and mention any important decisions.

## Final Rule

Always choose the simplest solution that meets the requirements without sacrificing correctness, security, or maintainability.

Write code that another developer can easily understand, maintain, and extend.
