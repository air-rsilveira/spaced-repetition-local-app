# Requirements Document

## Introduction

Cards Within a Deck is slice 3 of 6 for the local-first spaced repetition study app. It
gives each deck a dedicated detail page at the dynamic route `/deck/[id]` where a user
manages that deck's cards: listing every card with its current Leitner box and
creating, editing, and deleting cards through a Zod-validated form that renders a live
markdown preview of the front and back as the user types. This is the slice where the
study content that later slices review actually gets authored.

The slice builds on the seams established in slice 1 (walking skeleton) and slice 2
(deck CRUD). It grows the `Card` domain type and `cardSchema` in `types/deck.ts` from a
bare `{ id }` into the full study-card shape (`front`, `back`, `box`, `lastReviewed`,
`createdAt`, `id`) while keeping the shape compatible with `deckSchema.cards` and the
`lib/storage.ts` persistence round-trip. It adds three new card actions to
`DecksContext` (`addCard`, `updateCard`, `deleteCard`) that follow the same
discriminated-result pattern as the existing deck actions and operate on a deck by id.
Two new dependencies, `react-markdown` and `remark-gfm`, provide the markdown rendering
used by a reusable `Markdown` wrapper component that a later review slice also reuses.

This feature covers traceability items R3, R19, R21, R22, R13 (card), and R26 (partial).

## Glossary

- **Card**: A single study item within a deck, with the shape `{ id, front, back, box, lastReviewed, createdAt }`.
- **Card_Front**: The prompt side of a Card. Required, trimmed, length 1 to 5000 characters.
- **Card_Back**: The answer side of a Card. Required, trimmed, length 1 to 5000 characters.
- **Leitner_Box**: The integer Leitner-system box a Card currently occupies, starting at 1 for a new Card.
- **lastReviewed**: The time a Card was last reviewed, recorded as an ISO 8601 timestamp string, or `null` when the Card has never been reviewed.
- **Card_createdAt**: An ISO 8601 timestamp string recorded when a Card is created and preserved unchanged across edits.
- **Deck**: A named collection of Cards with the shape `{ id, name, description?, cards[], createdAt }`, as defined in slice 2.
- **Deck_Store**: The `DecksContext` provider (`contexts/DecksContext.tsx`) that holds the in-memory deck list and exposes the deck and card actions, including `addCard`, `updateCard`, and `deleteCard`.
- **Deck_Detail_Page**: The client page at `app/deck/[id]/page.tsx` rendered for the route `/deck/[id]`, which looks up a Deck by its route identifier and manages that Deck's Cards.
- **Route_Deck_Id**: The `[id]` dynamic route segment value, read in the client page via React's `use(params)` and typed with `PageProps<'/deck/[id]'>`.
- **Card_Form**: The client component (`components/CardForm.tsx`) used to create and edit a Card, containing a front field, a back field, and a live markdown preview.
- **Card_Form_Schema**: The Zod schema (`cardFormSchema`) validating Card_Form input (front required, back required), with its input type produced via `z.infer`.
- **Card_List**: The client component (`components/CardList.tsx`) that lists a Deck's Cards, each rendered by a Card_Item.
- **Card_Item**: The component (`components/CardItem.tsx`) that renders one Card with its Leitner_Box badge and edit/delete controls.
- **Box_Badge**: The visual indicator on a Card_Item that shows the Card's current Leitner_Box, paired with a text label so meaning never depends on color alone.
- **Markdown_View**: The reusable component (`components/Markdown.tsx`) wrapping `react-markdown` with the `remark-gfm` plugin, used for the Card_Form preview and reused by a later review slice.
- **Markdown_Preview**: The region of the Card_Form that renders the current Card_Front and Card_Back input through the Markdown_View as the user types.
- **Delete_Confirm**: The client confirmation dialog (`components/DeleteConfirm.tsx`, from slice 2) shown before a Card is deleted.
- **Persistence_Layer**: The `lib/storage.ts` module that reads and writes the deck list to `localStorage`, returning discriminated results and never throwing.
- **Validation_Error**: A field-level message produced by Card_Form_Schema and displayed inline next to the offending field.
- **Deck_Missing_State**: The state the Deck_Detail_Page shows when no Deck matches the Route_Deck_Id after the store has finished its initial load.

## Requirements

### Requirement 1: Render a deck's detail page and its cards

**User Story:** As a study-app user, I want to open a deck's detail page and see all of its cards with their current Leitner box, so that I can review what content the deck contains.

#### Acceptance Criteria

1. WHEN a user navigates to `/deck/[id]`, THE Deck_Detail_Page SHALL read the Route_Deck_Id from the route parameters via `use(params)`.
2. WHEN the Deck_Store status is "ready" and a Deck whose identifier equals the Route_Deck_Id exists, THE Deck_Detail_Page SHALL display that Deck name and render the Card_List for that Deck cards.
3. WHEN the Deck_Detail_Page renders the Card_List, THE Card_List SHALL render one Card_Item for each Card in the Deck cards array.
4. WHEN a Card_Item renders a Card, THE Card_Item SHALL display the Card_Front text and a Box_Badge showing the Card Leitner_Box value together with a text label identifying the box.
5. WHILE the Deck_Store has not completed its initial load, THE Deck_Detail_Page SHALL render a loading state and SHALL read `localStorage` only after the initial client mount rather than during render.
6. WHEN the Deck_Store status is "ready" and no Deck whose identifier equals the Route_Deck_Id exists, THE Deck_Detail_Page SHALL render the Deck_Missing_State.
7. WHEN a Deck contains zero Cards, THE Card_List SHALL render an empty-cards state instead of any Card_Item.

### Requirement 2: Create a card with front, back, and defaults

**User Story:** As a study-app user, I want to add a new card with a front and back, so that I can build up a deck's study content.

#### Acceptance Criteria

1. WHEN a user activates the create-card entry point on the Deck_Detail_Page, THE Card_Form SHALL open in create mode with empty Card_Front and Card_Back fields.
2. WHEN a user submits the Card_Form in create mode with a Card_Front that is a trimmed string of 1 to 5000 characters and a Card_Back that is a trimmed string of 1 to 5000 characters, THE Deck_Store SHALL add a new Card to the matching Deck cards array.
3. WHEN the Deck_Store adds a new Card, THE Deck_Store SHALL assign an identifier generated via `crypto.randomUUID()`.
4. WHEN the Deck_Store adds a new Card, THE Deck_Store SHALL set the Card Leitner_Box to the integer 1.
5. WHEN the Deck_Store adds a new Card, THE Deck_Store SHALL set the Card lastReviewed field to `null`.
6. WHEN the Deck_Store adds a new Card, THE Deck_Store SHALL set the Card Card_createdAt field to the current time as an ISO 8601 timestamp string.
7. WHEN the Deck_Store adds a new Card to a Deck, THE Deck_Store SHALL preserve the existing Cards of that Deck and SHALL leave all other Decks unchanged.
8. WHEN a new Card is added to a Deck, THE Card_List SHALL display the new Card.
9. WHEN a new Card is added to the Deck_Store, THE Persistence_Layer SHALL write the updated deck list to `localStorage`.
10. IF a user submits the Card_Form in create mode with a Card_Front or Card_Back that is empty, whitespace-only, or longer than 5000 characters, THEN THE Deck_Store SHALL leave the deck list unchanged and THE Card_Form SHALL display a Validation_Error next to the offending field.
11. IF a user submits a create-card request for a Route_Deck_Id that does not match any Deck, THEN THE Deck_Store SHALL return a "not-found" error result and leave the deck list unchanged.

### Requirement 3: Edit an existing card

**User Story:** As a study-app user, I want to edit a card's front and back, so that I can correct or improve my study content.

#### Acceptance Criteria

1. WHEN a user activates the edit entry point for a Card on the Card_Item, THE Card_Form SHALL open in edit mode pre-filled with the selected Card Card_Front and Card_Back.
2. WHEN a user submits the Card_Form in edit mode with a Card_Front that is a trimmed string of 1 to 5000 characters and a Card_Back that is a trimmed string of 1 to 5000 characters, THE Deck_Store SHALL update the matching Card Card_Front and Card_Back with the submitted trimmed values.
3. WHEN the Deck_Store updates a Card, THE Deck_Store SHALL preserve the existing Card identifier.
4. WHEN the Deck_Store updates a Card, THE Deck_Store SHALL preserve the existing Card Leitner_Box value.
5. WHEN the Deck_Store updates a Card, THE Deck_Store SHALL preserve the existing Card lastReviewed value.
6. WHEN the Deck_Store updates a Card, THE Deck_Store SHALL preserve the existing Card Card_createdAt value.
7. WHEN the Deck_Store updates a Card in a Deck, THE Deck_Store SHALL preserve every other Card in that Deck and SHALL leave all other Decks unchanged.
8. WHEN a Card is updated in the Deck_Store, THE Card_Item SHALL display the updated Card_Front.
9. WHEN a Card is updated in the Deck_Store, THE Persistence_Layer SHALL write the updated deck list to `localStorage`.
10. IF a user submits an edit for a Card identifier that does not exist in the target Deck, THEN THE Deck_Store SHALL return a "not-found" error result and leave the deck list unchanged.
11. IF a user submits the Card_Form in edit mode with a Card_Front or Card_Back that is empty, whitespace-only, or longer than 5000 characters, THEN THE Deck_Store SHALL leave the matching Card unchanged and THE Card_Form SHALL display a Validation_Error next to the offending field.

### Requirement 4: Delete a card with confirmation

**User Story:** As a study-app user, I want to delete a card only after confirming, so that I do not lose study content by accident.

#### Acceptance Criteria

1. WHEN a user activates the delete entry point for a Card on the Card_Item, THE Delete_Confirm SHALL open and identify the Card to be deleted.
2. THE Delete_Confirm SHALL present exactly one confirm control and exactly one cancel control, and THE Deck_Store SHALL perform no deletion without an explicit confirm action.
3. WHEN a user confirms deletion in the Delete_Confirm, THE Deck_Store SHALL remove the Card whose identifier matches the Card to be deleted from the target Deck cards array.
4. WHEN a Card is removed from a Deck, THE Deck_Store SHALL preserve every other Card in that Deck and SHALL leave all other Decks unchanged.
5. WHEN a Card is removed from the Deck_Store, THE Card_List SHALL stop displaying the removed Card.
6. WHEN a Card is removed from the Deck_Store, THE Persistence_Layer SHALL write the updated deck list to `localStorage`.
7. WHEN a user cancels the Delete_Confirm, THE Deck_Store SHALL leave the deck list unchanged.
8. IF a user confirms deletion for a Card identifier that does not exist in the target Deck, THEN THE Deck_Store SHALL take no removal action and return a "not-found" error result.

### Requirement 5: Show a live markdown preview of card input

**User Story:** As a study-app user, I want to see a live markdown preview of the front and back as I type, so that I know how my card will render before I save it.

#### Acceptance Criteria

1. WHILE a user is editing the Card_Front or Card_Back in the Card_Form, THE Markdown_Preview SHALL render the current field text through the Markdown_View.
2. WHEN the Card_Front or Card_Back input changes, THE Markdown_Preview SHALL reflect the changed text without a page reload.
3. WHEN the Markdown_View renders text containing GitHub Flavored Markdown emphasis such as `**bold**`, THE Markdown_View SHALL produce a `<strong>` element for the emphasized text.
4. THE Markdown_View SHALL render markdown using `react-markdown` configured with the `remark-gfm` plugin.
5. WHEN the Card_Front or Card_Back is empty, THE Markdown_Preview SHALL render an empty preview without error.

### Requirement 6: Validate card form input

**User Story:** As a study-app user, I want clear inline messages when my card input is invalid, so that I can correct it before saving.

#### Acceptance Criteria

1. THE Card_Form_Schema SHALL require Card_Front to be a string of 1 to 5000 characters after trimming.
2. THE Card_Form_Schema SHALL require Card_Back to be a string of 1 to 5000 characters after trimming.
3. IF a user submits the Card_Form with an empty or whitespace-only Card_Front, THEN THE Card_Form SHALL display a Validation_Error next to the Card_Front field stating that the front is required, and SHALL retain the user-entered input.
4. IF a user submits the Card_Form with an empty or whitespace-only Card_Back, THEN THE Card_Form SHALL display a Validation_Error next to the Card_Back field stating that the back is required, and SHALL retain the user-entered input.
5. IF a user submits the Card_Form with a Card_Front or Card_Back longer than 5000 characters, THEN THE Card_Form SHALL display a Validation_Error next to the offending field stating that the field exceeds 5000 characters, and SHALL retain the user-entered input.
6. IF the Card_Form has any Validation_Error on submit, THEN THE Card_Form SHALL prevent submission and THE Deck_Store SHALL leave the deck list unchanged.
7. WHEN a Deck_Store card action receives card input, THE Deck_Store SHALL validate that input against the Card_Form_Schema before modifying the deck list.
8. IF card input received by a Deck_Store card action fails schema validation, THEN THE Deck_Store SHALL reject the change, leave the deck list unchanged, and produce a Validation_Error identifying each invalid field.

### Requirement 7: Grow the card domain type

**User Story:** As a developer, I want the Card type and cardSchema to hold the full study-card shape, so that cards persist and round-trip through import/export in later slices.

#### Acceptance Criteria

1. THE Card type SHALL include Card_Front, Card_Back, Leitner_Box, lastReviewed, and Card_createdAt fields in addition to the identifier.
2. WHEN the cardSchema validates a Card, THE cardSchema SHALL require Card_Front and Card_Back to each be a string of 1 to 5000 characters.
3. WHEN the cardSchema validates a Card, THE cardSchema SHALL require Leitner_Box to be an integer greater than or equal to 1.
4. WHEN the cardSchema validates a Card, THE cardSchema SHALL require lastReviewed to be either an ISO 8601 timestamp string of 1 to 30 characters or `null`.
5. WHEN the cardSchema validates a Card, THE cardSchema SHALL require Card_createdAt to be a non-empty ISO 8601 timestamp string of 1 to 30 characters.
6. IF a Card violates any Card_Front, Card_Back, Leitner_Box, lastReviewed, or Card_createdAt constraint, THEN THE cardSchema SHALL reject the Card and produce a validation error identifying the invalid field.
7. THE grown cardSchema SHALL remain compatible with `deckSchema.cards` so that a Deck containing grown Cards validates and round-trips through the Persistence_Layer unchanged.
8. THE Card_Form_Schema SHALL expose a form-input type via `z.infer` for use by the Card_Form, and `types/index.ts` SHALL barrel-export the grown Card type, the cardSchema, the Card_Form_Schema, and its inferred input type.

### Requirement 8: Persist card changes across sessions

**User Story:** As a study-app user, I want my card changes to survive a page refresh, so that my study content is durable on my device.

#### Acceptance Criteria

1. WHEN the Deck_Detail_Page loads after a card create, edit, or delete, THE Deck_Store SHALL reflect the deck list previously written to `localStorage`.
2. WHEN a Card create, edit, or delete changes the deck list, THE Persistence_Layer SHALL serialize and write the whole updated deck list, including every grown Card field, to `localStorage`.
3. WHEN the Persistence_Layer reads a stored deck list whose Cards carry the grown fields, THE Persistence_Layer SHALL return a deck list equal to the one previously written.
4. IF the Persistence_Layer reports a write failure after a Card change, THEN THE Deck_Store SHALL keep the current in-memory deck list unchanged and surface a "persistence" error.
