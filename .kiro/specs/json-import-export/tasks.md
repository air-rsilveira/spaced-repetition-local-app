# Tasks: JSON Import/Export Implementation

## Task 1: Implement `lib/deckIO.ts` — Pure Serialize/Parse Helpers

Create the core pure functions for serializing and parsing decks without side effects.

### Acceptance Criteria
- [x] `serializeDeck(deck: Deck): string` exports a deck to human-readable JSON
- [x] `parseDeck(jsonString: string): Result<Deck, string>` parses and validates JSON
- [x] Distinguishes between parse errors and validation errors with clear messages
- [x] Round-trip test passes: `parseDeck(serializeDeck(deck))` produces equivalent deck
- [x] All unit tests pass

### Files to Create
- `lib/deckIO.ts` — Serialize/parse functions

### Files to Read (for context)
- `types/deck.ts` — To see `deckSchema`, `Deck`, `Card` types

### Implementation Notes
- Use `JSON.stringify(..., null, 2)` for readable output
- Use `deckSchema.safeParse()` for validation without throwing
- Return discriminated union result type `{ ok: true; data: Deck } | { ok: false; error: string }`

---

## Task 2: Write Unit Tests for `lib/deckIO.ts`

Test serialize and parse functions thoroughly, including round-trip and error cases.

### Acceptance Criteria
- [x] Serialize produces valid JSON with all deck and card fields
- [x] Parse succeeds on valid JSON and produced decks match schema
- [x] Parse fails gracefully on invalid JSON with clear error
- [x] Parse fails gracefully on invalid schema with clear error
- [x] Round-trip (serialize → parse) produces deck equivalent to original
- [x] All tests pass

### Files to Create
- `lib/deckIO.test.ts` — Unit tests

### Implementation Notes
- Use Vitest with `jsdom` environment
- Test both success and failure paths
- Use mock data from `/mocks` or create fixtures
- Include edge cases (empty deck, many cards, special characters in text)

---

## Task 3: Implement `components/ExportControl.tsx`

Create the export UI component that serializes a deck and triggers download.

### Acceptance Criteria
- [x] Renders an export button or icon
- [x] On click, serializes deck to JSON using `deckIO.serializeDeck`
- [x] Creates a Blob and object URL
- [x] Triggers download with filename `<deck-id>.json`
- [x] Revokes object URL after download initiated
- [x] Handles errors gracefully (displays error message)
- [x] Props accept `deck: Deck` and optional callbacks

### Files to Create
- `components/ExportControl.tsx` — Export UI component

### Files to Read (for context)
- `components/AppHeader.tsx` — To see header styling patterns
- `components/CardItemActions.tsx` — To see action button patterns

### Implementation Notes
- Use Tailwind classes from AWS palette (`bg-aws-blue`, etc.)
- Consider icon (download icon from lucide-react if available, else text button)
- Disable button during export (optional UX)
- Display error in inline message or toast

---

## Task 4: Write Unit Tests for `components/ExportControl.tsx`

Test export button, serialization, download, and error handling.

### Acceptance Criteria
- [x] Button renders with correct label/icon
- [x] On click, calls `serializeDeck` with correct deck
- [x] Creates Blob with JSON content
- [x] Creates and revokes object URL (check via spies)
- [x] Triggers download with correct filename
- [x] Error message displays on failure
- [ ] All tests pass

### Files to Create
- `components/ExportControl.test.tsx` — Unit tests

### Implementation Notes
- Mock `deckIO.serializeDeck`
- Spy on `URL.createObjectURL` and `URL.revokeObjectURL`
- Mock browser download behavior
- Use `@testing-library/react` and `@testing-library/jest-dom`

---

## Task 5: Implement `components/ImportControl.tsx` with Duplicate Modal

Create the import UI component that accepts a file, validates, and handles duplicate IDs.

### Acceptance Criteria
- [x] File input accepts `.json` files only
- [x] On file selection, reads file contents
- [x] Validates file using `deckIO.parseDeck`
- [x] On validation success + new ID: adds deck to store immediately
- [x] On validation success + duplicate ID: shows modal with replace/new-id options
- [x] Modal: replace action calls `replaceDeck` (or similar)
- [x] Modal: new-id generates unique ID and calls `addDeck`
- [x] Modal: cancel leaves store unchanged
- [x] On validation failure: displays error, store unchanged
- [x] On file read failure: displays error, store unchanged
- [x] After successful import: error cleared, file input reset
- [x] All errors handled without throwing

### Files to Create
- `components/ImportControl.tsx` — Import UI with modal

### Files to Read (for context)
- `types/deck.ts` — Deck type
- `contexts/DecksContext.tsx` — To understand `useDecks()` API
- `components/DeleteConfirm.tsx` — To see modal/dialog patterns
- `components/DeckForm.tsx` — To see form pattern

### Implementation Notes
- Use `FileReader` API for file reading
- Filter file input to `.json` only via `accept` attribute
- Show duplicate modal using existing pattern (or create simple modal)
- Generate unique new ID as `${deckId}-import-${Date.now()}`
- Display errors inline or as toast
- Clear error after 5 seconds (optional) or on next import

---

## Task 6: Write Unit Tests for `components/ImportControl.tsx`

Test file input, parsing, validation, duplicate modal, and store interaction.

### Acceptance Criteria
- [x] File input renders and accepts `.json` files
- [x] Valid file: parses, validates, calls `addDeck` with correct deck
- [x] Invalid JSON file: displays error, store unchanged
- [x] Invalid schema file: displays error, store unchanged
- [x] File read error: displays error, store unchanged
- [x] Duplicate ID: shows modal with correct deck info
- [x] Modal replace: calls `replaceDeck` with correct deck
- [x] Modal new-id: calls `addDeck` with new unique ID
- [x] Modal cancel: leaves store unchanged, closes modal
- [ ] After successful import: error cleared, file input reset
- [ ] All tests pass

### Files to Create
- `components/ImportControl.test.tsx` — Unit tests

### Implementation Notes
- Mock `useDecks` hook
- Mock `deckIO.parseDeck`
- Create test file fixtures for valid/invalid JSON
- Use `userEvent` for file input interaction
- Check that store methods called with correct arguments

---

## Task 7: Update `contexts/DecksContext.tsx` — Add `replaceDeck` Method

Add or verify `replaceDeck` method for duplicate resolution.

### Acceptance Criteria
- [x] `replaceDeck(id: string, newDeck: Deck): void` method exists
- [x] Replaces deck with same ID in store
- [x] Persists change to storage
- [x] Returns without throwing on error

### Files to Read (for context)
- `contexts/DecksContext.tsx` — Current implementation

### Implementation Notes
- Reuse existing `addDeck` + delete pattern if simpler
- Or update deck in-place if structure supports it
- Ensure persistence through Storage_Seam

---

## Task 8: Wire ExportControl into Dashboard

Add export action to each deck in the dashboard listing.

### Acceptance Criteria
- [x] Dashboard renders `ExportControl` for each deck
- [x] Export action is accessible and properly styled
- [x] Export works as expected (download triggered)

### Files to Read (for context)
- `components/Dashboard.tsx` — Current dashboard structure
- `components/DeckCard.tsx` — Deck card display

### Implementation Notes
- Add `ExportControl` to deck card actions (next to delete button)
- Or add as menu item in existing actions dropdown
- Follow existing styling and layout patterns

---

## Task 9: Wire ImportControl into Dashboard

Add import UI to dashboard (top or dedicated section).

### Acceptance Criteria
- [x] Dashboard renders `ImportControl` component
- [x] `ImportControl` is visible even when deck listing is empty
- [x] Import works as expected (file read, validation, merge)

### Files to Read (for context)
- `components/Dashboard.tsx` — Current dashboard structure
- `components/EmptyState.tsx` — Empty state handling

### Implementation Notes
- Place at top of dashboard or in dedicated import section
- Ensure visible on empty state
- Style to match dashboard aesthetic

---

## Task 10: Wire ExportControl into Deck Detail Page

Add export action to the deck detail view header.

### Acceptance Criteria
- [x] Deck detail page renders `ExportControl` for displayed deck
- [ ] Export action is accessible and properly styled
- [x] Export works as expected

### Files to Read (for context)
- `app/deck/[id]/page.tsx` — Deck detail page
- `components/AppHeader.tsx` — Header styling

### Implementation Notes
- Add export button to header (near deck name)
- Icon button or secondary button style
- Follow existing header layout

---

## Task 11: Integration Test — Export and Import Workflow

Write integration test covering the full export → import roundtrip.

### Acceptance Criteria
- [~] Export deck from dashboard
- [~] Import exported file
- [~] Imported deck matches original
- [~] No duplicate ID conflicts (or user resolves them)
- [~] Test passes

### Files to Create
- New test file or add to existing integration test suite

### Implementation Notes
- May be added to `components/Dashboard.integration.test.tsx` or similar
- Mock file system (or use in-memory Blob/File)
- Verify deck fields match after round-trip

---

## Task 12: Property-Based Test — Round-Trip Integrity

Write property-based test to verify all valid decks round-trip correctly.

### Acceptance Criteria
- [~] For all generated valid decks: `parseDeck(serializeDeck(deck))` produces equivalent deck
- [~] Test covers multiple iterations (e.g., 100+ examples)
- [ ] Test passes

### Files to Create
- `lib/deckIO.property.test.ts` or add to `lib/deckIO.test.ts`

### Implementation Notes
- Use `fast-check` with deck arbitraries from `/test`
- Or create simple arbitraries for `Deck` and `Card`
- Run with sufficient iterations to cover edge cases

---

## Task 13: Manual Testing — Import/Export on Dashboard

Verify import/export UI works end-to-end on the dashboard and deck detail pages.

### Acceptance Criteria
- [~] Export button visible on each deck card and deck detail page
- [~] Clicking export downloads `.json` file with correct name
- [~] Downloaded file contains valid JSON and can be re-imported
- [~] Import control visible on dashboard
- [~] File input accepts `.json` files
- [~] Importing valid file adds deck to listing
- [~] Importing invalid file displays error message
- [~] Duplicate ID resolution works (replace and new-id paths)
- [~] Feature works on mobile, tablet, and desktop widths

### Implementation Notes
- Test in browser dev tools or physical devices
- Verify no console errors
- Check responsiveness with Tailwind breakpoints

---

## Task 14: Accessibility Review

Verify import/export UI is accessible.

### Acceptance Criteria
- [~] Export button has accessible label or icon with `aria-label`
- [~] File input has associated label
- [~] Error messages are announced to screen readers
- [~] Modal has proper ARIA attributes (role, aria-labelledby, etc.)
- [~] Keyboard navigation works (Tab through controls, Enter to confirm)

### Implementation Notes
- Test with screen reader if available
- Use semantic HTML (button, input, label, dialog)
- Add ARIA attributes where needed for custom components

---

## Task 15: Documentation and Handoff

Document the feature and prepare for handoff/deployment.

### Acceptance Criteria
- [~] Feature is complete and all tests pass
- [~] README or inline documentation explains how to use import/export
- [~] Code comments explain key logic
- [~] No outstanding bugs or TODOs

### Implementation Notes
- Update component README if applicable
- Add comments to tricky logic (e.g., unique ID generation, duplicate modal)
- Verify no console warnings or linting errors
