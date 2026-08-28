# Requirements Document

## Introduction

Deck CRUD is slice 2 of 6 for the local-first spaced repetition study app. It turns the read-only dashboard from slice 1 into a manageable deck library by letting a user create, edit, and delete decks through a Zod-validated form/modal, with delete gated behind an explicit confirmation. All changes flow through `DecksContext` and persist to `localStorage` via the existing `lib/storage.ts` seam.

This slice extends the `Deck` domain type with a `createdAt` timestamp and introduces two new context actions (`updateDeck`, `deleteDeck`) alongside the existing `addDeck`. Deck identifiers are generated with `crypto.randomUUID()` and must remain stable and safe for later use as an export filename (slice 5) and a route parameter (slice 3).

This feature covers traceability items R18, R13 (deck), and R28 (validation).

## Glossary

- **Deck**: A named collection of cards with the shape `{ id, name, description?, cards[], createdAt }`.
- **Deck_Store**: The `DecksContext` provider (`contexts/DecksContext.tsx`) that holds the in-memory deck list and exposes `addDeck`, `updateDeck`, and `deleteDeck` actions.
- **Deck_Form**: The client component (`components/DeckForm.tsx`) used to create and edit a deck, containing a name field and a description field.
- **Delete_Confirm**: The client confirmation dialog (`components/DeleteConfirm.tsx` or inline equivalent) shown before a deck is deleted.
- **Persistence_Layer**: The `lib/storage.ts` module that reads and writes the deck list to `localStorage`, returning discriminated results and never throwing.
- **Dashboard**: The deck library view rendered from `app/page.tsx` that lists decks and exposes create, edit, and delete entry points.
- **Deck_Form_Schema**: The Zod schema validating `Deck_Form` input (name required, description optional), with its input type produced via `z.infer`.
- **Deck_Name**: The user-supplied deck title. Required, trimmed, length 1 to 100 characters.
- **Deck_Description**: The optional user-supplied deck description. Length 0 to 500 characters.
- **Validation_Error**: A field-level message produced by `Deck_Form_Schema` and displayed inline next to the offending field.
- **createdAt**: An ISO 8601 timestamp string recorded when a deck is created and preserved unchanged across edits.

## Requirements

### Requirement 1: Create a deck

**User Story:** As a study-app user, I want to create a new deck through a validated form, so that I can start building my deck library.

#### Acceptance Criteria

1. WHEN a user activates the create entry point on the Dashboard, THE Deck_Form SHALL open in create mode with empty Deck_Name and Deck_Description fields.
2. WHEN a user submits the Deck_Form in create mode with a Deck_Name that is a trimmed string of 1 to 100 characters and a Deck_Description of 0 to 500 characters, THE Deck_Store SHALL add a new Deck to the deck list.
3. WHEN the Deck_Store adds a new Deck, THE Deck_Store SHALL assign an identifier generated via `crypto.randomUUID()`.
4. WHEN the Deck_Store adds a new Deck, THE Deck_Store SHALL set the Deck createdAt field to the current time as an ISO 8601 timestamp string.
5. WHEN the Deck_Store adds a new Deck, THE Deck_Store SHALL initialize the Deck cards field to an empty array.
6. WHEN a new Deck is added to the Deck_Store, THE Dashboard SHALL display the new Deck in the deck list.
7. WHEN a new Deck is added to the Deck_Store, THE Persistence_Layer SHALL write the updated deck list to localStorage.
8. IF a user submits the Deck_Form in create mode with a Deck_Name that is empty, whitespace-only, or longer than 100 characters, THEN THE Deck_Store SHALL leave the deck list unchanged and THE Deck_Form SHALL display a Validation_Error next to the Deck_Name field.
9. IF the Persistence_Layer reports a write failure after a Deck is created, THEN THE Deck_Store SHALL keep the newly created Deck in the in-memory deck list and surface a persistence error.

### Requirement 2: Edit an existing deck

**User Story:** As a study-app user, I want to edit a deck's name and description, so that I can keep my deck library accurate.

#### Acceptance Criteria

1. WHEN a user activates the edit entry point for a Deck on the Dashboard, THE Deck_Form SHALL open in edit mode pre-filled with the selected Deck Deck_Name and Deck_Description.
2. WHEN a user submits the Deck_Form in edit mode with a Deck_Name that is a trimmed string of 1 to 100 characters and a Deck_Description of 0 to 500 characters, THE Deck_Store SHALL update the matching Deck Deck_Name and Deck_Description with the submitted trimmed values.
3. WHEN the Deck_Store updates a Deck, THE Deck_Store SHALL preserve the existing Deck identifier.
4. WHEN the Deck_Store updates a Deck, THE Deck_Store SHALL preserve the existing Deck createdAt value.
5. WHEN the Deck_Store updates a Deck, THE Deck_Store SHALL preserve the existing Deck cards array.
6. WHEN a Deck is updated in the Deck_Store, THE Dashboard SHALL display the updated Deck_Name and Deck_Description.
7. WHEN a Deck is updated in the Deck_Store, THE Persistence_Layer SHALL write the updated deck list to localStorage.
8. IF a user submits an edit for a Deck identifier that does not exist in the deck list, THEN THE Deck_Store SHALL return an error result and leave the deck list unchanged.
9. IF a user submits the Deck_Form in edit mode with a Deck_Name that is empty, whitespace-only, or longer than 100 characters, THEN THE Deck_Store SHALL leave the matching Deck unchanged and THE Deck_Form SHALL display a Validation_Error next to the Deck_Name field.

### Requirement 3: Delete a deck with confirmation

**User Story:** As a study-app user, I want to delete a deck only after confirming, so that I do not lose decks by accident.

#### Acceptance Criteria

1. WHEN a user activates the delete entry point for a Deck on the Dashboard, THE Delete_Confirm SHALL open and display the Deck_Name of the Deck to be deleted.
2. THE Delete_Confirm SHALL present exactly one confirm control and exactly one cancel control, and THE Deck_Store SHALL perform no deletion without an explicit confirm action.
3. WHEN a user confirms deletion in the Delete_Confirm, THE Deck_Store SHALL remove the Deck whose identifier matches the Deck to be deleted from the deck list.
4. WHEN a Deck is removed from the Deck_Store, THE Dashboard SHALL stop displaying the removed Deck.
5. WHEN a Deck is removed from the Deck_Store, THE Persistence_Layer SHALL write the updated deck list to localStorage.
6. IF the Persistence_Layer reports a write failure after a Deck is removed, THEN THE Deck_Store SHALL surface a persistence error.
7. WHEN a user cancels the Delete_Confirm, THE Deck_Store SHALL leave the deck list unchanged.
8. WHEN a user cancels the Delete_Confirm, THE Delete_Confirm SHALL close and return focus to the delete entry point from which it was opened.
9. IF a user confirms deletion for a Deck identifier that does not exist in the deck list, THEN THE Deck_Store SHALL take no removal action and leave the deck list unchanged.

### Requirement 4: Validate deck form input

**User Story:** As a study-app user, I want clear inline messages when my input is invalid, so that I can correct it before saving.

#### Acceptance Criteria

1. THE Deck_Form_Schema SHALL require Deck_Name to be a string of 1 to 100 characters after trimming.
2. THE Deck_Form_Schema SHALL treat Deck_Description as optional, accepting an absent or empty value and a value of at most 500 characters.
3. IF a user submits the Deck_Form with an empty or whitespace-only Deck_Name, THEN THE Deck_Form SHALL display a Validation_Error next to the Deck_Name field stating that a name is required, and SHALL retain the user-entered input.
4. IF a user submits the Deck_Form with a Deck_Name longer than 100 characters, THEN THE Deck_Form SHALL display a Validation_Error next to the Deck_Name field stating that the name exceeds 100 characters, and SHALL retain the user-entered input.
5. IF a user submits the Deck_Form with a Deck_Description longer than 500 characters, THEN THE Deck_Form SHALL display a Validation_Error next to the Deck_Description field stating that the description exceeds 500 characters, and SHALL retain the user-entered input.
6. IF the Deck_Form has any Validation_Error on submit, THEN THE Deck_Form SHALL prevent submission and THE Deck_Store SHALL leave the deck list unchanged.
7. WHEN the Deck_Store action receives deck input, THE Deck_Store SHALL validate that input against the deck schema before modifying the deck list.
8. IF deck input received by the Deck_Store action fails schema validation, THEN THE Deck_Store SHALL reject the change, leave the deck list unchanged, and produce a Validation_Error identifying each invalid field.

### Requirement 5: Persist deck changes across sessions

**User Story:** As a study-app user, I want my deck changes to survive a page refresh, so that my library is durable on my device.

#### Acceptance Criteria

1. WHEN the Dashboard loads after a deck create, edit, or delete, THE Deck_Store SHALL reflect the deck list previously written to localStorage and set status to "ready".
2. WHILE the Deck_Store has not completed its initial load, THE Deck_Store SHALL expose an empty deck list with status "initial" and SHALL read localStorage only after the initial client mount rather than during render.
3. WHEN no deck data has been written to localStorage, THE Deck_Store SHALL start with an empty deck list, set status to "ready", and surface no error.
4. IF the Persistence_Layer reports a write failure, THEN THE Deck_Store SHALL keep the current in-memory deck list unchanged and surface a "persistence" error.
5. IF the Persistence_Layer reports that stored data is invalid on load, THEN THE Deck_Store SHALL start with an empty deck list, set status to "ready", and surface an "invalid-data" error.

### Requirement 6: Extend the deck domain type

**User Story:** As a developer, I want the Deck type and schemas to include a stable identifier and creation timestamp, so that later slices can rely on them.

#### Acceptance Criteria

1. THE Deck type SHALL include a createdAt field typed as an ISO 8601 timestamp string.
2. WHEN the deck schema validates a Deck, THE deck schema SHALL require that createdAt is a non-empty string of length 1 to 30 characters that parses as a valid ISO 8601 timestamp.
3. IF createdAt is empty, is not a string, or does not parse as a valid ISO 8601 timestamp, THEN THE deck schema SHALL reject the Deck and produce a validation error indicating that createdAt must be a valid ISO 8601 timestamp.
4. THE Deck_Form_Schema SHALL expose a form-input type via `z.infer` for use by the Deck_Form.
5. THE Deck identifier SHALL be a non-empty string of length 1 to 100 characters containing only characters valid for both an export filename and a route parameter.
6. IF the Deck identifier is empty or exceeds 100 characters, THEN THE deck schema SHALL reject the Deck and produce a validation error indicating that the identifier is invalid.
