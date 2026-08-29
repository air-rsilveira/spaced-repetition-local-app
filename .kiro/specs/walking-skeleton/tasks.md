# Implementation Plan: Walking Skeleton

## Overview

This plan builds the first vertical slice test-first, in dependency order: stand up the
Vitest + React Testing Library toolchain and pinned dependencies, define the Zod schema and
inferred types, build the pure persistence module (with its property tests), then the
`DecksProvider`/`useDecks` store (with its property tests), then the app shell
(layout + `AppHeader` + `NavLinks`), then the `Dashboard`/`DeckCard`/`EmptyState`
presentation layer (with property and example tests), then wire `app/page.tsx` and
`app/layout.tsx` together, and finish with the quality gates (lint + green suite).

Each step builds on the previous one and ends integrated — no orphaned code. Every correctness
property (Properties 1–13) is implemented as a single fast-check test at `{ numRuns: 100 }`,
tagged `// Feature: walking-skeleton, Property {number}: {property_text}`.

Constants used throughout: persistence key `walking-skeleton:decks`; IDs via `crypto.randomUUID()`.

## Tasks

- [x] 1. Set up dependencies and the Vitest + RTL test harness
  - Install pinned runtime dependency `zod`; install pinned dev dependencies `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `fast-check`, and `vite-tsconfig-paths` for `@/*` alias resolution
  - Add the `"test": "vitest run"` script to `package.json` (single execution, not watch)
  - Create `vitest.config.ts` with `test.environment = "jsdom"`, `test.globals = true`, `test.setupFiles = ["./vitest.setup.ts"]`, and `@/*` alias resolution via `vite-tsconfig-paths` (or explicit `resolve.alias` mapping `@` to the project root) so imports resolve identically to the Next.js build
  - Create `vitest.setup.ts` importing `@testing-library/jest-dom` and clearing `localStorage` and mocks between tests
  - Add a trivial smoke test that imports a module via `@/…` and asserts `1 + 1 === 2` to confirm the harness runs and the alias resolves
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.5, 9.6_

- [x] 2. Define the Zod schema, inferred types, and mock fixtures
  - [x] 2.1 Create `types/deck.ts` with the Zod schema and inferred types
    - Define `cardSchema` (`id: string min 1`), `deckSchema` (`id` non-empty, `name` 1–100, `description` optional max 500, `cards` array max 1000), and `deckListSchema` (array max 10,000)
    - Export `Card`, `Deck`, `DeckList` via `z.infer` so runtime schema and compile-time types share one source of truth
    - Re-export the schemas and types from `types/index.ts` for import via `@/types`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 3.7_

  - [x] 2.2 Write property test for deck schema validation round-trip
    - **Property 8: Deck schema validation round-trip** — valid values parse to an equal value; constraint-violating values fail parsing
    - Add generators `arbDeck` (bounded id/name/description/cards) reused by later tests
    - **Validates: Requirements 7.1, 7.2**

  - [x] 2.3 Create deck fixtures in `mocks/`
    - Add an empty list, a 1–3 deck list, decks with and without descriptions, a deck with zero cards, and a `makeDeck` factory for property tests
    - Barrel-export the fixtures and factory from `mocks/index.ts` for import via `@/mocks`
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 3. Implement the localStorage persistence module
  - [x] 3.1 Create `lib/storage.ts` with `loadDecks` and `saveDecks`
    - Export `DECKS_STORAGE_KEY = "walking-skeleton:decks"`, the `LoadResult`/`SaveResult` discriminated unions, and both functions; guard all access with `typeof window === "undefined"`
    - `loadDecks`: return `{ ok: true, decks }` on parse+validate success against `deckListSchema`, `{ ok: false, reason: "empty" }` on missing key, `{ ok: false, reason: "invalid" }` on parse/validation failure; never throw
    - `saveDecks`: serialize and write; return `{ ok: false, reason: "quota" }` on `QuotaExceededError`, `{ ok: false, reason: "unavailable" }` on other write/availability failures, `{ ok: true }` otherwise
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 4.5, 7.5, 3.7_

  - [x] 3.2 Write property test for persistence round-trip
    - **Property 5: Persistence round-trip preserves the deck list** — for any valid deck list, `saveDecks` then `loadDecks` yields an equal list (same decks, fields, order)
    - Include a large-list arbitrary exercising sizes near the 10,000 bound
    - **Validates: Requirements 3.1, 3.2, 3.4, 8.5**

  - [x] 3.3 Write property test for invalid/missing load resilience
    - **Property 6: Invalid or missing persisted data loads as empty without throwing** — for any stored string (missing key, non-JSON, schema-invalid JSON), `loadDecks` never throws and yields empty, surfacing an invalid indication when data was present but unparseable
    - Add `arbGarbageStorage` generator
    - **Validates: Requirements 3.5, 3.6, 4.5, 7.5**

  - [x] 3.4 Write property test for write-failure resilience
    - **Property 7: Write failures retain in-memory state and surface an error** — when `Storage.prototype.setItem` throws quota/unavailable, `saveDecks` returns a failure result and the input list is left unchanged
    - **Validates: Requirements 3.3**

- [x] 4. Checkpoint - persistence and schema
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement the Decks store provider and hook
  - [x] 5.1 Create `contexts/DecksContext.tsx` with `DecksProvider` and `useDecks`
    - `"use client"`; seed a deterministic empty list with `status = "initial"` and no localStorage read during render
    - Mount `useEffect` calls `loadDecks()`: on success set decks + `status = "ready"`; on `"empty"` set `[]` + `"ready"`; on `"invalid"` keep `[]`, set `"ready"`, surface an `invalid-data` error without throwing
    - Persistence `useEffect` on `[decks]` gated until after initial load so the empty seed never clobbers persisted data; on save failure surface a `persistence` error and keep the in-memory list intact
    - Implement `addDeck`: trim name (reject empty/whitespace with `name-required`, state unchanged); resolve id via supplied value or `crypto.randomUUID()` (reject existing id with `duplicate-id`, state unchanged); build the `Deck` (omit empty description, default `cards` to `[]`), append preserving order
    - `useDecks` throws `Error("useDecks must be used within a DecksProvider")` when called outside the provider
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 3.1, 3.2, 3.3, 4.1, 4.2, 4.4, 4.5, 7.5, 7.6_

  - [x] 5.2 Write property test for valid add append/order
    - **Property 1: Adding a valid deck appends and preserves order** — length increases by one, prior decks keep order, new deck is last
    - **Validates: Requirements 2.3, 2.4**

  - [x] 5.3 Write property test for whitespace-name rejection
    - **Property 2: Empty or whitespace-only names are rejected** — `name-required` error and list unchanged
    - Add `arbWhitespaceName` generator
    - **Validates: Requirements 2.5**

  - [x] 5.4 Write property test for generated-id uniqueness
    - **Property 3: Generated identifiers are unique within the list** — a generated id is not equal to any existing id, and all ids remain distinct
    - **Validates: Requirements 2.6**

  - [x] 5.5 Write property test for duplicate-id rejection
    - **Property 4: Duplicate identifiers are rejected** — supplying an existing id yields `duplicate-id`, existing deck preserved, list unchanged
    - **Validates: Requirements 7.6**

  - [x] 5.6 Write property test for hydration determinism
    - **Property 9: Hydration determinism of the initial deck list** — with seeded localStorage, the list exposed before the first client mount completes equals the empty deterministic list (no read during render)
    - **Validates: Requirements 4.1, 4.2**

  - [x] 5.7 Write example tests for store behavior and hydration
    - Empty list pre-hydration (2.2); `useDecks` outside provider throws (2.8); spy on `console.error` and assert no hydration-mismatch warning on first render (4.3); with seeded localStorage the exposed list updates to persisted data after the mount effect (4.4)
    - _Requirements: 2.2, 2.8, 4.3, 4.4_

  - [x] 5.8 Write the required round-trip example test through the store
    - Add one deck through the store, persist to localStorage, re-initialize the store from localStorage, assert exactly one deck matching the added deck's id and content
    - _Requirements: 8.5_

- [x] 6. Checkpoint - decks store
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement the app shell chrome
  - [x] 7.1 Create `components/NavLinks.tsx` (client) for primary navigation
    - `"use client"`; render one `next/link` `<Link>` per item from a static `NAV_ITEMS` list (at least one, e.g. `{ href: "/", label: "Dashboard" }`)
    - Use `usePathname()` to mark the active item with `aria-current="page"` plus a non-color affordance (bottom border / bold weight); no item active when the pathname matches none
    - _Requirements: 1.3, 1.8, 1.9, 1.10_

  - [x] 7.2 Write property test for active navigation destination
    - **Property 13: Active navigation destination reflects the current route** — a destination is marked active (via `aria-current="page"` plus non-color affordance) iff its href matches the pathname; none active when no match
    - Add `arbPathname` generator (destination hrefs plus non-matching paths); mock `usePathname`
    - **Validates: Requirements 1.8, 1.10**

  - [x] 7.3 Create `components/AppHeader.tsx` (server) chrome
    - Render the app name as visible text; render `<NavLinks />`; apply `bg-aws-squid-ink text-aws-white` and `sticky top-0` so the header persists on mobile and desktop; mobile-first single column with `md:` desktop treatment
    - _Requirements: 1.2, 1.3, 1.5, 1.6, 1.7_

- [x] 8. Implement the dashboard presentation layer
  - [x] 8.1 Create `components/DeckCard.tsx` (server, takes a `deck` prop)
    - `bg-aws-white border border-aws-gray-200`; render the deck name; render the description region only when the description is present and non-empty; always render the card count `deck.cards.length`
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 8.2 Write property test for DeckCard name and count
    - **Property 11: DeckCard renders name and card count** — renders the name as visible text and a card count equal to the number of cards (0 when empty)
    - **Validates: Requirements 5.2, 5.5**

  - [x] 8.3 Write property test for DeckCard conditional description
    - **Property 12: DeckCard renders description conditionally** — description text present iff description is present and non-empty; name and count always rendered
    - **Validates: Requirements 5.3, 5.4**

  - [x] 8.4 Create `components/EmptyState.tsx` (server)
    - Render a message that no decks exist plus a create-deck entry point (`bg-aws-orange hover:bg-aws-orange-dark text-aws-squid-ink`) and an import-deck entry point (`bg-aws-blue hover:bg-aws-blue-dark text-aws-white`); flows are labelled stubs for later slices
    - _Requirements: 6.2, 6.3_

  - [x] 8.5 Create `components/Dashboard.tsx` (client) consuming the store
    - Read `{ decks, status, error }` from `useDecks()`; when `status === "error"` render an error indication and neither the listing nor the empty state (retain prior data); when `decks.length === 0` render `EmptyState` and no `DeckCard`; otherwise render exactly one `DeckCard` per deck in store order
    - _Requirements: 5.1, 5.6, 5.7, 6.1, 6.4, 6.5, 6.6_

  - [x] 8.6 Write property test for one DeckCard per deck in store order
    - **Property 10: One DeckCard per deck in store order** — for any non-empty deck list, exactly one DeckCard per deck and rendered order matches store order
    - **Validates: Requirements 5.1, 5.7**

  - [x] 8.7 Write the required dashboard listing example test
    - Render the Dashboard with a mock store of 1–3 decks; assert every deck renders and the rendered count equals the mock count
    - _Requirements: 8.6_

  - [x] 8.8 Write the required empty-state example test
    - Render the Dashboard with a mock store of 0 decks; assert the `EmptyState` renders and no `DeckCard` renders
    - _Requirements: 8.7_

  - [x] 8.9 Write example tests for dashboard state transitions and error
    - Toggling the store 0↔1+ swaps the listing and empty state (6.4, 6.5); `status === "error"` renders an error indication and neither listing nor empty state (6.6); `EmptyState` shows both create and import entry points (6.2, 6.3)
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9. Checkpoint - shell and dashboard
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Wire the shell, provider, and dashboard together
  - [x] 10.1 Update `app/layout.tsx` to mount the shell and provider
    - Verify Inter is already loaded (do not re-init fonts or html/body); render `<AppHeader />`, then wrap the page `children` with `DecksProvider` around a single `<main className="flex flex-1 flex-col">` region
    - _Requirements: 1.1, 1.4, 2.7_

  - [x] 10.2 Replace `app/page.tsx` with the Dashboard
    - Make `app/page.tsx` a thin Server Component rendering `<Dashboard />`, removing the placeholder marketing content
    - _Requirements: 5.1, 5.6, 6.1_

  - [x] 10.3 Write an integration example test for the app shell
    - Render a route within the shell; assert the `AppHeader` and a single `<main>` region are present and that nav items are `<Link>`s with correct `href` while the header persists
    - _Requirements: 1.1, 1.4, 1.9_

- [x] 11. Final checkpoint - quality gates
  - [x] 11.1 Run the full test suite and fix any failures
    - Run `npm run test`; ensure every test passes with zero failed and zero skipped, completing within 60 seconds; add a type-level assertion that `@/types` exports resolve and the `z.infer` `Deck` type is assignable
    - _Requirements: 7.3, 7.4, 8.8, 8.9_

  - [x] 11.2 Run lint and resolve violations
    - Run `npm run lint`; fix all ESLint errors so it exits 0 with zero errors; do not disable rules inline without a justification comment
    - _Requirements: 9.3, 9.4_

  - [x] 11.3 Verify pinned dependencies are present
    - Confirm `package.json` lists `zod` as a pinned runtime dependency and Vitest + React Testing Library as pinned dev dependencies
    - _Requirements: 9.5, 9.6_

## Notes

- Tasks marked with `*` are optional (unit, property, integration, and type-check tests) and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references the specific requirements and/or correctness properties it covers for traceability.
- Every correctness property (Properties 1–13) is implemented as a single fast-check test at `{ numRuns: 100 }`, tagged `// Feature: walking-skeleton, Property {number}: {property_text}`.
- The three explicitly required tests are 5.8 (round-trip 8.5), 8.7 (dashboard listing 8.6), and 8.8 (empty-state 8.7).
- Purely visual/manual concerns (responsive layout, sticky header, color contrast — Requirements 1.5–1.7) are verified manually and are not separate code tasks; the styling is applied in tasks 7.3, 8.1, and 8.4.
- Dev/lint smoke gates (Requirements 9.1–9.4) are covered by the quality-gate tasks; `npm run dev` is run manually by the developer, not as automated verification.
- Checkpoints ensure incremental validation at layer boundaries.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.3"] },
    { "id": 2, "tasks": ["2.2", "3.1", "7.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "5.1", "7.2", "7.3", "8.1", "8.4"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "8.2", "8.3", "8.5"] },
    { "id": 5, "tasks": ["8.6", "8.7", "8.8", "8.9", "10.1", "10.2"] },
    { "id": 6, "tasks": ["10.3", "11.1"] },
    { "id": 7, "tasks": ["11.2", "11.3"] }
  ]
}
```
