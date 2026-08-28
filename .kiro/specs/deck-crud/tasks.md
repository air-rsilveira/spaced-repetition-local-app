# Implementation Plan: Deck CRUD

## Overview

This plan turns the read-only Dashboard (slice 1) into a manageable deck library by
adding create, edit, and delete flows. It builds strictly on the existing seams:
`types/deck.ts` (single source of truth), `contexts/DecksContext.tsx` (client store),
`lib/storage.ts` (unchanged `localStorage` seam), and the existing Dashboard/DeckCard/
EmptyState components.

The work proceeds bottom-up so each step compiles and is exercised before the next builds
on it: extend the schema and types first, then the shared test arbitraries, then the store
actions (with property tests), then the persistence round-trip test, then the new client
components, and finally wire everything into the Dashboard and page.

Testing uses **Vitest** + **@testing-library/react** + **fast-check** (100+ runs per
property test). Property tests are tagged with the established comment format:

```
// Feature: deck-crud, Property N - <property text>
// Validates: Requirements X.Y
```

Styling follows the AWS Tailwind palette, mobile-first, with React 19 Server/Client
component conventions and TypeScript `strict`.

## Tasks

- [x] 1. Extend the deck domain type and schema
  - [x] 1.1 Add `createdAt`, id bound, and `deckFormSchema` to `types/deck.ts`
    - Add a validated ISO 8601 `createdAt` field to `deckSchema` (non-empty string, 1–30 chars, `Date.parse` must succeed)
    - Add a `.max(100)` bound to the deck `id` so it is safe as an export filename and route param
    - Add a new `deckFormSchema` (trimmed `name` 1–100 with required/overlong messages; optional `description` ≤500 with overlong message) and export `DeckFormInput = z.infer<typeof deckFormSchema>`
    - Barrel-export `deckFormSchema` and `DeckFormInput` from `types/index.ts`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 1.2 Extend `types/deck.test.ts` with the schema round-trip property
    - **Property 6: Deck schema validation round-trip (extended for createdAt and id bounds)**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.5, 6.6**
    - Assert valid decks (incl. valid `createdAt` and 1–100-char id) parse to an equal value; decks with empty/non-string/unparseable `createdAt` or empty/overlong id fail `safeParse`

- [x] 2. Update shared test arbitraries
  - [x] 2.1 Extend `test/arbitraries.ts` for createdAt and form inputs
    - Add `arbCreatedAt` (valid ISO 8601 string within 1–30 chars, e.g. bounded `fc.date()` mapped through `.toISOString()`)
    - Update `arbDeck` and `arbLargeDeckList` to carry `createdAt` from `arbCreatedAt`
    - Add `arbDeckFormInput` (valid name 1–100, optional description ≤500) and invalid companions `arbWhitespaceName`, `arbOverlongName` (>100), `arbOverlongDescription` (>500)
    - Add `arbInvalidCreatedAt` (empty, whitespace, non-ISO) and `arbInvalidId` (empty, >100 chars) for Property 6's rejection branch
    - _Requirements: 1.2, 4.1, 4.2, 6.2, 6.5_

- [x] 3. Extend the decks store with create/update/delete
  - [x] 3.1 Set `createdAt` in `addDeck` and extend store types
    - Assign `createdAt: new Date().toISOString()` and initialize `cards` to `[]` on create
    - Extend `DecksError` with `validation` (with `fields`) and `not-found` codes; add `UpdateDeckInput`, `UpdateDeckResult`, `DeleteDeckResult`, and the new actions to `DecksContextValue`
    - Add a `toValidationError` helper that maps Zod issues to `{ code: "validation", fields }`
    - _Requirements: 1.3, 1.4, 1.5, 4.7, 4.8_

  - [x] 3.2 Implement `updateDeck` and `deleteDeck`
    - `updateDeck`: validate with `deckFormSchema`; locate by id; on not-found return `{ code: "not-found" }` and leave the list unchanged; otherwise replace only `name`/`description` while preserving `id`, `createdAt`, and `cards`
    - `deleteDeck`: remove by id; an absent id is a no-op returning `{ code: "not-found" }`, leaving the list unchanged
    - Expose both actions through the provider value; the existing persistence effect writes on every `[decks]` change
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.8, 3.3, 3.9, 4.7, 4.8_

  - [x] 3.3 Write property test for create assignment
    - **Property 1: Creating a valid deck assigns a unique id, a valid createdAt, and empty cards**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**
    - Suggested location: `contexts/DecksContext.create-assignment.test.tsx`

  - [x] 3.4 Write property test for update preservation
    - **Property 2: Updating a deck preserves id, createdAt, and cards while replacing only name and description**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
    - Suggested location: `contexts/DecksContext.update-preservation.test.tsx`

  - [x] 3.5 Write property test for updating an unknown id
    - **Property 3: Updating a non-existent id is a no-op that returns an error**
    - **Validates: Requirements 2.8**
    - Suggested location: `contexts/DecksContext.update-not-found.test.tsx`

  - [x] 3.6 Write property test for delete removal and idempotence
    - **Property 4: Deleting removes exactly the target deck and is idempotent for absent ids**
    - **Validates: Requirements 3.3, 3.9**
    - Suggested location: `contexts/DecksContext.delete.test.tsx`

  - [x] 3.7 Write property test for validation rejection
    - **Property 5: Invalid input is rejected, leaves the list unchanged, and identifies each invalid field**
    - **Validates: Requirements 1.8, 2.9, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**
    - Suggested location: `contexts/DecksContext.validation.test.tsx`

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Extend persistence round-trip coverage
  - [x] 5.1 Extend `lib/storage.test.ts` with the createdAt-carrying round-trip
    - **Property 7: Persistence round-trip preserves the deck list including createdAt (extended)**
    - **Validates: Requirements 1.7, 2.7, 3.5, 5.1**
    - `saveDecks` then `loadDecks` yields an equal deck list (same decks/fields incl. `createdAt`, same order); `lib/storage.ts` itself is unchanged

- [x] 6. Create the deck form component
  - [x] 6.1 Implement `components/DeckForm.tsx` (`"use client"`)
    - Controlled create/edit form: create mode starts empty; edit mode pre-fills from `mode.deck`
    - Validate `{ name, description }` with `deckFormSchema` on submit; on failure set per-field errors from `error.issues` (keyed by `issue.path[0]`), retain entered values, and do not call the store
    - On success call `addDeck` (create) or `updateDeck` (edit); surface any returned `validation`/`not-found`/`persistence` error, otherwise close via `onClose`
    - Modal a11y: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` heading; labelled inputs with `aria-describedby` to error text using `role="alert"`
    - AWS palette (submit `bg-aws-orange` / `text-aws-squid-ink` / `hover:bg-aws-orange-dark`; neutral/blue cancel), mobile-first with `sm:` refinements
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.8, 4.3, 4.4, 4.5, 4.6, 6.4_

  - [x] 6.2 Write unit tests for `DeckForm`
    - Opens empty in create mode (1.1); pre-filled in edit mode (2.1); retains input and shows field-specific message on validation failure (4.3, 4.4, 4.5); labelled inputs and `role="dialog"`/`aria-modal`
    - _Requirements: 1.1, 2.1, 4.3, 4.4, 4.5, 4.6_

- [x] 7. Create the delete confirmation component
  - [x] 7.1 Implement `components/DeleteConfirm.tsx` (`"use client"`)
    - `role="alertdialog"`, `aria-modal="true"`, labelled by a heading including `deck.name`
    - Exactly one confirm control (`bg-aws-error`, with a text label — never color alone) and one cancel control; no deletion without the confirm click
    - On mount move focus to the dialog (default to cancel); on cancel/confirm return focus to the trigger; Escape triggers cancel
    - _Requirements: 3.1, 3.2, 3.7, 3.8_

  - [x] 7.2 Write unit tests for `DeleteConfirm`
    - Displays target deck name (3.1); presents exactly one confirm and one cancel and does not delete without confirm (3.2); cancel closes and returns focus to the trigger (3.8); Escape cancels
    - _Requirements: 3.1, 3.2, 3.8_

- [x] 8. Create per-card action controls
  - [x] 8.1 Implement `components/DeckCardActions.tsx` (`"use client"`)
    - Small client leaf exposing per-card Edit and Delete buttons that call `onEdit(deck)` / `onDelete(deck)` back to the Dashboard, keeping `DeckCard` server-renderable
    - _Requirements: 1.1, 2.1, 3.1_

- [x] 9. Wire create/edit/delete into the Dashboard and empty state
  - [x] 9.1 Extend `components/Dashboard.tsx` with overlay state and entry points
    - Add `DashboardOverlay` state (`closed | create | edit | delete`); add a "New deck" header entry point
    - Render `DeckForm` for create/edit and `DeleteConfirm` for delete; delete confirm calls `deleteDeck(deck.id)`
    - Render each `DeckCard` with `DeckCardActions` wired to the overlay openers; preserve the existing error/empty/listing branches
    - _Requirements: 1.1, 1.6, 2.1, 2.6, 3.1, 3.4, 3.7_

  - [x] 9.2 Wire `EmptyState` "Create deck" to open the form
    - Add an `onCreate` callback prop and wire the existing "Create deck" button to it so it opens the form in create mode; leave "Import deck" as a stub
    - _Requirements: 1.1_

  - [x] 9.3 Write unit tests for the Dashboard wiring
    - Create entry point and `EmptyState` "Create deck" open the form (1.1); a newly added deck renders as a `DeckCard` (1.6); an edited deck shows updated name/description (2.6); a deleted deck no longer renders (3.4); cancelling delete leaves the listing unchanged (3.7)
    - _Requirements: 1.1, 1.6, 2.6, 3.4, 3.7_

- [x] 10. Final checkpoint - Ensure the feature is wired and verified
  - [x] 10.1 Confirm `app/page.tsx` renders the wired Dashboard and run full verification
    - Ensure `app/page.tsx` mounts the updated Dashboard under `DecksProvider` (adjust only if needed)
    - Run `npm run lint`, `tsc` (type check), and `npm run test` (Vitest single run) and fix any failures
    - _Requirements: 1.6, 2.6, 3.4, 5.1_

## Notes

- Tasks marked with `*` are optional (tests) and can be skipped for a faster MVP, but they
  carry the correctness guarantees for this slice.
- Each task references specific requirements for traceability; property test sub-tasks
  reference the design's numbered correctness properties.
- Property tests carry input-coverage burden (append / preservation / idempotence /
  round-trip / rejection); unit tests stay focused on concrete examples, component wiring,
  and accessibility/focus behavior.
- `lib/storage.ts` is intentionally unchanged; only its test is extended.
- Checkpoints ensure incremental validation before building further.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["3.3", "3.4", "3.5", "3.6", "3.7", "5.1", "6.1", "7.1", "8.1"] },
    { "id": 5, "tasks": ["6.2", "7.2", "9.1", "9.2"] },
    { "id": 6, "tasks": ["9.3", "10.1"] }
  ]
}
```
