# Implementation Plan: Cards Within a Deck

## Overview

This plan turns each deck into an authorable set of cards by adding a `/deck/[id]` detail
page and the card create/edit/delete flows. It builds strictly on the existing seams:
`types/deck.ts` (single source of truth), `contexts/DecksContext.tsx` (client store),
`lib/storage.ts` (unchanged `localStorage` seam), and the slice-2 `DeleteConfirm` component.

The work proceeds bottom-up so each step compiles and is exercised before the next builds on
it: grow the card schema and types first, then the shared test arbitraries, then the store
card actions (with property tests), then the persistence round-trip test, then install the
markdown dependencies, then the `Markdown` wrapper, the `CardForm`, the `CardList`/`CardItem`
pair, and finally the detail route/page wiring, ending with a full-verification checkpoint.

Testing uses **Vitest** (`jsdom`) + **@testing-library/react** + **fast-check** (100+ runs
per property test). Property tests are tagged with the established comment format:

```
// Feature: deck-detail-cards, Property N - <property text>
// Validates: Requirements X.Y
```

Styling follows the AWS Tailwind palette, mobile-first, with React 19 Server/Client component
conventions and TypeScript `strict`. The detail page is a Client Component that reads the
route id via `use(params)` typed with the global `PageProps<'/deck/[id]'>` helper.

## Tasks

- [x] 1. Grow the card domain type and schema
  - [x] 1.1 Grow `cardSchema` and add `cardFormSchema` in `types/deck.ts`
    - Grow `cardSchema` from `{ id }` to `{ id, front, back, box, lastReviewed, createdAt }`: `front`/`back` strings 1–5000, `box` integer `>= 1`, `lastReviewed` the `isoTimestamp` shape or `null` (`isoTimestamp.nullable()`), `createdAt` reusing the existing `isoTimestamp` pattern
    - Keep `deckSchema.cards` referencing the grown `cardSchema` so a `DeckList` of grown cards still validates and round-trips through `lib/storage.ts` unchanged
    - Add a new `cardFormSchema` (trimmed `front` 1–5000 with required/overlong messages; trimmed `back` 1–5000 with required/overlong messages) and export `CardFormInput = z.infer<typeof cardFormSchema>`
    - Barrel-export the grown `Card`, `cardSchema`, `cardFormSchema`, and `CardFormInput` from `types/index.ts`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8_

  - [~]* 1.2 Extend `types/deck.test.ts` with the card schema round-trip property
    - **Property 1: Card schema validation round-trip over the grown shape**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**
    - Assert valid grown cards (incl. both `null` and ISO `lastReviewed`) parse to an equal value; cards with empty/overlong `front`/`back`, non-integer or `< 1` `box`, non-null non-ISO `lastReviewed`, or empty/unparseable `createdAt` fail `safeParse`

- [x] 2. Update shared test arbitraries
  - [x] 2.1 Grow `arbCard` and add card-form-input arbitraries in `test/arbitraries.ts`
    - Add `arbCardFront`/`arbCardBack` (non-empty, valid after trimming, ≤5000), `arbBox` (`fc.integer({ min: 1, max: 8 })`), and `arbLastReviewed` (`fc.option(arbCreatedAt, { nil: null })`), reusing the existing `arbCreatedAt` for `createdAt`
    - Grow `arbCard` to `{ id, front, back, box, lastReviewed, createdAt }`; ensure `arbCards`, `arbDeck`, and `arbLargeDeckList` produce valid grown cards
    - Add `arbCardFormInput` (valid `{ front, back }`) and invalid companions `arbEmptyOrWhitespace` and `arbOverlongText` (>5000) for the rejection property
    - _Requirements: 2.2, 6.1, 6.2, 7.2, 7.7_

- [x] 3. Extend the decks store with card create/update/delete
  - [x] 3.1 Add card action types and generalize the validation error helper
    - Add `CardFormField` (`"front" | "back"`), widen the `validation` error `fields` map to cover both deck and card fields, and generalize `toValidationError` to key on `front`/`back` as well as `name`/`description`
    - Add `AddCardInput`, `UpdateCardInput`, `AddCardResult`, `UpdateCardResult`, `DeleteCardResult`, and the `addCard`/`updateCard`/`deleteCard` signatures to `DecksContextValue`
    - _Requirements: 6.7, 6.8_

  - [x] 3.2 Implement `addCard`, `updateCard`, and `deleteCard`
    - `addCard`: validate `{ front, back }` with `cardFormSchema`; locate deck by id (absent → `not-found`, list unchanged); append a card with `crypto.randomUUID()` id, `box: 1`, `lastReviewed: null`, `createdAt: new Date().toISOString()`, and trimmed `front`/`back`; preserve the deck's existing cards and every other deck
    - `updateCard`: validate `{ front, back }`; locate deck then card (either absent → `not-found`, list unchanged); replace only `front`/`back` with trimmed values while preserving `id`, `box`, `lastReviewed`, `createdAt`, every other card, and every other deck
    - `deleteCard`: locate deck then card (either absent → `not-found`, no removal); otherwise remove exactly the target card, preserving every other card and deck
    - Expose all three actions through the provider value; the existing persistence effect writes on every `[decks]` change
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9, 2.11, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 3.10, 4.3, 4.4, 4.6, 4.8, 6.7, 6.8_

  - [ ]* 3.3 Write property test for card create assignment and preservation
    - **Property 2: Creating a valid card appends one card with the correct defaults and preserves the rest**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
    - Suggested location: `contexts/DecksContext.card-create.test.tsx`

  - [ ]* 3.4 Write property test for card update preservation
    - **Property 3: Updating a card preserves id/box/lastReviewed/createdAt and every other card and deck**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
    - Suggested location: `contexts/DecksContext.card-update.test.tsx`

  - [ ]* 3.5 Write property test for card action not-found
    - **Property 4: A card action for an absent deck or card is a no-op that returns not-found**
    - **Validates: Requirements 2.11, 3.10**
    - Suggested location: `contexts/DecksContext.card-not-found.test.tsx`

  - [ ]* 3.6 Write property test for card delete removal and idempotence
    - **Property 5: Deleting removes exactly the target card and is idempotent for absent ids**
    - **Validates: Requirements 4.3, 4.4, 4.8**
    - Suggested location: `contexts/DecksContext.card-delete.test.tsx`

  - [ ]* 3.7 Write property test for card validation rejection
    - **Property 6: Invalid card input is rejected, leaves the list unchanged, and identifies each invalid field**
    - **Validates: Requirements 2.10, 3.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8**
    - Suggested location: `contexts/DecksContext.card-validation.test.tsx`

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Extend persistence round-trip coverage
  - [ ]* 5.1 Extend `lib/storage.test.ts` with the grown-card round-trip
    - **Property 7: Persistence round-trip preserves the deck list including grown card fields**
    - **Validates: Requirements 7.7, 8.1, 8.2, 8.3**
    - `saveDecks` then `loadDecks` yields an equal deck list (same decks/cards/fields incl. every grown card field, same order); `lib/storage.ts` itself is unchanged

- [x] 6. Install markdown dependencies
  - [x] 6.1 Add `react-markdown` and `remark-gfm`
    - Install `react-markdown` and `remark-gfm` as runtime dependencies (pinned versions) so the `Markdown` wrapper can render GitHub Flavored Markdown
    - _Requirements: 5.3, 5.4_

- [x] 7. Create the reusable markdown view
  - [x] 7.1 Implement `components/Markdown.tsx`
    - Thin wrapper over `react-markdown` configured with the `remark-gfm` plugin; takes a single `children: string` prop and holds no state
    - Renders an empty preview without error for an empty string; GFM emphasis such as `**bold**` produces a `<strong>` element
    - AWS palette text styling, mobile-first
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ]* 7.2 Write unit tests for `Markdown`
    - Rendering `**bold**` produces a `<strong>` element (transitively confirming `remark-gfm` is wired) (5.3, 5.4); rendering `""` produces an empty preview without error (5.5)
    - _Requirements: 5.3, 5.4, 5.5_

- [ ] 8. Create the card form component
  - [~] 8.1 Implement `components/CardForm.tsx` (`"use client"`)
    - Controlled create/edit form taking `deckId`, `mode` (`create | edit`), and `onClose`: create mode starts empty; edit mode pre-fills from `mode.card.front`/`back`
    - Live `Markdown_Preview` region rendering the current `front` and `back` through `Markdown`, updating as the user types without a page reload; empty fields render an empty preview
    - Validate `{ front, back }` with `cardFormSchema` on submit; on failure set per-field errors from `error.issues` (keyed by `issue.path[0]`), retain entered values, and do not call the store
    - On success call `addCard` (create) or `updateCard` (edit); surface any returned `validation`/`not-found`/`persistence` error, otherwise close via `onClose`
    - Modal a11y mirroring `DeckForm`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` heading; labelled `front`/`back` fields with `aria-describedby` to error text using `role="alert"`
    - AWS palette (submit `bg-aws-orange` / `text-aws-squid-ink` / `hover:bg-aws-orange-dark`; neutral/blue cancel), mobile-first with `sm:` refinements
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 5.1, 5.2, 5.5, 6.3, 6.4, 6.5, 6.6, 7.8_

  - [ ]* 8.2 Write unit tests for `CardForm`
    - Opens empty in create mode (2.1); pre-filled in edit mode (3.1); preview renders and updates as inputs change and shows empty preview for empty input (5.1, 5.2, 5.5); retains input and shows the field-specific message on validation failure without calling the store (6.3, 6.4, 6.5, 6.6); labelled inputs and `role="dialog"`/`aria-modal`
    - _Requirements: 2.1, 3.1, 5.1, 5.2, 5.5, 6.3, 6.4, 6.5, 6.6_

- [ ] 9. Create the card list and item components
  - [x] 9.1 Implement `components/CardItem.tsx` and `components/CardItemActions.tsx`
    - `CardItem` (prop-driven): renders the card `front` text and a `Box_Badge` showing the Leitner box with an accessible text label such as `Box 1` (never color alone)
    - `CardItemActions` (`"use client"`): per-card Edit and Delete buttons that call `onEdit(card)` / `onDelete(card)`, with `aria-label`s that disambiguate which card each control targets, keeping `CardItem` prop-driven
    - AWS palette, mobile-first; destructive delete control uses `bg-aws-error`/`border-aws-error` with a visible text label
    - _Requirements: 1.4, 3.1, 4.1_

  - [x] 9.2 Implement `components/CardList.tsx`
    - Prop-driven list taking `deckId`, `cards`, `onEdit`, `onDelete`: renders one `CardItem` per card, threading the callbacks; renders an empty-cards state when `cards` is empty
    - _Requirements: 1.3, 1.7_

  - [ ]* 9.3 Write unit tests for `CardList` and `CardItem`
    - `CardList` renders one `CardItem` per card (1.3) and an empty-cards state for zero cards (1.7); a `CardItem` shows the front text and a `Box N` text label alongside the badge — never color alone (1.4)
    - _Requirements: 1.3, 1.4, 1.7_

- [ ] 10. Create the deck detail route and page
  - [~] 10.1 Implement `app/deck/[id]/page.tsx` (`"use client"`)
    - Read the route id via `use(params)` typed with the global `PageProps<'/deck/[id]'>` helper (no import; matches `LayoutProps<"/">` usage)
    - Consume `useDecks()`; while `status` is not `"ready"` render a loading state and read `localStorage` only after mount (via the provider's hydration guard, never during render)
    - When ready and a deck matches the route id, render the deck name and `CardList` for that deck's cards; when ready and no deck matches, render the `Deck_Missing_State`
    - Own the `CardOverlay` state (`closed | create | edit | delete`); a header "Add card" opens create, and `CardList` callbacks open edit/delete; render `CardForm` for create/edit and the reused `DeleteConfirm` for delete, with confirm calling `deleteCard(deck.id, card.id)` then closing
    - AWS palette, mobile-first
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 2.1, 3.1, 4.1, 4.2, 4.3, 4.7_

  - [ ]* 10.2 Write unit tests for the deck detail page wiring
    - Reads the route id and renders the deck name + `CardList` when a deck matches (1.1, 1.2); renders a loading state while `status` is not `"ready"` (1.5); renders the `Deck_Missing_State` when no deck matches (1.6); a card added/edited/deleted via the store is reflected in the list (2.8, 3.8, 4.5); the delete flow opens `DeleteConfirm` and cancel leaves the list unchanged (4.1, 4.2, 4.7)
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 2.8, 3.8, 4.1, 4.2, 4.5, 4.7_

- [x] 11. Final checkpoint - Ensure the feature is wired and verified
  - [x] 11.1 Run full verification
    - Run `npm run lint`, `tsc` (type check), and `npm run test` (Vitest single run) and fix any failures
    - _Requirements: 1.2, 2.2, 3.2, 4.3, 8.1_

## Notes

- Tasks marked with `*` are optional (tests) and can be skipped for a faster MVP, but they
  carry the correctness guarantees for this slice.
- Each task references specific requirements for traceability; property test sub-tasks
  reference the design's numbered correctness properties.
- Property tests carry the input-coverage burden (append / preservation / idempotence /
  round-trip / rejection); unit tests stay focused on concrete examples, route rendering,
  markdown `**bold**` → `<strong>`, and accessibility/focus behavior.
- `lib/storage.ts` is intentionally unchanged; only its test is extended.
- Checkpoints ensure incremental validation before building further.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "6.1"] },
    { "id": 2, "tasks": ["3.1", "7.1"] },
    { "id": 3, "tasks": ["3.2", "7.2", "9.1"] },
    { "id": 4, "tasks": ["3.3", "3.4", "3.5", "3.6", "3.7", "5.1", "8.1", "9.2"] },
    { "id": 5, "tasks": ["8.2", "9.3", "10.1"] },
    { "id": 6, "tasks": ["10.2", "11.1"] }
  ]
}
```
