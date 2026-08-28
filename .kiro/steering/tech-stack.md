# Tech Stack

This document defines the technology stack and project conventions. Apply these to all code work.

## Framework

- **Next.js 14+** using the **App Router** (the `/app` directory). Do not use the legacy Pages Router.
- Prefer **Server Components** by default; add `"use client"` only when a component needs interactivity, state, effects, or browser APIs.
- Use route handlers under `/app` for API endpoints when needed.

## Language

- **TypeScript** everywhere. No plain `.js`/`.jsx` for application code.
- Enable and respect `strict` mode. Avoid `any`; prefer precise types, generics, and `unknown` with narrowing.
- Share and reuse types via the `/types` directory.

## Project Structure

Organize the codebase around these top-level directories:

| Directory     | Purpose                                                        |
| ------------- | -------------------------------------------------------------- |
| `/app`        | Next.js App Router routes, layouts, pages, and route handlers  |
| `/components` | Reusable UI components (presentational and composite)          |
| `/contexts`   | React context providers and related hooks                      |
| `/types`      | Shared TypeScript types, interfaces, and enums                 |
| `/mocks`      | Mock data and fixtures for development and testing             |

- Keep components focused and colocate component-specific helpers with the component.
- Put cross-cutting shared types in `/types`, not inlined across features.

## Styling

- **Tailwind CSS** for all styling (see the Visual Identity steering for the color palette and usage).
- **Inter** as the primary font. Load it via `next/font/google` in the root layout and expose it as a CSS variable so Tailwind can reference it.

```ts
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
```

```js
// tailwind.config.js
theme: {
  extend: {
    fontFamily: {
      sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
    },
  },
}
```

## Responsive Design

- **Mobile-first.** Author base styles for small screens, then layer breakpoints up with Tailwind prefixes (`sm:`, `md:`, `lg:`, `xl:`).
- Avoid fixed pixel widths that break on small viewports; prefer fluid layouts, flexbox, and grid.
- Test layouts at mobile, tablet, and desktop widths.

## Form Validation

- Use **Zod** for all form and input validation.
- Define schemas alongside the feature or in `/types` when shared, and infer TypeScript types from schemas with `z.infer` to keep types and validation in sync.
- Validate on both the client (UX) and any server route handlers (integrity).

```ts
import { z } from 'zod';

const cardSchema = z.object({
  front: z.string().min(1, 'Front is required'),
  back: z.string().min(1, 'Back is required'),
});

type Card = z.infer<typeof cardSchema>;
```

## Linting

- **ESLint** governs code quality. Use the Next.js ESLint config (`next/core-web-vitals`) as the base.
- Fix lint errors before considering work complete; do not disable rules inline without a clear justification comment.

## Conventions

- Name components in `PascalCase`, hooks in `camelCase` prefixed with `use`, and files consistently within each directory.
- Keep imports ordered and use path aliases (e.g. `@/components`, `@/types`) configured in `tsconfig.json`.
