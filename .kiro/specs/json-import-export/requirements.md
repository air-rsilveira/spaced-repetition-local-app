# Requirements Document

## Introduction

This feature adds JSON import and export for decks to the local-first spaced
repetition study application. Users export one deck at a time as a downloadable
`.json` file (a durable source of truth they can commit to GitHub) and import a
deck from a `.json` file on disk. All imported file contents are validated
strictly at the boundary against the canonical `Deck` schema before any data
enters the in-memory store, so malformed or invalid files fail gracefully with a
clear message instead of crashing or corrupting state. Exported files match the
canonical schema shape exactly so they re-import cleanly (round-trip).

Import and export are wired to the Dashboard; export is additionally available
from the deck detail view. The feature reuses the existing `deckSchema` /
`cardSchema` and the `Decks_Store` (the `DecksContext` provider) rather than
introducing a separate persistence path.

Traceability: this feature covers Trello requirements R9, R10, R11, R13, R14,
and R16.

## Glossary

- **Deck**: The canonical deck record defined by `deckSchema` in
  `types/deck.ts`, consisting of an `id` (string, 1–100 characters), a `name`
  (string, 1–100 characters), an optional `description` (string, ≤ 500
  characters), a `cards` array (0–1000 `Card` records), and a `createdAt` ISO
  8601 timestamp.
- **Card**: A card record defined by `cardSchema`, consisting of `id`, `front`
  (1–5000 characters), `back` (1–5000 characters), `box` (integer ≥ 1),
  `lastReviewed` (nullable ISO 8601 timestamp), and `createdAt` (ISO 8601
  timestamp).
- **Deck_Schema**: The Zod schema `deckSchema` exported from `@/types`, the
  single source of truth for a valid `Deck` shape used at the import boundary.
- **Decks_Store**: The client-side deck store exposed by the `DecksProvider` /
  `useDecks` hook in `contexts/DecksContext.tsx`, holding the in-memory
  `Deck` list and persisting it via the `Storage_Seam`.
- **Storage_Seam**: The persistence module `lib/storage.ts` that reads and
  writes the deck list to `localStorage` and never throws.
- **Deck_IO**: The pure serialize/parse helper module (`lib/deckIO.ts`)
  providing side-effect-free functions to serialize a `Deck` to a JSON string
  and to parse and validate a JSON string into a `Deck`.
- **Import_Control**: The UI component (`components/ImportControl.tsx`) that
  lets a user select a `.json` file, read it, validate it, and merge the result
  into the `Decks_Store`.
- **Export_Control**: The UI component (`components/ExportControl.tsx`) or
  per-deck action that serializes a single `Deck` and triggers a file download.
- **Import_Error**: A user-facing error surfaced by the `Import_Control` when a
  selected file cannot be read, parsed, or validated, or when a duplicate deck
  identifier is not resolved.
- **Duplicate_Id**: The condition in which the `id` of an imported `Deck`
  matches the `id` of a `Deck` already present in the `Decks_Store`.
- **Round_Trip**: The sequence of exporting a `Deck` to a JSON file and then
  importing that same file, which must reproduce an equivalent `Deck`.

## Requirements

### Requirement 1: Export a single deck as a JSON file

**User Story:** As a user, I want to export one deck as a JSON file, so that I
have a durable, portable copy I can commit to GitHub.

#### Acceptance Criteria

1. WHEN a user activates the export action for a Deck, THE Export_Control SHALL serialize that Deck to a JSON string that conforms to the Deck_Schema.
2. WHEN the Export_Control serializes a Deck, THE Export_Control SHALL include every field of the Deck and its Cards as defined by the Deck_Schema.
3. WHEN a user activates the export action for a Deck, THE Export_Control SHALL trigger a browser download of the serialized Deck.
4. WHEN the Export_Control triggers a download, THE Export_Control SHALL name the downloaded file using the pattern `<deck-id>.json`, where `<deck-id>` is the `id` of the exported Deck.
5. WHEN the Export_Control creates an object URL for a download, THE Export_Control SHALL revoke that object URL after the download has been initiated.

### Requirement 2: Serialize and parse decks through pure helpers

**User Story:** As a developer, I want pure serialize and parse helpers, so that
round-trip logic is unit-testable without the DOM or storage.

#### Acceptance Criteria

1. THE Deck_IO SHALL provide a function that serializes a Deck into a JSON string conforming to the Deck_Schema.
2. THE Deck_IO SHALL provide a function that parses a JSON string and validates the parsed value against the Deck_Schema.
3. WHEN the Deck_IO parses a string that is not valid JSON, THE Deck_IO SHALL return a failure result identifying the input as unparseable.
4. WHEN the Deck_IO parses a JSON value that does not satisfy the Deck_Schema, THE Deck_IO SHALL return a failure result identifying the value as invalid.
5. WHEN the Deck_IO parses a JSON string that satisfies the Deck_Schema, THE Deck_IO SHALL return a success result containing the validated Deck.
6. FOR ALL valid Decks, serializing a Deck with the Deck_IO and then parsing the resulting string with the Deck_IO SHALL produce a Deck equivalent to the original Deck.

### Requirement 3: Import a deck from a JSON file

**User Story:** As a user, I want to import a deck from a JSON file on disk, so
that I can restore or share decks beyond localStorage.

#### Acceptance Criteria

1. THE Import_Control SHALL provide a file input that accepts files with the `.json` extension.
2. WHEN a user selects a file through the Import_Control, THE Import_Control SHALL read the text contents of the selected file.
3. WHEN the Import_Control has read a file's contents, THE Import_Control SHALL validate those contents against the Deck_Schema before modifying the Decks_Store.
4. WHEN a selected file's contents satisfy the Deck_Schema and the Deck identifier is not a Duplicate_Id, THE Import_Control SHALL add the imported Deck to the Decks_Store.
5. WHEN the Import_Control adds an imported Deck to the Decks_Store, THE Decks_Store SHALL persist the updated deck list through the Storage_Seam.
6. WHEN an imported Deck has been added to the Decks_Store, THE Dashboard SHALL display the imported Deck in the deck listing.

### Requirement 4: Reject malformed or invalid import files

**User Story:** As a user, I want invalid files to be rejected with a clear
message, so that a bad file never crashes the app or corrupts my data.

#### Acceptance Criteria

1. IF a selected file's contents are not valid JSON, THEN THE Import_Control SHALL display an Import_Error describing the file as unreadable and SHALL leave the Decks_Store unchanged.
2. IF a selected file's contents are valid JSON but do not satisfy the Deck_Schema, THEN THE Import_Control SHALL display an Import_Error describing the file as invalid and SHALL leave the Decks_Store unchanged.
3. IF the Import_Control cannot read a selected file, THEN THE Import_Control SHALL display an Import_Error describing the read failure and SHALL leave the Decks_Store unchanged.
4. WHEN the Import_Control processes any selected file, THE Import_Control SHALL complete without throwing an unhandled error.
5. WHEN a subsequent import succeeds after an Import_Error, THE Import_Control SHALL clear the previously displayed Import_Error.

### Requirement 5: Handle duplicate deck identifiers on import

**User Story:** As a user, I want duplicate deck IDs handled explicitly, so that
importing never silently overwrites or loses a deck.

#### Acceptance Criteria

1. WHEN a valid imported Deck has a Duplicate_Id, THE Import_Control SHALL present the user with an explicit choice to replace the existing Deck or to import the Deck under a new identifier.
2. WHEN the user chooses to replace the existing Deck for a Duplicate_Id, THE Decks_Store SHALL replace the existing Deck with the imported Deck.
3. WHEN the user chooses to import under a new identifier for a Duplicate_Id, THE Import_Control SHALL assign the imported Deck an identifier that is not present in the Decks_Store and SHALL add the imported Deck to the Decks_Store.
4. WHILE a Duplicate_Id choice is pending, THE Import_Control SHALL leave the Decks_Store unchanged.
5. IF the user cancels the Duplicate_Id choice, THEN THE Import_Control SHALL leave the Decks_Store unchanged.

### Requirement 6: Round-trip integrity between export and import

**User Story:** As a user, I want an exported deck to import back cleanly, so
that export and import together form a reliable backup and restore path.

#### Acceptance Criteria

1. FOR ALL valid Decks, exporting a Deck through the Export_Control and then importing the resulting file through the Import_Control SHALL produce a Deck equivalent to the original Deck.
2. WHEN a Deck exported by the Export_Control is imported through the Import_Control, THE Import_Control SHALL validate the file against the Deck_Schema without producing an Import_Error.
3. WHEN an exported Deck is re-imported and its identifier is not a Duplicate_Id, THE Decks_Store SHALL contain a Deck whose fields and Cards match the originally exported Deck.

### Requirement 7: Wire import and export into the application

**User Story:** As a user, I want import and export available where I manage my
decks, so that I can reach them without leaving my normal workflow.

#### Acceptance Criteria

1. THE Dashboard SHALL present the Import_Control for importing a Deck.
2. THE Dashboard SHALL present an export action for each listed Deck.
3. THE deck detail view SHALL present an export action for the displayed Deck.
4. WHERE the deck listing is empty, THE Dashboard SHALL present the Import_Control so that a user can import a Deck without first creating one.
