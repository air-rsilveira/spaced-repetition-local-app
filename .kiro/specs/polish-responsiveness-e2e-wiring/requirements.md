# Requirements Document

## Introduction

This feature is the sixth and final vertical slice (6/6) of the local-first
spaced repetition study application. It is a hardening and polish pass that
integrates and refines what slices 1–5 delivered (walking-skeleton, deck-crud,
deck-detail-cards, review-session, json-import-export). It introduces **no new
domain logic**. Its purpose is to make the full flow feel cohesive and
production-clean by delivering four outcomes:

1. **Consistent navigation** across the three primary screens — the Dashboard
   (`app/page.tsx`), the deck detail view (`app/deck/[id]/page.tsx`), and the
   review session (`app/deck/[id]/review/page.tsx`) — so a user can always move
   between related screens without relying on the browser back button.
2. **Complete loading, empty, and error states** across the Dashboard, deck
   detail, review, and import/export flows, so every screen communicates its
   state rather than showing a blank or broken view.
3. **Verified mobile-first responsiveness** at mobile, tablet, and desktop
   widths, expressed with Tailwind `sm:` / `md:` / `lg:` prefixes and the AWS
   palette, with `aws-orange` reserved as an accent.
4. **A clean quality gate** — `npm run lint` and `npm run build` pass with no
   dev-only scaffolding, unused components, or dead code remaining, and no
   hydration warnings from the `localStorage`-backed client pages.

Because this slice polishes existing screens rather than adding behavior, the
requirements below constrain the presentation and integration of existing
components (`AppHeader`, `NavLinks`, `Dashboard`, `EmptyState`, the deck detail
page, and the review page) rather than introducing new domain rules.

Traceability: this feature covers Trello requirements R26, R27, R28, and R29.

## Glossary

- **App_Shell**: The persistent application chrome rendered on every route,
  comprising the `App_Header` and the single main content region, implemented
  via `app/layout.tsx`.
- **App_Header**: The header component (`components/AppHeader.tsx`) rendered at
  the top of every route, containing the application name and the `Nav_Links`.
- **Nav_Links**: The route-aware primary navigation component
  (`components/NavLinks.tsx`) that renders one link per destination and marks
  the destination matching the current path as active.
- **Dashboard**: The home route view (`app/page.tsx` rendering
  `components/Dashboard.tsx`) that lists the user's decks or shows the
  `Empty_State`.
- **Deck_Detail_View**: The single-deck view at `app/deck/[id]/page.tsx` that
  lists a deck's cards and hosts card create/edit/delete flows.
- **Review_View**: The review session view at `app/deck/[id]/review/page.tsx`
  that presents due cards for grading.
- **Empty_State**: A view shown when a collection contains no items, presenting
  a message and relevant entry points (for example `components/EmptyState.tsx`
  on the Dashboard, or a "no cards" view on the `Deck_Detail_View`, or a "no
  cards due" view on the `Review_View`).
- **Loading_State**: A view shown while the `Decks_Store` status is not yet
  `ready`, indicating that deck data is still being read from `Local_Storage`.
- **Error_State**: A view shown when an operation fails, presenting a
  human-readable message and, where applicable, a `role="alert"` region.
- **Decks_Store**: The client-side deck store exposed by the `DecksProvider` /
  `useDecks` hook in `contexts/DecksContext.tsx`, which exposes a `status`
  (`loading` | `ready` | `error`) and mediates reads and writes.
- **Local_Storage**: The browser `window.localStorage` used to persist the deck
  list on the user's device.
- **Hydration_Guard**: The mechanism that defers reading from `Local_Storage`
  until after the client mounts, so the server-rendered markup matches the
  initial client render and no hydration warning is produced.
- **Import_Flow**: The user flow for importing a deck from a JSON file,
  including its success and `Error_State` outcomes.
- **Export_Flow**: The user flow for exporting a deck as a JSON file, including
  the post-review export reminder.
- **AWS_Palette**: The brand color tokens defined under `theme.extend.colors.aws`
  in `tailwind.config`, in which `aws-orange` is reserved as an accent.
- **Mobile_Width**: A viewport narrower than the Tailwind `sm` breakpoint
  (less than 640 pixels).
- **Tablet_Width**: A viewport at or above the Tailwind `sm` breakpoint and
  below the `lg` breakpoint (640 pixels up to but not including 1024 pixels).
- **Desktop_Width**: A viewport at or above the Tailwind `lg` breakpoint
  (1024 pixels or greater).
- **Quality_Gate**: The combination of the ESLint check run by `npm run lint`
  and the production build run by `npm run build`.

## Requirements

### Requirement 1: Consistent navigation across all screens

**User Story:** As a learner, I want consistent navigation and back links across
the dashboard, deck detail, and review screens, so that I can move through the
full flow without relying on the browser back button.

#### Acceptance Criteria

1. WHEN any route within the application is rendered, THE App_Shell SHALL render the App_Header containing the Nav_Links at the top of the route.
2. WHEN the current route matches a Nav_Links destination, THE Nav_Links SHALL mark that destination as active using `aria-current="page"` together with a persistent visual weight or underline indicator rather than color alone.
3. WHEN the Deck_Detail_View is rendered for an existing deck, THE Deck_Detail_View SHALL present a navigation control that returns the user to the Dashboard.
4. WHEN the Deck_Detail_View is rendered for an existing deck, THE Deck_Detail_View SHALL present a navigation control that starts the Review_View for that deck.
5. WHEN the Review_View is rendered for an existing deck, THE Review_View SHALL present a navigation control that returns the user to the Deck_Detail_View for that deck.
6. WHEN the Review_View reaches its completion summary, THE Review_View SHALL present a navigation control that returns the user to the Dashboard.
7. THE App_Header SHALL apply the AWS_Palette dark surface (`aws-squid-ink`) with light text (`aws-white`) at a text-to-background contrast ratio of at least 4.5:1.
8. WHILE any of Mobile_Width, Tablet_Width, or Desktop_Width is active, THE Nav_Links SHALL remain reachable and operable.
9. WHEN a requested deck identifier does not match any deck in the Decks_Store, THE Deck_Detail_View and THE Review_View SHALL each expose a navigation control that returns the user to the Dashboard.

### Requirement 2: Complete loading states

**User Story:** As a learner, I want each screen to show a clear loading
indication while my data is being read, so that I never see a blank or
misleading view during startup.

#### Acceptance Criteria

1. WHILE the Decks_Store status is `loading`, THE Dashboard SHALL render a Loading_State and SHALL NOT render the deck listing, the Empty_State, or an Error_State.
2. WHILE the Decks_Store status is `loading`, THE Deck_Detail_View SHALL render a Loading_State and SHALL NOT render deck content.
3. WHILE the Decks_Store status is `loading`, THE Review_View SHALL render a Loading_State and SHALL NOT render review content.
4. WHEN the Decks_Store status becomes `ready`, THE Dashboard SHALL replace the Loading_State with the deck listing or the Empty_State.
5. WHEN the Decks_Store status becomes `ready`, THE Deck_Detail_View SHALL replace the Loading_State with deck content, an Empty_State, or an Error_State as applicable.
6. WHEN the Decks_Store status becomes `ready`, THE Review_View SHALL replace the Loading_State with review content, an Empty_State, or an Error_State as applicable.

### Requirement 3: Complete empty states

**User Story:** As a learner, I want each screen to explain when there is nothing
to show and offer a next step, so that empty screens guide me rather than confuse
me.

#### Acceptance Criteria

1. WHILE the Decks_Store is `ready` and contains no decks, THE Dashboard SHALL render the Empty_State containing a visible create-deck control and a visible import-deck control, each of which is keyboard-focusable and activates its respective flow when triggered.
2. WHILE the Deck_Detail_View is `ready` for an existing deck that contains no cards, THE Deck_Detail_View SHALL render an Empty_State containing a visible add-card control that is keyboard-focusable and activates the add-card flow when triggered.
3. WHILE the Review_View is `ready` for an existing deck that has no due cards, THE Review_View SHALL render an Empty_State containing visible text indicating that no cards are due and a visible navigation control that returns to the Deck_Detail_View for the same deck when triggered.
4. THE Empty_State on each screen SHALL present its primary message as visible text with a contrast ratio of at least 4.5:1 against its background.
5. WHILE the Decks_Store or a screen's data source is in a non-`ready` state (loading or error), THE respective screen SHALL NOT render the Empty_State.

### Requirement 4: Complete error states

**User Story:** As a learner, I want each screen to show a clear message when
something goes wrong, so that failures are understandable and never crash the
application.

#### Acceptance Criteria

1. WHILE the Decks_Store status is `error`, THE Dashboard SHALL render an Error_State containing a non-empty human-readable message and SHALL NOT render the deck listing or the Empty_State.
2. WHEN a requested deck identifier does not match any deck in the Decks_Store, THE Deck_Detail_View SHALL render an Error_State containing a non-empty message identifying the deck as not found and SHALL NOT render deck content.
3. WHEN a requested deck identifier does not match any deck in the Decks_Store, THE Review_View SHALL render an Error_State containing a non-empty message identifying the deck as not found and SHALL NOT render the review session controls.
4. IF grading a card during a Review_View fails to persist, THEN THE Review_View SHALL render an Error_State with a non-empty human-readable message within the application view rather than through a browser dialog, and SHALL retain the current review session state without advancing to the next card.
5. IF the Import_Flow receives a file that is unreadable, unparseable, or invalid, THEN the Import_Flow SHALL render an Error_State with a non-empty human-readable message and SHALL leave the Decks_Store unchanged.
6. THE Error_State on each screen SHALL expose its message through an alert region that assistive technology announces, and the alert region SHALL convey the failure through text content rather than color alone.

### Requirement 5: Post-review export reminder

**User Story:** As a learner, I want a reminder to export my updated deck after
reviewing, so that my study progress is captured in a durable JSON file.

#### Acceptance Criteria

1. WHEN the Review_View reaches its completion summary after at least one card has been graded, THE Review_View SHALL present a reminder to export the updated deck.
2. WHEN a user activates the export reminder from the Review_View completion summary, THE Export_Flow SHALL export the reviewed deck as a JSON file containing all deck cards with their updated review state.
3. IF the Review_View reaches its completion summary with zero cards graded, THEN THE Review_View SHALL NOT present the export reminder.
4. IF the Export_Flow fails while exporting from the completion summary, THEN THE Export_Flow SHALL indicate the failure and SHALL retain the updated review state unchanged.

### Requirement 6: Mobile-first responsive layout

**User Story:** As a learner, I want every screen to be usable at mobile, tablet,
and desktop widths, so that I can study on any device without broken layouts.

#### Acceptance Criteria

1. WHILE the viewport is at Mobile_Width, THE Dashboard, THE Deck_Detail_View, and THE Review_View SHALL each render as a single vertical column with all content fitting within the viewport width and no horizontal scrolling.
2. WHILE the viewport is at Tablet_Width, THE Dashboard, THE Deck_Detail_View, and THE Review_View SHALL each render their content fitting within the viewport width with no horizontal scrolling.
3. WHILE the viewport is at Desktop_Width, THE Dashboard, THE Deck_Detail_View, and THE Review_View SHALL each render their content fitting within the viewport width with no horizontal scrolling.
4. THE App_Shell SHALL author base styles for Mobile_Width first and layer wider treatments through the `sm:`, `md:`, and `lg:` breakpoint prefixes.
5. WHILE any supported viewport width is active and the user scrolls, THE App_Header SHALL remain visible or reachable at the top of the layout.

### Requirement 7: Consistent AWS palette and accent usage

**User Story:** As a learner, I want a consistent visual identity across screens,
so that the application feels cohesive and readable.

#### Acceptance Criteria

1. THE Dashboard, THE Deck_Detail_View, and THE Review_View SHALL style all interactive elements and surface elements using AWS_Palette tokens, with no hardcoded color values outside the AWS_Palette token set.
2. THE App_Shell SHALL render body text using AWS_Palette tokens that maintain a contrast ratio of at least 4.5:1 against their background, and large text at a contrast ratio of at least 3:1 against their background.
3. WHERE `aws-orange` is applied, THE App_Shell SHALL use it as an accent for interactivity or emphasis and SHALL NOT apply it as the background fill of any content area exceeding 25% of the viewport area.
4. WHERE a semantic color communicates meaning, THE App_Shell SHALL pair that color with a text label or an icon so that the meaning remains identifiable when the color is removed.

### Requirement 8: No hydration warnings from client pages

**User Story:** As a developer, I want the localStorage-backed client pages to
render without hydration warnings, so that server and client output stay in sync.

#### Acceptance Criteria

1. WHILE the client has not yet mounted, WHEN the Dashboard, THE Deck_Detail_View, or THE Review_View performs its initial client render, THE Hydration_Guard SHALL defer all reads from Local_Storage until the mount lifecycle completes.
2. WHEN the Dashboard, THE Deck_Detail_View, or THE Review_View performs its initial client render before mount completes, THE App_Shell SHALL produce client markup that matches the server-rendered markup so that no hydration warning is emitted to the developer console.
3. WHEN the client mount completes for the Dashboard, THE Deck_Detail_View, or THE Review_View, THE Hydration_Guard SHALL read from Local_Storage and re-render the view so that persisted state becomes visible after hydration.
4. IF a read from Local_Storage fails or returns absent data during the post-mount read, THEN THE Hydration_Guard SHALL render the view using its defined default empty state, leaving any existing Local_Storage data unmodified.

### Requirement 9: Clean lint and build with no orphaned scaffolding

**User Story:** As a developer, I want a clean lint and build with no leftover
scaffolding, so that the codebase is production-clean and maintainable.

#### Acceptance Criteria

1. WHEN `npm run lint` is run against the project, THE Quality_Gate SHALL complete with a success exit status and no ESLint errors.
2. WHEN `npm run build` is run against the project, THE Quality_Gate SHALL complete with a success exit status and a successful production build.
3. THE project SHALL contain no dev-only placeholder scaffolding left over from the initial `app/page.tsx`.
4. THE project SHALL contain no components or modules that are unreferenced by any route, component, or test.
5. WHERE an ESLint rule is disabled inline, THE project SHALL include a justification comment for that disablement.

### Requirement 10: End-to-end flow integration

**User Story:** As a learner, I want the full study flow to work end to end across
screens, so that importing, editing, reviewing, and exporting form one cohesive
path.

#### Acceptance Criteria

1. WHEN a user imports a valid deck file from the Dashboard, THE Dashboard SHALL display the imported deck as a new entry in the deck listing showing the deck's title and its card count.
2. IF a user attempts to import a file that is not a valid deck, THEN THE Import_Flow SHALL reject the import, leave the existing deck listing unchanged, and surface an Error_State indicating the file could not be imported.
3. WHEN a user navigates from the Dashboard to a listed deck, THE Deck_Detail_View SHALL display that deck's cards in the same count and order as recorded for that deck.
4. WHILE a selected deck contains zero cards, WHEN a user navigates to it from the Dashboard, THE Deck_Detail_View SHALL display an empty-state indication rather than a card list.
5. WHEN a user grades every due card in a Review_View started from the Deck_Detail_View, THE Review_View SHALL display a completion summary reporting the number of cards reviewed.
6. WHEN a user exports a deck through the Export_Flow after reviewing it, THE Export_Flow SHALL produce a JSON file whose re-import through the Import_Flow completes without an Error_State and yields a deck with the same card count and card contents as the exported deck.
