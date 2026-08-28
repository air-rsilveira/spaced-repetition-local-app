# Tech Stack

## Framework & Language

- **Next.js 16** with the **App Router** (the `/app` directory). Do not use the
  legacy Pages Router.
- **React 19**.
- **TypeScript** with `strict` mode. Avoid `any`; prefer precise types, generics,
  and `unknown` with narrowing.
- Prefer **Server Components** by default. Add `"use client"` only when a
  component needs interactivity, state, effects, or browser APIs.

> Note: This Next.js version may differ from older conventions. When unsure about
> an API or file convention, consult `node_modules/next/dist/docs/`.

## Styling

- **Tailwind CSS v4** (configured via `@tailwindcss/postcss`). Prefer utility
  classes; write custom CSS only when a style cannot be expressed with utilities.
- Brand tokens follow the **AWS palette**, defined in `tailwind.config.js` under
  `theme.extend.colors.aws` (e.g. `bg-aws-orange`, `text-aws-squid-ink`).
- **Inter** is the primary font, loaded via `next/font/google` in the root layout
  and exposed as the `--font-inter` CSS variable (`font-sans`).
- **Mobile-first**: author base styles for small screens, then layer up with
  `sm:`, `md:`, `lg:`, `xl:` prefixes.

## Validation

- Use **Zod** for form and input validation. Define schemas alongside the feature
  (or in `/types` when shared) and infer types with `z.infer`. Validate on both
  the client and any server route handlers.

## Linting

- **ESLint** with the Next.js config (`next/core-web-vitals` + TypeScript).
- Fix lint errors before considering work complete. Do not disable rules inline
  without a clear justification comment.

## Path Aliases

- `@/*` maps to the project root (e.g. `@/components`, `@/types`, `@/mocks`,
  `@/contexts`).

## Common Commands

```bash
npm run dev     # start the local dev server (http://localhost:3000)
npm run build   # production build
npm run start   # run the production build
npm run lint    # run ESLint
```
