# Requirements Document

## Introduction

The Walking Skeleton is the first vertical slice of a local-first spaced repetition study application. It establishes a thin, demoable end-to-end path: an application shell with persistent navigation, a client-side deck store backed by browser `localStorage`, and a dashboard that lists decks and survives a page refresh. Every later slice (deck creation, card authoring, review scheduling, import/export) builds on this foundation.

The slice deliberately keeps domain logic minimal. It introduces just-in-time `Deck` and `Card` types, wires a `DecksProvider` into the root layout, renders a dashboard with an empty state and entry points, and stands up the testing toolchain (Vitest + React Testing Library) with at least one passing test. Persistence uses `localStorage` with a hydration guard to prevent server/client render mismatches.

This document defines the behavioral requirements for the slice. Implementation details (exact hook shapes, file contents) are deferred to the design phase.

## Glossary

- **App_Shell**: The persistent application chrome rendered on every route, comprising the header/navigation and the main content region. Implemented via the root layout and shared components.
- **App_Header**: The navigation bar component that renders the application name and primary navigation, and remains visible across routes.
- **Dashboard**: The home route (`/`) that lists the user's decks or shows an empty state.
- **Deck**: A named collection of study cards. Minimal shape for this slice: a unique identifier, a name, an optional description, and a set of cards.
- **Card**: A single study item belonging to a Deck. Minimal shape for this slice: a unique identifier and its owning deck association.
- **Decks_Store**: The client-side state container (`DecksContext` provider and its `useDecks` hook) that holds the in-memory list of decks and mediates reads and writes.
- **Local_Storage**: The browser `window.localStorage` key/value store used to persist the deck list on the user's device.
- **Hydration_Guard**: A mechanism that defers reading from Local_Storage until after the component has mounted on the client, so the server-rendered markup matches the initial client render.
- **Test_Harness**: The Vitest and React Testing Library configuration, including the jsdom environment and setup files, that enables running tests for the codebase.
- **Empty_State**: The Dashboard view shown when the Decks_Store contains no decks, presenting entry points to create or import a deck.
- **DeckCard**: The Dashboard component that renders a single deck's summary, including its name, optional description, and total card count.

## Requirements

### Requirement 1: Application Shell with Persistent Navigation

**User Story:** As a learner, I want a consistent app shell with navigation on every screen, so that I can orient myself and move around the application on any device.

#### Acceptance Criteria

1. WHEN any route within the application is rendered, THE App_Shell SHALL render the App_Header at the top of every route without exception.
2. THE App_Header SHALL display the application name as visible text.
3. THE App_Header SHALL render the primary navigation containing one selectable destination for each top-level section of the application, with at least one destination present.
4. THE App_Shell SHALL render a single main content region positioned below the App_Header on every route.
5. WHERE the viewport width is less than 768 pixels, THE App_Shell SHALL render the App_Header and main content region as a single vertical column with no horizontal scrolling.
6. WHERE the viewport width is 768 pixels or greater, THE App_Shell SHALL render the App_Header and main content region using the desktop layout, keeping the App_Header persistently visible at the top of the viewport.
7. THE App_Header SHALL apply the AWS palette dark surface (`aws-squid-ink`) as its background with light text (`aws-white`), maintaining a text-to-background contrast ratio of at least 4.5:1.
8. WHEN a route is active, THE App_Header SHALL visually distinguish the primary navigation destination corresponding to that route from the inactive destinations using a means other than color alone.
9. WHEN a learner activates a primary navigation destination, THE App_Shell SHALL navigate to the corresponding route and update the main content region while keeping the App_Header rendered.
10. IF a requested route does not correspond to any primary navigation destination, THEN THE App_Shell SHALL still render the App_Header and main content region, and SHALL indicate that no navigation destination is currently active.

### Requirement 2: Decks Store Provider and Hook

**User Story:** As a developer, I want a client-side decks store exposed through a provider and hook, so that any component can read the deck list and add decks through a single source of truth.

#### Acceptance Criteria

1. THE Decks_Store SHALL expose the current list of decks to consuming components as an ordered collection containing between 0 and 10,000 decks.
2. WHILE the Decks_Store provider is first mounted and no decks have been added, THE Decks_Store SHALL expose an empty deck list (a collection of length 0).
3. THE Decks_Store SHALL expose an operation that accepts a new deck and adds it to the deck list.
4. WHEN a component adds a valid deck through the Decks_Store, THE Decks_Store SHALL update the exposed deck list to include the new deck while retaining all previously added decks in their existing order.
5. IF a component attempts to add a deck whose name is empty or contains only whitespace, THEN THE Decks_Store SHALL reject the operation, leave the exposed deck list unchanged, and return an error indicating that the deck name is required.
6. WHEN a new deck is created without a caller-supplied identifier, THE Decks_Store SHALL assign an identifier generated by `crypto.randomUUID()` that is unique among all decks currently in the deck list.
7. THE App_Shell SHALL wrap the main content region with the Decks_Store provider so that the Dashboard can consume the deck list.
8. IF a component calls the `useDecks` hook outside of the Decks_Store provider, THEN THE Decks_Store SHALL raise an error indicating that the hook was used outside its provider.

### Requirement 3: Local Persistence of Decks

**User Story:** As a learner, I want my decks to remain after I refresh or reopen the app, so that my study data is not lost between sessions.

#### Acceptance Criteria

1. WHEN the Decks_Store mounts on the client, THE Decks_Store SHALL read the persisted deck list from Local_Storage and initialize its in-memory deck list from that data within 1 second of mount.
2. WHEN the deck list in the Decks_Store changes, THE Decks_Store SHALL write the current deck list to Local_Storage within 1 second of the change.
3. IF a write to Local_Storage fails because storage is unavailable or the storage quota is exceeded, THEN THE Decks_Store SHALL retain the current in-memory deck list unchanged and surface an error indication that persistence did not succeed.
4. WHEN a deck is added and the page is subsequently reloaded, THE Decks_Store SHALL restore the added deck from Local_Storage so that the restored deck list is identical to the deck list present before reload.
5. IF Local_Storage contains no persisted deck data at mount, THEN THE Decks_Store SHALL initialize its deck list as an empty list.
6. IF the persisted deck data in Local_Storage cannot be parsed or fails validation against the Zod deck-list schema at mount, THEN THE Decks_Store SHALL initialize its deck list as an empty list and continue operation without throwing.
7. THE Decks_Store SHALL validate persisted deck data against a Zod schema before initializing its deck list from that data, and SHALL support persisting and restoring a deck list of up to 10,000 decks.

### Requirement 4: Hydration Guard

**User Story:** As a learner, I want the first render of the app to be free of hydration errors, so that the interface loads cleanly and reliably.

#### Acceptance Criteria

1. WHILE running on the server and until the Decks_Store provider has completed its first client mount, THE Decks_Store SHALL NOT read from Local_Storage and SHALL expose a deterministic initial deck list.
2. WHILE the Decks_Store provider has not completed its first client mount, THE Decks_Store SHALL expose the identical deck list (same items in the same order) that the server rendered.
3. WHEN the Decks_Store provider performs its initial client render, THE Decks_Store SHALL produce markup identical to the server-rendered markup such that zero hydration mismatch warnings are emitted to the console during that first render.
4. WHEN the Decks_Store provider completes its first client mount, THE Decks_Store SHALL read the persisted deck list from Local_Storage and update the exposed deck list to reflect the persisted data.
5. IF reading from Local_Storage fails or the persisted data is missing or invalid, THEN THE Decks_Store SHALL retain the deterministic initial deck list and continue operating without emitting a hydration mismatch warning.

### Requirement 5: Dashboard Deck Listing

**User Story:** As a learner, I want the dashboard to list my decks with their key details, so that I can see what I have to study at a glance.

#### Acceptance Criteria

1. WHEN the Dashboard renders and the Decks_Store contains one or more decks, THE Dashboard SHALL render exactly one DeckCard for each deck in the deck list, ordered as provided by the Decks_Store.
2. WHEN the Dashboard renders a DeckCard, THE Dashboard SHALL display the deck name for that deck as non-empty text of 1 to 100 characters.
3. WHEN the Dashboard renders a DeckCard and the deck description is present and non-empty, THE Dashboard SHALL display the deck description text (0 to 500 characters) for that deck.
4. IF a deck has no description or an empty description, THEN THE Dashboard SHALL render the DeckCard without a description region while still displaying the deck name and card count.
5. WHEN the Dashboard renders a DeckCard, THE Dashboard SHALL display the total card count for that deck as a non-negative integer (0 to 999,999), displaying 0 for a deck containing no cards.
6. WHEN the Dashboard renders and the Decks_Store contains zero decks, THE Dashboard SHALL render an empty-state message indicating that no decks exist and SHALL render no DeckCard.
7. WHEN the Dashboard renders, THE Dashboard SHALL render each DeckCard from the deck list provided by the Decks_Store.

### Requirement 6: Dashboard Empty State

**User Story:** As a new learner, I want a clear empty state when I have no decks, so that I know how to get started.

#### Acceptance Criteria

1. WHEN the Dashboard renders and the Decks_Store contains zero decks, THE Dashboard SHALL render the Empty_State in place of the deck listing.
2. THE Empty_State SHALL present a create-deck entry point that, when activated, initiates the deck creation flow.
3. THE Empty_State SHALL present an import-deck entry point that, when activated, initiates the deck import flow.
4. WHEN the Decks_Store transitions from zero decks to one or more decks, THE Dashboard SHALL replace the Empty_State with the deck listing within 500 milliseconds.
5. WHEN the Decks_Store transitions from one or more decks to zero decks, THE Dashboard SHALL replace the deck listing with the Empty_State within 500 milliseconds.
6. IF the Decks_Store cannot be read when the Dashboard renders, THEN THE Dashboard SHALL render neither the Empty_State nor the deck listing and SHALL display an error indication that loading decks failed, while retaining any previously loaded deck data.

### Requirement 7: Minimal Domain Types

**User Story:** As a developer, I want minimal shared `Deck` and `Card` types, so that the store, dashboard, and components use consistent shapes that can grow in later slices.

#### Acceptance Criteria

1. THE shared types module SHALL define a Deck type that includes a unique identifier that is a non-empty string, a name that is a string of 1 to 100 characters, an optional description that is a string of 0 to 500 characters, and a cards collection holding 0 to 1000 Card items.
2. THE shared types module SHALL define a Card type that includes a unique identifier that is a non-empty string.
3. THE shared types module SHALL export the Deck and Card types for import via the `@/types` path alias.
4. THE Decks_Store SHALL derive the persisted deck data validation schema and the Deck type from a single Zod schema definition using `z.infer` so that the runtime schema and the compile-time type share one source of truth.
5. IF persisted deck data fails validation against the Zod schema, THEN THE Decks_Store SHALL reject the data, retain the last valid in-memory state without applying the invalid data, and surface an indication that the stored data is invalid.
6. IF a Deck is created or updated with a duplicate identifier that already exists in the store, THEN THE Decks_Store SHALL reject the operation, preserve the existing deck unchanged, and surface an indication that the identifier is not unique.

### Requirement 8: Test Harness Setup

**User Story:** As a developer, I want a working test toolchain with at least one passing test, so that later slices can be developed test-first with confidence.

#### Acceptance Criteria

1. THE Test_Harness SHALL be configured to run tests with Vitest using a jsdom environment.
2. THE Test_Harness SHALL provide React Testing Library for rendering components and asserting on rendered output.
3. THE Test_Harness SHALL resolve the `@/*` path alias in test files consistently with the application build.
4. WHEN the `@/*` path alias cannot be resolved for an imported module in a test file, THE Test_Harness SHALL fail that test with an error indicating the unresolved module path.
5. THE Test_Harness SHALL include a test that adds one deck to the Decks_Store, persists it to Local_Storage, re-initializes the Decks_Store from Local_Storage, and asserts that the re-initialized Decks_Store contains exactly one deck matching the added deck's identifier and content (round-trip property).
6. THE Test_Harness SHALL include a test that renders the Dashboard with a mock Decks_Store containing between 1 and 3 decks and asserts that every deck in the mock Decks_Store is rendered and that the count of rendered decks equals the count in the mock Decks_Store.
7. THE Test_Harness SHALL include a test that renders the Dashboard with a mock Decks_Store containing zero decks and asserts that the Empty_State is rendered and that no deck is rendered.
8. WHEN the test suite is run, THE Test_Harness SHALL report every included test as passing with zero failed tests and zero skipped tests.
9. WHEN the test suite is run, THE Test_Harness SHALL complete execution and return a result within 60 seconds.

### Requirement 9: Development and Quality Gates

**User Story:** As a developer, I want the slice to boot and pass linting, so that the walking skeleton is a clean, demoable baseline.

#### Acceptance Criteria

1. WHEN `npm run dev` is executed, THE application SHALL boot within 30 seconds and serve the Dashboard at the root route (`/`) with an HTTP 200 response.
2. IF the development server fails to start, THEN THE application SHALL surface an error indication describing the startup failure.
3. WHEN `npm run lint` is executed and no lint violations exist, THE application SHALL complete with exit code 0 and zero ESLint errors.
4. IF `npm run lint` detects one or more violations, THEN THE application SHALL exit with a non-zero exit code and report each error with its file and line.
5. THE application SHALL include `zod` as a pinned runtime dependency.
6. THE application SHALL include Vitest and React Testing Library as pinned development dependencies.
