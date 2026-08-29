# Implementation Plan: Polish, Responsiveness & End-to-End Wiring

## Overview

This is the sixth and final vertical slice (6/6): a hardening and polish pass
that introduces **no new domain logic**. The plan converts the design into
incremental coding steps that build shared presentational primitives first,
apply the single status-gating pattern (`resolvePhase`), complete the
already-designed import wiring, wire the existing `ExportControl` into the
remaining surfaces, refactor the three screens onto the shared primitives, then
finish with a responsive/palette pass and a clean quality gate.

Some pieces the design describes as "not yet implemented" already exist in the
tree and diverge from the design text:

- `contexts/DecksContext.tsx` already exposes `replaceDeck(deck: Deck): ReplaceDeckResult`
  (the design's `replaceDeck(id, deck)` signature is stale) — Task 2 verifies
  and hardens it rather than adding it from scratch.
- `components/ImportControl.tsx` already exists (with a duplicate-resolution
  modal) and is already wired into `components/Dashboard.tsx` for both the empty
  and non-empty states — Task 3 removes the remaining dead `Import deck` stub
  button inside `components/EmptyState.tsx` and locks in success/failure tests.
- `components/ExportControl.tsx` already exists and is already wired into the
  deck detail header — Task 4 wires it into the review completion summary.

All code is TypeScript/React (App Router). Tests use Vitest + Testing Library +
fast-check, colocated with the code under test. Shared arbitraries live in
`@/test/arbitraries` (`arbDeck`, `arbPathname`, `arbGarbageStorage`,
`arbDeckList` are reused directly).

## Tasks

- [x] 1. Build shared presentational primitives (phase helper + state/nav components)
  - [x] 1.1 Implement `resolvePhase` status-gating helper
    - Create `contexts/useStorePhase.ts` (colocated with the store) exporting the
      `StorePhase` union (`"loading" | "error" | "empty" | "content"`), the
      `PhaseInput` interface (`{ status: DecksStatus; hasError: boolean; isEmpty: boolean }`),
      and the pure `resolvePhase(input)` function with fixed precedence
      loading (`status === "initial"`) → error → empty → content
    - Reuse the existing `DecksStatus` type from `@/contexts/DecksContext`
    - _Requirements: 2.1, 2.2, 2.3, 3.5, 4.1_

  - [x]* 1.2 Write property test for `resolvePhase` exactly-one-phase
    - Add `contexts/useStorePhase.property.test.ts`
    - **Property 1: Status gating yields exactly one phase** — for all
      `(status, hasError, isEmpty)` triples, `resolvePhase` returns exactly one
      phase following the fixed precedence; `empty` is reachable only when
      `status` is `ready`; no two phases are simultaneously selected
    - Generate `status` from `fc.constantFrom("initial", "ready", "error")` and
      `hasError`/`isEmpty` from `fc.boolean()`; minimum 100 iterations
    - Tag: `Feature: polish-responsiveness-e2e-wiring, Property 1`
    - **Validates: Requirements 2.1, 2.2, 2.3, 3.5, 4.1**

  - [x] 1.3 Implement `LoadingState` shared component
    - Create `components/LoadingState.tsx` as a Server Component with
      `interface LoadingStateProps { label?: string }` (default `"Loading…"`),
      a centered indication, `role="status"` and `aria-live="polite"`, AWS
      palette tokens only
    - _Requirements: 2.1, 2.2, 2.3_

  - [x]* 1.4 Write unit tests for `LoadingState`
    - Add `components/LoadingState.test.tsx`: renders default and custom label,
      exposes `role="status"`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.5 Implement `ErrorState` shared component
    - Create `components/ErrorState.tsx` as a Server Component with
      `interface ErrorStateProps { message: string; title?: string; action?: React.ReactNode }`,
      wrapping element `role="alert"`, text-based failure conveyance paired with
      the `aws-error` accent (never color alone), optional `action` slot
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 7.4, 1.9_

  - [x]* 1.6 Write unit tests for `ErrorState`
    - Add `components/ErrorState.test.tsx`: renders `role="alert"`, non-empty
      message text, default/custom title, and the optional `action` slot
    - _Requirements: 4.6, 1.9_

  - [x] 1.7 Implement `BackLink` shared navigation component
    - Create `components/BackLink.tsx` wrapping `next/link` with
      `interface BackLinkProps { href: string; children: React.ReactNode; variant?: "primary" | "secondary" }`
      (`secondary`/`aws-blue` default, `primary`/`aws-orange` accent), keyboard-
      focusable, AWS palette tokens only
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.9_

  - [x]* 1.8 Write unit tests for `BackLink`
    - Add `components/BackLink.test.tsx`: renders an anchor with the given
      `href` and children, and applies variant styling
    - _Requirements: 1.3, 1.5_

  - [x]* 1.9 Add property test for `NavLinks` active-state tracking
    - Extend `components/NavLinks.test.tsx`
    - **Property 2: Navigation active state tracks the current path** — for all
      pathnames, a destination carries `aria-current="page"` plus the persistent
      non-color indicator (bold weight + bottom border) iff its `href` equals the
      current pathname; when none match, none is active
    - Use existing `arbPathname` from `@/test/arbitraries`, mock
      `next/navigation` `usePathname`; minimum 100 iterations
    - Tag: `Feature: polish-responsiveness-e2e-wiring, Property 2`
    - **Validates: Requirements 1.2**

- [x] 2. Harden the `replaceDeck` store method for import duplicate resolution
  - [x] 2.1 Verify and normalize `replaceDeck` in `contexts/DecksContext.tsx`
    - Confirm `replaceDeck(deck: Deck): ReplaceDeckResult` replaces by id via the
      existing immutable-update + persistence path, returns
      `{ ok: true, deck }` on match and `{ ok: false, error: { code: "not-found" } }`
      otherwise; align any doc comments with the actual `(deck)` signature
    - No new domain logic — reuse the existing mutator/persistence pattern
    - _Requirements: 10.1, 10.6_

  - [x]* 2.2 Write unit tests for `replaceDeck`
    - Add `contexts/DecksContext.replace-deck.test.tsx`: replacing an existing id
      swaps the deck and persists; replacing an unknown id returns `not-found`
      and leaves the list unchanged
    - _Requirements: 10.1, 10.6_

- [x] 3. Complete the import flow and remove the dead `EmptyState` stub
  - [x] 3.1 Remove the dead "Import deck" stub button from `components/EmptyState.tsx`
    - Delete the non-wired `Import deck` `<button>` (the working `ImportControl`
      already renders above `EmptyState` on the Dashboard); update the component
      doc comment to drop the stub description
    - Keep the keyboard-focusable "Create deck" control
    - _Requirements: 3.1, 9.3, 9.4_

  - [x]* 3.2 Update/confirm `EmptyState` tests after stub removal
    - Update `components/EmptyState.tsx`'s colocated expectations (in the
      Dashboard empty-state tests) to assert the create control is present and
      the dead stub button is gone
    - _Requirements: 3.1, 9.4_

  - [x]* 3.3 Confirm import success/failure flow tests
    - Ensure `components/ImportControl.test.tsx` covers a valid file adding a deck
      (success) and an invalid/unparseable file surfacing an inline `ErrorState`
      with the store left unchanged (failure)
    - _Requirements: 10.1, 4.5, 10.2_

  - [x]* 3.4 Write property test for invalid-import rejection
    - Add `components/ImportControl.property.test.tsx`
    - **Property 4: Invalid import input is rejected without mutating the store**
      — for all unreadable/unparseable/structurally-invalid contents, `parseDeck`
      returns not-ok, the flow surfaces an `ErrorState`, and the deck list is
      unchanged
    - Use existing `arbGarbageStorage` from `@/test/arbitraries`; minimum 100
      iterations
    - Tag: `Feature: polish-responsiveness-e2e-wiring, Property 4`
    - **Validates: Requirements 4.5, 10.2**

- [x] 4. Wire `ExportControl` into the review completion summary
  - [x] 4.1 Render the post-review export reminder in `app/deck/[id]/review/page.tsx`
    - In the completion-summary branch, render `ExportControl` for the reviewed
      deck as an export reminder only when at least one card was graded
      (`correctCount + incorrectCount > 0`); omit it when zero were graded
    - An export failure surfaces `ExportControl`'s existing inline error and
      leaves review state unchanged (no new error path)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x]* 4.2 Write unit tests for the export reminder presence/absence
    - Add `app/deck/[id]/review/export-reminder.test.tsx`: reminder present after
      ≥1 graded card, absent when zero graded
    - _Requirements: 5.1, 5.3_

  - [ ]* 4.3 Add/extend the export→import round-trip property test
    - Extend `lib/deckIO.test.ts` (or `lib/deckIO.property.test.ts`) round-trip
    - **Property 6: Export → import round-trip preserves the deck** — for all
      valid decks, `serializeDeck` then `parseDeck` yields an ok result whose deck
      has the same card count and card contents as the original
    - Use existing `arbDeck` from `@/test/arbitraries`; minimum 100 iterations
    - Tag: `Feature: polish-responsiveness-e2e-wiring, Property 6`
    - **Validates: Requirements 5.2, 10.6**

- [x] 5. Refactor `Dashboard` onto the shared phase + state components
  - [x] 5.1 Apply `resolvePhase` and shared components in `components/Dashboard.tsx`
    - Replace the inline `status === "error"` / `decks.length === 0` branches with
      `resolvePhase({ status, hasError: status === "error", isEmpty: decks.length === 0 })`
      and render `LoadingState` (while `"initial"`), `ErrorState`, `EmptyState`, or
      the listing accordingly — no longer render the listing during `"initial"`
    - Keep the existing `ImportControl` header entry point on the listing view
    - _Requirements: 2.1, 2.4, 3.5, 4.1_

  - [x]* 5.2 Update affected Dashboard tests for the new loading phase
    - Update `components/Dashboard.transitions.test.tsx` and
      `components/Dashboard.wiring.test.tsx` to assert `LoadingState` renders
      during `"initial"` (instead of an empty listing) and that error/empty/
      content phases are mutually exclusive
    - _Requirements: 2.1, 2.4, 3.5, 4.1_

- [x] 6. Refactor `Deck_Detail_View` (`app/deck/[id]/page.tsx`)
  - [x] 6.1 Route detail rendering through the shared phase and add navigation
    - Resolve the deck by id; fold not-found into `hasError` and zero-cards into
      `isEmpty`, then render `LoadingState` / `ErrorState` (with a "Back to
      Dashboard" `action`) / empty-state / content via `resolvePhase`
    - Add a `BackLink` to the Dashboard (`/`) and a "Start review" control
      (`/deck/[id]/review`, primary variant) in the header; keep the wired
      `ExportControl` and the empty-state "Add card" control
    - Use `LoadingState`/`ErrorState`/`BackLink` shared components (no bespoke
      inline blocks)
    - _Requirements: 1.3, 1.4, 1.9, 2.2, 2.5, 3.2, 4.2_

  - [x]* 6.2 Write unit tests for deck-detail navigation and states
    - Update `app/deck/[id]/page.test.tsx`: loading phase while `"initial"`;
      not-found renders `ErrorState` + Back-to-Dashboard; "Start review" and
      "Back to Dashboard" links target the correct hrefs; empty deck renders the
      empty state with a focusable add-card control
    - _Requirements: 1.3, 1.4, 1.9, 2.2, 3.2, 4.2_

- [x] 7. Refactor `Review_View` (`app/deck/[id]/review/page.tsx`)
  - [x] 7.1 Move review-session initialization into a mount-gated effect
    - Replace the render-time `setReviewState(...)` block with a mount-gated
      `useEffect` (or lazy derivation) so no state is written during the first
      render; render `LoadingState` while `status === "initial"`/pre-mount so
      server and first-client markup match
    - _Requirements: 2.3, 8.1, 8.2, 8.3_

  - [ ]* 7.2 Add property test for first-render hydration determinism
    - Reuse/extend `contexts/DecksContext.hydration-determinism.test.tsx`
    - **Property 5: First render is a deterministic empty seed** — for all
      persisted deck-list contents, the initial pre-mount render matches rendering
      with the empty seed (no read during first render), so markup matches and no
      hydration warning is emitted
    - Use existing `arbDeckList` from `@/test/arbitraries`; minimum 100 iterations
    - Tag: `Feature: polish-responsiveness-e2e-wiring, Property 5`
    - **Validates: Requirements 8.1, 8.2**

  - [x] 7.3 Route not-found and loading through the shared phase; add "Back to deck"
    - Render `LoadingState` (loading) and `ErrorState` + Back-to-Dashboard
      `action` (deck not found via `hasError`) through the shared primitives;
      keep the "no cards due" empty view with a `BackLink` to `/deck/[id]`
    - _Requirements: 2.3, 3.3, 4.3, 1.5, 1.9_

  - [x] 7.4 Replace both `alert()` calls with an in-view `ErrorState`
    - Add local `gradeError: string | null`; on a not-ok grade result set
      `gradeError` and render `ErrorState` inside the active-session view, and do
      **not** advance `currentCardIndex` or change `correctCount`/`incorrectCount`;
      remove both `alert(...)` calls and the console error path
    - _Requirements: 4.4_

  - [ ]* 7.5 Write property test for failed-grade non-advance
    - Add `app/deck/[id]/review/grade-failure.property.test.tsx`
    - **Property 3: A failed grade never advances the review session** — for all
      session sizes/positions, when grade returns not-ok, an in-app `role="alert"`
      renders (no browser dialog) and the current index and counts are unchanged
    - Generate session sizes/positions and stub the store's
      `gradeCardCorrect`/`gradeCardIncorrect` to force a not-ok result; minimum
      100 iterations
    - Tag: `Feature: polish-responsiveness-e2e-wiring, Property 3`
    - **Validates: Requirements 4.4**

  - [x] 7.6 Finalize the completion summary navigation
    - Ensure the completion summary presents a "Back to Dashboard" `BackLink`
      (`/`) alongside the Task 4 export reminder; align control labels/targets
      with the design (replace the ambiguous "Review more decks" link semantics)
    - _Requirements: 1.6, 5.1_

  - [ ]* 7.7 Write unit tests for review states and completion summary
    - Update the review page tests: loading, not-found (+Back), no-cards-due
      (+Back to deck), completion summary reports reviewed count and shows Back to
      Dashboard; grade failure shows in-view error and does not advance
    - _Requirements: 1.5, 1.6, 2.3, 3.3, 4.3, 4.4, 10.5_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Responsive and AWS-palette pass across screens
  - [x] 9.1 Apply mobile-first responsive layout and palette discipline
    - Across `components/Dashboard.tsx`, `app/deck/[id]/page.tsx`,
      `app/deck/[id]/review/page.tsx`: author base single-column styles and layer
      `sm:`/`md:`/`lg:` prefixes; cap content with `max-w-*` and center it so no
      horizontal scroll appears at any width; keep listings on
      `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
    - Use only `theme.extend.colors.aws` tokens (no hardcoded hex); reserve
      `aws-orange` as an accent/CTA (never a large-area background fill); pair any
      semantic color with a text label or icon
    - Confirm `components/AppHeader.tsx` keeps `sticky top-0 z-10`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.3, 7.4, 1.7, 1.8_

  - [ ]* 9.2 Add class/token assertions for responsive and palette conventions
    - Add lightweight assertions (in the relevant screen tests) that key
      containers carry the mobile-first grid/`max-w-*` classes and the header is
      sticky; note contrast/true-layout checks require a manual breakpoint pass
    - _Requirements: 6.4, 6.5, 7.1_

- [x] 10. Cleanup and quality gate
  - [x] 10.1 Remove orphaned scaffolding and unreferenced modules
    - Sweep `components/`, `lib/`, `contexts/` for exports with zero importers
      and remove dead code; confirm no dev-only placeholder scaffolding remains in
      `app/page.tsx`; ensure any inline ESLint disable carries a justification
      comment
    - _Requirements: 9.3, 9.4, 9.5_

  - [x] 10.2 Ensure `npm run lint` and `npm run build` pass with no hydration warnings
    - Run `npm run lint` and `npm run build` to a clean exit; verify no hydration
      warnings are emitted from the localStorage-backed client pages
    - _Requirements: 9.1, 9.2, 8.2_

- [x] 11. End-to-end integration test (import → detail → review → export)
  - [x]* 11.1 Write the end-to-end round-trip integration test
    - Extend `components/ImportExport.integration.test.tsx` (or add
      `app/e2e-round-trip.integration.test.tsx`): import a valid deck from the
      Dashboard (appears in listing with title + card count), navigate to detail
      (cards in same count/order), start and grade the due cards to the completion
      summary (reports reviewed count), export the reviewed deck, and re-import the
      exported JSON without an `ErrorState` yielding the same card count/contents
    - _Requirements: 10.1, 10.3, 10.5, 10.6_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a
  faster MVP; the model MUST NOT implement `*` sub-tasks and MUST implement
  non-`*` sub-tasks.
- Each task references specific requirements clauses for traceability.
- Property tests validate the six universal correctness properties from the
  design; each is a single fast-check test running a minimum of 100 iterations,
  tagged `Feature: polish-responsiveness-e2e-wiring, Property {n}`.
- Unit/example tests validate the many presence/navigation/wiring criteria that
  are not universal properties.
- Several design "to build" items already exist in the tree (`replaceDeck`,
  `ImportControl`, `ExportControl` wiring); those tasks verify/harden/finish the
  wiring rather than building from scratch, per the current codebase state.
- Contrast ratios (1.7, 3.4, 7.2), true responsive layout / no-horizontal-scroll
  (6.1–6.5), and palette-token discipline (7.1, 7.3) are verified by class/token
  assertions plus a manual pass at mobile/tablet/desktop, since jsdom cannot
  measure layout or contrast.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "1.5", "1.7", "2.1", "3.1", "4.3"] },
    { "id": 1, "tasks": ["1.2", "1.4", "1.6", "1.8", "1.9", "2.2", "3.2", "3.3", "3.4", "4.1"] },
    { "id": 2, "tasks": ["4.2", "5.1", "6.1", "7.1", "7.3", "7.4"] },
    { "id": 3, "tasks": ["5.2", "6.2", "7.2", "7.5", "7.6"] },
    { "id": 4, "tasks": ["7.7", "9.1"] },
    { "id": 5, "tasks": ["9.2", "10.1"] },
    { "id": 6, "tasks": ["10.2"] },
    { "id": 7, "tasks": ["11.1"] }
  ]
}
```
