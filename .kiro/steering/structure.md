# Project Structure

## Top-Level Directories

| Directory     | Purpose                                                       |
| ------------- | ------------------------------------------------------------- |
| `/app`        | Next.js App Router routes, layouts, pages, and route handlers |
| `/components` | Reusable UI components (presentational and composite)         |
| `/contexts`   | React context providers and related hooks                     |
| `/types`      | Shared TypeScript types, interfaces, and enums                |
| `/lib`        | Framework-agnostic logic and side-effect seams (e.g. storage) |
| `/mocks`      | Mock data and fixtures for development and testing            |
| `/test`       | Shared test helpers (e.g. fast-check arbitraries)             |
| `/public`     | Static assets served as-is                                    |

## Conventions

- **Routing**: define routes, layouts, and pages under `/app`. Use route handlers
  under `/app` for API endpoints when needed.
- **Components**: name in `PascalCase`. Add `"use client"` only when interactivity
  is required. Colocate component-specific helpers alongside the component. Import
  via `@/components`.
- **Contexts**: providers are Client Components. Name hooks in `camelCase` with a
  `use` prefix (e.g. `useDeck`). Import via `@/contexts`.
- **Types**: put cross-cutting shared types in `/types` (barrel-exported), not
  inlined across features. Import via `@/types`.
- **Lib**: keep browser/side-effect access (like `localStorage`) behind a single
  seam in `/lib`. These modules guard for SSR (`typeof window === "undefined"`)
  and return discriminated results instead of throwing. Import via `@/lib`.
- **Mocks**: barrel-export fixtures from `/mocks`, imported via `@/mocks`.
- **Tests**: colocate `*.test.ts(x)` files next to the code they cover.

## File Naming

- Keep file naming consistent within each directory.
- Use path aliases (`@/...`) for imports rather than long relative paths.
