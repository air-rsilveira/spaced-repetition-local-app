# Design Document: JSON Import/Export

## Overview

This design implements JSON import and export functionality for decks in the spaced repetition application. The feature enables users to export decks as portable `.json` files and import them back, with strict validation at the boundary to ensure data integrity.

## Architecture

### High-Level Flow

1. **Export**: User clicks export on a deck → serialized to JSON → triggered as browser download
2. **Import**: User selects a `.json` file → file read → validated against schema → merged into store (or user resolves duplicate ID)
3. **Validation**: All import boundary validation uses the canonical `deckSchema` from `@/types`
4. **Storage**: Imported decks are persisted through the existing `Storage_Seam` (localStorage)

### Core Modules

#### 1. `lib/deckIO.ts` — Pure Serialize/Parse Helpers

**Responsibility**: Provide side-effect-free functions for serializing and parsing decks.

**Exports**:
- `serializeDeck(deck: Deck): string` — Converts a `Deck` to JSON string
- `parseDeck(jsonString: string): Result<Deck, ParseError>` — Parses and validates JSON against `deckSchema`
  - Returns `{ ok: true, data: Deck }` on success
  - Returns `{ ok: false, error: string }` on parse/validation failure

**Implementation Details**:
- `serializeDeck` uses `JSON.stringify` with proper spacing for human readability
- `parseDeck` uses `JSON.parse` with try/catch, then validates with `deckSchema.safeParse()`
- Distinguishes between parse errors (unparseable JSON) and validation errors (invalid schema)

#### 2. `components/ExportControl.tsx` — Export UI

**Responsibility**: Serialize a deck and trigger a download.

**Props**:
- `deck: Deck` — The deck to export
- `onExportStart?` — Optional callback when export begins
- `onExportEnd?` — Optional callback when export completes

**Behavior**:
1. Serialize the deck using `serializeDeck`
2. Create a Blob and object URL
3. Trigger a download with filename `<deck-id>.json`
4. Revoke the object URL after download is initiated
5. Handle errors gracefully (display toast/error message)

**Placement**: 
- Rendered in Dashboard for each deck card
- Rendered in deck detail page header

#### 3. `components/ImportControl.tsx` — Import UI

**Responsibility**: Accept a file, validate it, resolve duplicates, and merge into store.

**State**:
- File input reference
- Error message (if validation/read fails)
- Pending duplicate ID resolution (shows modal with replace/new-id options)
- Import in progress flag (optional, for UX feedback)

**Behavior**:
1. File input accepts `.json` files only
2. On file selection:
   - Read file contents using FileReader API
   - Parse and validate using `parseDeck`
   - If validation fails: display `Import_Error`, leave store unchanged
   - If validation succeeds but ID exists: show duplicate modal
   - If validation succeeds and ID is new: add to store immediately
3. On duplicate resolution:
   - Replace: replace existing deck with imported deck
   - New ID: generate new unique ID (e.g., `${deck.id}-import-${timestamp}`), add to store
4. After successful import: clear error, reset file input
5. Handle all errors without throwing

**Duplicate Modal Subcomponent**:
- Show deck name and ID of both existing and imported decks
- Offer two buttons: "Replace" and "Import as New"
- Show cancel option
- Auto-dismiss on selection

#### 4. `contexts/DecksContext.tsx` — Store Integration

**New Method** (if not already present):
- `replaceDeck(id: string, deck: Deck): void` — Replace existing deck with same ID
- Update persists to `Storage_Seam`

**Existing Methods** (reused):
- `addDeck(deck: Deck): void` — Add imported deck (new ID)

### UI Integration

#### Dashboard

**Changes**:
1. Add `ImportControl` component at the top or in a dedicated section
2. For each deck in the listing, render an export action (button or menu item)
3. If deck listing is empty, ensure `ImportControl` is still visible so users can import first

**Layout**:
- Import section: "Import a deck" heading with file input
- Deck cards: export action as icon button or dropdown menu

#### Deck Detail Page

**Changes**:
1. Add export action to the deck header (near the deck name)
2. Export button is prominent but not dominant (icon button or secondary button)

### Error Handling

**Import Errors** (user-facing):
- "Could not read the file. Please try again."
- "The file is not valid JSON. Please check the file and try again."
- "The file does not match the expected format. Please export a deck and try again."
- "The file could not be processed. Please try again."

**Export Errors** (user-facing, rare):
- "Export failed. Please try again."

**All errors**:
- Displayed as inline messages or toast notifications
- Do not crash the app or corrupt store
- Store state remains unchanged on error

### Validation & Safety

**Boundary Validation**:
- All imported JSON is validated against `deckSchema` before touching the store
- Malformed files fail at the boundary with a clear message
- No partial/incomplete decks enter the store

**Round-Trip Integrity**:
- Export serializes all deck and card fields
- Import validates against the canonical schema
- Re-import of exported file produces equivalent deck (same fields, same values)
- Property-based test: for all valid decks, export → import → export produces identical JSON

**Duplicate Handling**:
- Explicit user choice (replace vs. new ID)
- No silent overwrites
- User can inspect both decks before deciding

### Data Structures

#### Import Result

```typescript
type Result<T, E> = 
  | { ok: true; data: T }
  | { ok: false; error: E };

type ParseError = string; // Human-readable message
```

#### Duplicate Resolution

```typescript
interface DuplicateResolution {
  action: 'replace' | 'new-id' | 'cancel';
  importedDeck: Deck;
  existingDeck?: Deck; // Present if action is 'replace' or cancel
}
```

## Testing Strategy

### Unit Tests

**deckIO.ts**:
- `serializeDeck`: Deck → JSON string, all fields present
- `parseDeck`: Valid JSON → `{ ok: true, data }`, fields match original
- `parseDeck`: Invalid JSON → `{ ok: false, error }` with parse message
- `parseDeck`: Valid JSON, invalid schema → `{ ok: false, error }` with validation message
- Round-trip: serialize then parse produces equivalent deck

**ExportControl.tsx**:
- Renders export button
- On click, serializes deck correctly
- Triggers download with correct filename
- Revokes object URL (check spy on `createObjectURL`/`revokeObjectURL`)
- Error display on serialization failure

**ImportControl.tsx**:
- File input renders and accepts `.json` files
- On valid file: parses, validates, calls `addDeck`
- On invalid file: displays error, store unchanged
- On duplicate ID: shows modal with correct deck info
- Modal: replace action calls `replaceDeck`, new-id generates unique ID and calls `addDeck`
- Modal: cancel leaves store unchanged, hides modal
- After successful import: error cleared, file input reset

### Integration Tests

- Export from Dashboard → file downloaded
- Import from Dashboard → deck added, displayed in listing
- Export deck detail → file downloaded
- Duplicate resolution → user chooses replace → store updated with imported deck
- Duplicate resolution → user chooses new ID → both decks in store with different IDs
- Empty dashboard → import control visible → import deck → deck appears in listing

### Property-Based Tests

- For all valid decks: `parseDeck(serializeDeck(deck))` produces equivalent deck

## Implementation Order

1. **Implement `deckIO.ts`** with serialize and parse functions
2. **Implement `ExportControl.tsx`** and wire to Dashboard and deck detail
3. **Implement `ImportControl.tsx`** with duplicate modal
4. **Wire store integration** (`replaceDeck` method if needed)
5. **Update Dashboard layout** to include import/export UI
6. **Update deck detail page** to include export
7. **Write and run tests** (unit, integration, property-based)

## Success Criteria

- User can export a deck as a `.json` file
- User can import a `.json` file, with validation feedback
- Exported deck can be re-imported cleanly (round-trip)
- Duplicate IDs are handled explicitly (replace or new ID)
- Invalid files fail gracefully with clear messages
- All tests pass (unit, integration, property-based)
- Export/import wired into Dashboard and deck detail
- Feature is accessible and responsive on mobile/tablet/desktop
