---
inclusion: fileMatch
fileMatchPattern: '{app,components,contexts}/**/*.{tsx,ts}'
---

# UI Patterns

Conventions for the app's UI shell, navigation, and empty states. Apply these
when building or changing pages, components, or contexts. These complement (do
not replace) the Visual Identity and Tech Stack steering.

## App shell & navigation

- The app shell composes, in order: `AppHeader` (persistent navbar) →
  `ContextualActionBar` (route-aware) → page `main`. All three live inside a
  single `UIActionsProvider` in `app/layout.tsx` so the bar and the pages share
  action state.
- Keep `AppHeader` / `NavLinks` slim and route-agnostic. The persistent
  "Dashboard" nav item stays visible on every route. Do not add page-specific
  actions to `AppHeader`.
- Page-specific actions belong in the **contextual action bar**, not in a
  page-body header. Do not reintroduce in-body action rows / headers.

## Contextual action bar

- `ContextualActionBar` is a Client Component that renders from
  `usePathname()` + `useUIActions()`. It renders `null` on any route without a
  matching registration (e.g. the review route).
- Route detection:
  - Landing: pathname `"/"`.
  - Deck detail: pathname matches `/^\/deck\/[^/]+$/` (exclude nested routes
    like `/review`).
- Per-route contents:
  - **Landing (`/`)**: `New deck` (primary) and `Upload deck`.
  - **Deck (`/deck/:id`)**: the deck name as static text on the left; `Dashboard`
    (link to `/`), `Add card`, and `Study` (links to `/deck/:id/review`) on the
    right. `Study` is the canonical label — never "Start review".
- Styling: an `aws-squid-ink` sub-bar beneath the header. Reserve `aws-orange`
  for the single primary CTA (with `text-aws-squid-ink` for contrast); other
  controls are secondary. Mobile-first: stack on small screens, row from `sm:`.

## Registering page actions (`UIActionsContext`)

- Pages own their overlays (deck form, card form) and register **intent** with
  the bar via `useUIActions()`; the bar dispatches, the page renders the
  overlay.
- Register on mount and whenever the relevant inputs change; **clear on unmount
  and when the target is absent** (e.g. deck not found / still loading) so a
  stale bar never persists across navigation.
  - Landing: `registerLandingActions({ onNewDeck, onUploadDeck })`.
  - Deck: `registerDeckActions({ deckId, deckName, onAddCard, onStudyHref })`.
- `useUIActions()` throws outside its provider (fail fast), mirroring
  `useDecks()`.

## Imperative pickers

- When a control in the bar must trigger UI owned by a page (e.g. the file
  picker for "Upload deck"), expose an imperative handle via `forwardRef` +
  `useImperativeHandle` (e.g. `ImportControl` → `openFilePicker()`). Keep the
  underlying input visually hidden with `sr-only` and keep its `<label>` in the
  accessibility tree.

## Empty states

- Provide a purposeful empty state for each list. Pair the message with a clear
  create affordance that calls the shared action (e.g. the empty state's
  create button and the bar's action open the same overlay).
- Own each empty state in exactly one place — do not duplicate an empty-cards /
  empty-decks presentation across a page and a list component. `CardList`
  renders only the populated grid; the deck page owns the empty-cards state.

## Layout

- **Landing deck listing**: a single centered column (`flex flex-col`) in a
  `max-w-2xl mx-auto` container — one full-width deck card stacked below the
  next. Not a multi-column grid.
- **Deck cards grid**: responsive card grid centered in its container.
- Cards use `bg-aws-white` on an `aws-gray-100` page background with
  `border-aws-gray-200`; keep the layout fluid and mobile-first.

## Accessibility

- Convey active/selected state with more than color (e.g. border + weight)
  alongside `aria-current` — see `NavLinks`.
- Maintain the contrast rules from Visual Identity; never place `aws-orange`
  text on white/light-gray for body copy.
