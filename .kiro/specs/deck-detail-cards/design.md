# Design Document

## Overview

Cards Within a Deck (slice 3 of 6) gives each deck a dedicated detail page at the dynamic
route `/deck/[id]` where a user lists, creates, edits, and deletes that deck's cards. The
card front and back are authored through a Zod-validated form that shows a **live markdown
preview** as the user types. This is the slice where the study content that later review
slices consume actually gets written.

The design builds directly on the seams established in slice 1 (walking skeleton) and
slice 2 (deck CRUD) and changes as little as possible:

- **`types/deck.ts`** stays the single source of truth. We grow `cardSchema`/`Card` from a
  bare `{ id }` into the full study-card shape (`front`, `back`, `box`, `lastReviewed`,
  `createdAt`, `id`) and add a **new** `cardFormSchema` that validates only the
  user-editable fields (front, back). Types are `z.infer`red so runtime validation and
  compile-time types never drift. The grown `cardSchema` stays compatible with
  `deckSchema.cards`, so a `DeckList` of grown cards round-trips through the persistence
  layer unchanged.
- **`contexts/DecksContext.tsx`** remains the client-side single source of truth. We keep
  the existing hydration guard, persistence effect, and the discriminated-result pattern of
  the deck actions, and add three new card actions — `addCard`, `updateCard`, `deleteCard`
  — that operate on a deck by id and follow the same `{ ok: true, ... } | { ok: false,
  error }` shape.
- **`lib/storage.ts`** is unchanged. Cards now carry additional string/number/null fields,
  which round-trip through JSON like any other field and are validated by the existing
  `deckListSchema` on load.
- A **new** client page `app/deck/[id]/page.tsx` reads the route id via React's
  `use(params)`, looks the deck up in the store behind the same hydration guard the
  Dashboard uses, and renders a loading state, a deck-missing state, or the deck's cards.
- Four **new** components render the card UI: a reusable `Markdown` view over
  `react-markdown` + `remark-gfm`, a `CardForm` create/edit modal with a live preview, and a
  `CardList` / `CardItem` pair for the listing. Deletion reuses the slice-2 `DeleteConfirm`.

Validation runs on the client (for UX) via `cardFormSchema`, and again inside the store
actions (for integrity) before the deck list is mutated — matching the requirement that the
store validate card input before modifying state (Requirements 6.7, 6.8).

Two new dependencies, `react-markdown` and `remark-gfm`, provide the GitHub Flavored
Markdown rendering used by the preview and reused by a later review slice.

**Requirements coverage:** this overview frames Requirements 1–8; each section below maps
back to the specific acceptance criteria it satisfies.

## Architecture

### Layering

The feature preserves the slice-1/slice-2 layering. Data and validation flow one direction
on input, and rendering flows back out from store state:

```
User → CardForm / DeleteConfirm (client)
     → cardFormSchema (Zod, client-side validation)
     → DecksContext actions (addCard / updateCard / deleteCard)  ← store validates again
     → lib/storage.ts (localStorage seam, never throws)
     → DecksContext state update
     → Deck detail page re-render (CardList / empty-cards state / error)
```

- **Presentation** — the `/deck/[id]` page, `CardList`, `CardItem`, `CardForm`, `Markdown`,
  and the reused `DeleteConfirm`. Only components that need interactivity are `"use client"`.
- **State & domain logic** — `DecksContext` holds the in-memory list, owns card id / `box` /
  `lastReviewed` / `createdAt` generation, enforces invariants, and translates persistence
  results into `DecksError`s.
- **Validation** — `cardFormSchema` and the grown `cardSchema` in `types/deck.ts`.
- **Persistence** — `lib/storage.ts`, the sole `localStorage` seam (unchanged).

### Route and hydration

`app/deck/[id]/page.tsx` is a Client Component (`"use client"`) because it consumes the
`DecksContext` store and holds overlay UI state. It reads the dynamic segment with React's
`use(params)`, typed with the globally-available `PageProps<'/deck/[id]'>` helper (no import,
matching the existing `LayoutProps<"/">` usage in `app/layout.tsx`). Per the bundled Next.js
16 docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`),
`params` is a `Promise` in a Client Component page and is unwrapped with `use(params)`.

The page never reads `localStorage` during render; it relies on the store's existing
hydration guard. It branches on the store `status`/`decks` exactly like the Dashboard:

- **`status !== "ready"`** — render a loading state (the store has not finished its initial
  load) (Requirement 1.5).
- **`status === "ready"` and a deck matches the route id** — render the deck name and the
  `CardList` for that deck's cards (Requirements 1.1, 1.2, 1.3).
- **`status === "ready"` and no deck matches** — render the deck-missing state
  (Requirement 1.6).

### UI state ownership

The detail page owns a small piece of local UI state describing which overlay (if any) is
open and, for edit/delete, which card it targets. Lifting this state to the page keeps
`CardItem` free of overlay concerns and lets the "Add card" button and each card's controls
open the same form/dialog.

```ts
type CardOverlay =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; card: Card }
  | { kind: "delete"; card: Card };
```

- **Create** entry point (page header "Add card") sets `{ kind: "create" }`.
- **Edit** on a card sets `{ kind: "edit", card }`.
- **Delete** on a card sets `{ kind: "delete", card }`.
- Closing any overlay returns to `{ kind: "closed" }`.

Because `CardItem` renders a card's front and box badge from props, its interactive
edit/delete buttons live in a tiny client leaf (`CardItemActions`) that receives the target
card plus open callbacks — mirroring the `DeckCard` / `DeckCardActions` split from slice 2.
This keeps interactivity at the leaf while `CardItem` stays prop-driven. (Requirements 3.1,
4.1)

### Component/data-flow diagram

```mermaid
flowchart TD
    subgraph Client
        DP[DecksProvider\ncontexts/DecksContext]
        PG[deck/[id] page\n'use client' + use(params)]
        CL[CardList\nprop-driven]
        CI[CardItem\nprop-driven]
        CIA[CardItemActions\n'use client']
        CF[CardForm\n'use client']
        MD[Markdown\nreact-markdown + remark-gfm]
        DConf[DeleteConfirm\n'use client', reused]
    end

    Schema[cardFormSchema / cardSchema\ntypes/deck.ts]
    Storage[lib/storage.ts\nlocalStorage seam]

    DP -->|decks, status| PG
    PG -->|deck lookup by route id| PG
    PG -->|cards prop| CL
    CL -->|card prop| CI
    CI --> CIA
    PG -->|open create/edit| CF
    PG -->|open delete| DConf

    CIA -->|onEdit/onDelete| PG
    CF -->|live preview| MD
    CF -->|validate input| Schema
    CF -->|addCard / updateCard| DP
    DConf -->|deleteCard| DP

    DP -->|validate before mutate| Schema
    DP -->|loadDecks / saveDecks| Storage
```

## Components and Interfaces

### `types/deck.ts` (grown)

Grow `cardSchema` to the full study-card shape and add a dedicated card-form schema. The
existing `isoTimestamp` helper is reused for `createdAt`; `lastReviewed` is that same
timestamp shape **or** `null`.

```ts
import { z } from "zod";

// ISO 8601 timestamp: non-empty, 1–30 chars, parseable as a real date.
// (Existing helper — reused for card createdAt and, nullable, for lastReviewed.)
const isoTimestamp = z
  .string()
  .min(1)
  .max(30)
  .refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "timestamp must be a valid ISO 8601 timestamp",
  });

// Grown from `{ id }` to the full study-card shape.
export const cardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1).max(5000),
  back: z.string().min(1).max(5000),
  box: z.number().int().min(1),
  lastReviewed: isoTimestamp.nullable(),
  createdAt: isoTimestamp,
});

// Unchanged: a deck still holds an array of cards, now the grown shape.
export const deckSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  cards: z.array(cardSchema).max(1000),
  createdAt: isoTimestamp,
});

export const deckListSchema = z.array(deckSchema).max(10_000);

// Unchanged from slice 2 (retained): validates the user-editable deck fields.
// export const deckFormSchema = z.object({ name: …, description: … });

// New: validates only the user-editable card fields (create + edit).
export const cardFormSchema = z.object({
  front: z.string().trim().min(1, "Front is required").max(5000, "Front exceeds 5000 characters"),
  back: z.string().trim().min(1, "Back is required").max(5000, "Back exceeds 5000 characters"),
});

export type Card = z.infer<typeof cardSchema>;
export type Deck = z.infer<typeof deckSchema>;
export type DeckList = z.infer<typeof deckListSchema>;
export type DeckFormInput = z.infer<typeof deckFormSchema>;
export type CardFormInput = z.infer<typeof cardFormSchema>;
```

The grown `cardSchema` remains structurally compatible with `deckSchema.cards`: a deck of
grown cards still validates through `deckSchema`/`deckListSchema`, so the `lib/storage.ts`
save/load round-trip needs no change (Requirements 7.7, 8.2, 8.3). `types/index.ts`
barrel-exports the grown `Card`, `cardSchema`, the new `cardFormSchema`, and `CardFormInput`.
(Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8)

### `types/index.ts` (extended)

```ts
export type { Card, Deck, DeckList, DeckFormInput, CardFormInput } from "./deck";
export {
  cardSchema,
  deckSchema,
  deckListSchema,
  deckFormSchema,
  cardFormSchema,
} from "./deck";
```

### `contexts/DecksContext.tsx` (extended)

Keep the existing provider shape, hydration guard (`loadedRef`), hydration effect, and
persistence effect. Add `addCard`, `updateCard`, and `deleteCard` following the same
discriminated-result pattern as the deck actions. Each card action locates the target deck
by id, and — for update/delete — the target card by id.

The `DecksError` union gains a card-form-flavored `validation` shape. Because a `validation`
error must be able to flag either deck fields (`name`/`description`) or card fields
(`front`/`back`), the `fields` map is widened to cover both field sets; the existing
`toValidationError` helper is generalized to key on `front`/`back` as well as
`name`/`description`.

```ts
/** Fields a `validation` error can flag (deck form or card form). */
export type DeckFormField = "name" | "description";
export type CardFormField = "front" | "back";
export type FormField = DeckFormField | CardFormField;

export type DecksError =
  | { code: "name-required"; message: string }
  | { code: "duplicate-id"; message: string }
  | { code: "persistence"; message: string }
  | { code: "invalid-data"; message: string }
  | { code: "validation"; message: string; fields: Partial<Record<FormField, string>> }
  | { code: "not-found"; message: string };

export interface AddCardInput {
  deckId: string;
  front: string;
  back: string;
}

export interface UpdateCardInput {
  deckId: string;
  cardId: string;
  front: string;
  back: string;
}

export type AddCardResult =
  | { ok: true; card: Card }
  | { ok: false; error: DecksError };

export type UpdateCardResult =
  | { ok: true; card: Card }
  | { ok: false; error: DecksError };

export type DeleteCardResult =
  | { ok: true; deckId: string; cardId: string }
  | { ok: false; error: DecksError };

export interface DecksContextValue {
  decks: DeckList;
  status: DecksStatus;
  error: DecksError | null;
  addDeck: (input: AddDeckInput) => AddDeckResult;
  updateDeck: (input: UpdateDeckInput) => UpdateDeckResult;
  deleteDeck: (id: string) => DeleteDeckResult;
  addCard: (input: AddCardInput) => AddCardResult;
  updateCard: (input: UpdateCardInput) => UpdateCardResult;
  deleteCard: (deckId: string, cardId: string) => DeleteCardResult;
}
```

**`addCard`** — validate front/back with `cardFormSchema`; locate the deck by id (a missing
deck is `not-found`); build a new card with a generated id, `box: 1`, `lastReviewed: null`,
and `createdAt` set to the current ISO timestamp; append it to that deck's cards while
preserving the deck's existing cards and every other deck:

```ts
const addCard = useCallback((input: AddCardInput): AddCardResult => {
  const parsed = cardFormSchema.safeParse({ front: input.front, back: input.back });
  if (!parsed.success) {
    const error = toValidationError(parsed.error); // { code: "validation", fields }
    setError(error);
    return { ok: false, error }; // list unchanged (Requirements 2.10, 6.7, 6.8)
  }

  const index = decks.findIndex((d) => d.id === input.deckId);
  if (index === -1) {
    const error: DecksError = { code: "not-found", message: `No deck with id "${input.deckId}".` };
    setError(error);
    return { ok: false, error }; // list unchanged (Requirement 2.11)
  }

  const card: Card = {
    id: crypto.randomUUID(),
    front: parsed.data.front, // trimmed by schema
    back: parsed.data.back,   // trimmed by schema
    box: 1,
    lastReviewed: null,
    createdAt: new Date().toISOString(),
  };

  setError(null);
  setDecks((prev) =>
    prev.map((d) => (d.id === input.deckId ? { ...d, cards: [...d.cards, card] } : d)),
  );
  return { ok: true, card };
}, [decks]);
```

**`updateCard`** — validate front/back; locate the deck, then the card; if either is absent
return `not-found`; replace only `front`/`back` with the trimmed values while preserving the
card's `id`, `box`, `lastReviewed`, and `createdAt`, every other card in that deck, and every
other deck:

```ts
const updateCard = useCallback((input: UpdateCardInput): UpdateCardResult => {
  const parsed = cardFormSchema.safeParse({ front: input.front, back: input.back });
  if (!parsed.success) {
    const error = toValidationError(parsed.error);
    setError(error);
    return { ok: false, error };
  }

  const deck = decks.find((d) => d.id === input.deckId);
  const existing = deck?.cards.find((c) => c.id === input.cardId);
  if (!deck || !existing) {
    const error: DecksError = { code: "not-found", message: "Card not found." };
    setError(error);
    return { ok: false, error }; // list unchanged (Requirement 3.10)
  }

  const updated: Card = {
    ...existing,                // preserves id, box, lastReviewed, createdAt
    front: parsed.data.front,
    back: parsed.data.back,
  };

  setError(null);
  setDecks((prev) =>
    prev.map((d) =>
      d.id === input.deckId
        ? { ...d, cards: d.cards.map((c) => (c.id === input.cardId ? updated : c)) }
        : d,
    ),
  );
  return { ok: true, card: updated };
}, [decks]);
```

**`deleteCard`** — locate the deck, then the card; a missing deck or card is a no-op
returning `not-found`; otherwise remove exactly the target card, preserving every other card
and every other deck:

```ts
const deleteCard = useCallback((deckId: string, cardId: string): DeleteCardResult => {
  const deck = decks.find((d) => d.id === deckId);
  if (!deck || !deck.cards.some((c) => c.id === cardId)) {
    const error: DecksError = { code: "not-found", message: "Card not found." };
    setError(error);
    return { ok: false, error }; // no removal, list unchanged (Requirement 4.8)
  }
  setError(null);
  setDecks((prev) =>
    prev.map((d) =>
      d.id === deckId ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) } : d,
    ),
  );
  return { ok: true, deckId, cardId };
}, [decks]);
```

The existing persistence effect writes on every `[decks]` change, so each card create/edit/
delete triggers a `saveDecks`; a write failure surfaces a `persistence` error while the
in-memory list is retained (Requirements 2.9, 3.9, 4.6, 8.4). (Requirements 2.2–2.7, 2.11,
3.2–3.7, 3.10, 4.3, 4.4, 4.8, 6.7, 6.8)

### `app/deck/[id]/page.tsx` (new, `"use client"`)

The deck detail route. It reads the route id, looks up the deck behind the store's hydration
guard, and renders one of three states. Per the Next.js 16 docs, a Client Component page
receives `params` as a `Promise` and unwraps it with `use(params)`.

```tsx
"use client";

import { use, useState } from "react";
import { useDecks } from "@/contexts/DecksContext";
import CardList from "@/components/CardList";
import CardForm from "@/components/CardForm";
import DeleteConfirm from "@/components/DeleteConfirm";
import type { Card } from "@/types";

type CardOverlay =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; card: Card }
  | { kind: "delete"; card: Card };

// `PageProps<'/deck/[id]'>` is globally available (matches LayoutProps<"/"> usage) — no import.
export default function DeckDetailPage({ params }: PageProps<"/deck/[id]">) {
  const { id } = use(params); // Route_Deck_Id (Requirement 1.1)
  const { decks, status, deleteCard } = useDecks();
  const [overlay, setOverlay] = useState<CardOverlay>({ kind: "closed" });

  if (status !== "ready") {
    return /* loading state (Requirement 1.5) */;
  }

  const deck = decks.find((d) => d.id === id);
  if (!deck) {
    return /* Deck_Missing_State (Requirement 1.6) */;
  }

  // deck name + <CardList deckId={deck.id} cards={deck.cards} … /> (Requirements 1.2, 1.3)
  // overlay renders <CardForm> for create/edit and <DeleteConfirm> for delete.
}
```

Behavior:

- `use(params)` yields the `Route_Deck_Id` (Requirement 1.1).
- While `status` is not `"ready"`, render a loading state and never touch `localStorage`
  during render — hydration is handled by the provider effect (Requirement 1.5).
- When ready and a deck matches, render the deck name and `CardList` (Requirements 1.2, 1.3).
- When ready and no deck matches, render the deck-missing state (Requirement 1.6).
- The overlay wires create/edit to `CardForm` and delete to `DeleteConfirm`; confirming
  delete calls `deleteCard(deck.id, card.id)` then closes (Requirements 2.1, 3.1, 4.1, 4.3).

Styling uses the AWS palette on a mobile-first layout (dark `bg-aws-squid-ink` header
context inherited from the app shell; card list on the `aws-gray-100` page background).

### `components/Markdown.tsx` (new, reusable)

A thin wrapper over `react-markdown` configured with the `remark-gfm` plugin. It is the sole
place markdown rendering is configured, so the `CardForm` preview and a later review slice
share identical rendering behavior (Requirements 5.3, 5.4).

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownProps {
  /** Raw markdown source; may be empty (renders nothing, without error). */
  children: string;
}

export default function Markdown({ children }: MarkdownProps) {
  return (
    <div className="prose-sm max-w-none text-aws-gray-900">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
```

- GitHub Flavored Markdown emphasis such as `**bold**` renders as a `<strong>` element
  (Requirement 5.3).
- An empty string renders an empty preview without error (Requirement 5.5).
- Whether this stays server-renderable or is marked `"use client"` follows how
  `react-markdown` is consumed; it takes only a `children` string prop and holds no state.

### `components/CardForm.tsx` (new, `"use client"`)

A controlled create/edit form rendered inside a modal, mirroring `DeckForm`'s a11y and
validation shape. It owns local `front`/`back` state and per-field error state, validates
with `cardFormSchema` on submit, retains user input on failure, and renders a live
`Markdown_Preview` of both fields as the user types.

```ts
export type CardFormMode =
  | { kind: "create" }
  | { kind: "edit"; card: Card };

export interface CardFormProps {
  /** The deck the card belongs to; used for addCard/updateCard. */
  deckId: string;
  mode: CardFormMode;
  /** Close the overlay; called on cancel and on a successful submit. */
  onClose: () => void;
}
```

Behavior:

- **Create mode** starts with empty `front`/`back`; **edit mode** pre-fills from `mode.card`
  (Requirements 2.1, 3.1).
- As the user types, a `Markdown_Preview` region renders the current `front` and `back`
  through `Markdown`, updating without a page reload; empty fields render an empty preview
  (Requirements 5.1, 5.2, 5.5).
- On submit, parse `{ front, back }` with `cardFormSchema`. On failure, set field-level
  errors from `error.issues` (keyed by `issue.path[0]`), keep the entered values, and do not
  call the store (Requirements 6.3, 6.4, 6.5, 6.6).
- On success, call `addCard` (create) or `updateCard` (edit) on the store, which re-validates
  for integrity. If the store returns a `validation`/`not-found`/`persistence` error, surface
  it; otherwise close the overlay (Requirements 2.2, 3.2, 6.7, 6.8).

Accessibility (mirrors `DeckForm`): rendered inside a modal with `role="dialog"`,
`aria-modal="true"`, and `aria-labelledby` pointing at its heading; each field has an
associated `<label>` and `aria-describedby` linking to its error text; error text uses
`role="alert"`. Styling uses the AWS palette (primary submit `bg-aws-orange` with
`text-aws-squid-ink` and `hover:bg-aws-orange-dark`; neutral/blue cancel), mobile-first with
`sm:` layout refinements.

### `components/CardList.tsx` (new, prop-driven)

Renders a deck's cards. It maps each card to a `CardItem`, and renders an empty-cards state
when the deck has no cards (Requirements 1.3, 1.7). It receives the `deckId` plus overlay-open
callbacks and threads them to each `CardItem`.

```ts
export interface CardListProps {
  deckId: string;
  cards: Card[];
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
}
```

### `components/CardItem.tsx` (new, prop-driven)

Renders one card: its `front` text and a `Box_Badge` showing the card's Leitner box with an
accessible text label (never color alone), plus the per-card edit/delete controls
(Requirements 1.4, 3.1, 4.1). Following the `DeckCard` / `DeckCardActions` split, the
interactive buttons live in a small `"use client"` leaf (`CardItemActions`) so `CardItem`
itself stays prop-driven.

```ts
export interface CardItemProps {
  card: Card;
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
}

// components/CardItemActions.tsx ("use client")
export interface CardItemActionsProps {
  card: Card;
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
}
```

The `Box_Badge` renders text such as `Box 1` (a visible label, not color alone), so meaning
never depends on color (Requirement 1.4, Visual Identity accessibility rule).

### `components/DeleteConfirm.tsx` (reused, unchanged)

The slice-2 confirmation dialog is reused for card deletion. Its `deck.name` heading suffices
for the confirmation copy; the detail page wires `onConfirm` to `deleteCard(deck.id, card.id)`
and `onCancel` to closing the overlay and returning focus to the delete trigger. It presents
exactly one confirm control (`bg-aws-error`, text label) and one cancel control, and performs
no deletion without an explicit confirm (Requirements 4.1, 4.2, 4.7).

## Data Models

### `Card` (grown)

```ts
interface Card {
  id: string;              // non-empty; generated via crypto.randomUUID() on create
  front: string;           // 1–5000 chars, trimmed
  back: string;            // 1–5000 chars, trimmed
  box: number;             // integer ≥ 1; new cards default to 1
  lastReviewed: string | null; // ISO 8601 timestamp (1–30 chars) or null for never-reviewed
  createdAt: string;       // ISO 8601 timestamp, set once, preserved across edits
}
```

### `CardFormInput` (new)

```ts
interface CardFormInput {
  front: string; // trimmed, 1–5000
  back: string;  // trimmed, 1–5000
}
```

### Field design decisions

- **`box`** is an integer ≥ 1 (`z.number().int().min(1)`); new cards default to `1`
  (Requirements 2.4, 7.3). It is preserved across edits (Requirement 3.4).
- **`lastReviewed`** is `isoTimestamp.nullable()`: either a valid ISO 8601 string of 1–30
  chars or `null`, so a never-reviewed card is representable and JSON-serializable. New cards
  default to `null` (Requirements 2.5, 7.4). It is preserved across edits (Requirement 3.5).
- **`createdAt`** reuses the existing `isoTimestamp` pattern (non-empty, 1–30 chars,
  `Date.parse` must succeed), assigned once in `addCard` from `new Date().toISOString()`
  (Requirements 2.6, 7.5). `updateCard` copies the existing card and never overwrites it, so
  it is preserved across edits (Requirement 3.6).
- **`front`/`back`** are bounded 1–5000 chars in both `cardSchema` (persisted shape) and
  `cardFormSchema` (form input, additionally trimmed) so form validation and stored-shape
  validation agree (Requirements 6.1, 6.2, 7.2).

### Compatibility and persistence

The grown `cardSchema` is a superset of the old `{ id }` shape and remains an element of
`deckSchema.cards`, so a `Deck` containing grown cards validates through
`deckSchema`/`deckListSchema` unchanged. `lib/storage.ts` is **not** modified:
`saveDecks`/`loadDecks` serialize and validate the whole `DeckList`, and the added card
fields (`front`, `back`, `box`, `lastReviewed`, `createdAt`) are included and validated
automatically on load. A stored deck list whose cards carry the grown fields loads back equal
to what was written (Requirements 7.7, 8.1, 8.2, 8.3).

### Test arbitraries (`test/arbitraries.ts`)

`arbCard` must be grown from `{ id }` to the full card shape so every deck/persistence
property exercises the grown cards:

- `arbCardFront` / `arbCardBack`: non-empty strings that stay valid after trimming (1–5000;
  bounded well below the cap for speed), guaranteeing at least one non-whitespace character.
- `arbBox`: `fc.integer({ min: 1, max: ... })`.
- `arbLastReviewed`: `fc.option(arbCreatedAt, { nil: null })` (reuses the existing
  `arbCreatedAt` for the non-null branch).
- Grow `arbCard` to `{ id, front, back, box, lastReviewed, createdAt }`, reusing the existing
  `arbCreatedAt` for `createdAt`. `arbCards`, `arbDeck`, and `arbLargeDeckList` pick up the
  grown shape automatically (the large-list helper supplies a fixed valid card if it needs
  non-empty card arrays).
- `arbCardFormInput`: a valid `{ front, back }` (each non-empty after trimming, ≤5000) for
  the create/update property tests.
- Invalid companions for the rejection property: `arbEmptyOrWhitespace` (empty or
  whitespace-only) and `arbOverlongText` (>5000 chars), used to build invalid front and/or
  back inputs.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid
executions of a system — essentially, a formal statement about what the system should do.
Properties serve as the bridge between human-readable specifications and machine-verifiable
correctness guarantees.*

This slice is well suited to property-based testing because the card store actions, schema
validation, and persistence are pure input/output logic with universal invariants (append,
preservation, idempotence, round-trips, rejection). It reuses the existing `fast-check`
setup and arbitraries. Route rendering, the markdown `**bold**` → `<strong>` behavior, focus
management, and specific render assertions are covered by example-based unit tests instead
(see Testing Strategy).

The properties below are the **new** properties introduced by this slice. Two existing
properties are **extended** to carry the grown card fields — the deck schema validation
round-trip and the persistence round-trip — because both now flow grown cards through
`deckSchema`/`deckListSchema`. The existing slice-1/slice-2 write-failure, load-resilience,
and hydration-determinism properties already cover Requirement 8.4 and need no change beyond
the grown `arbCard` arbitrary.

### Property 1: Card schema validation round-trip over the grown shape

*For any* valid card (a `front` and `back` of 1–5000 characters, an integer `box` ≥ 1, a
`lastReviewed` that is either `null` or an ISO 8601 timestamp of 1–30 characters, and a
non-empty ISO 8601 `createdAt` of 1–30 characters), `cardSchema.parse` returns a value equal
to the input; and *for any* card that violates at least one constraint — an empty/overlong
`front` or `back`, a non-integer or `< 1` `box`, a non-null non-ISO `lastReviewed`, or an
empty/unparseable `createdAt` — `cardSchema.safeParse` reports failure.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

### Property 2: Creating a valid card appends one card with the correct defaults and preserves the rest

*For any* deck list containing a deck with a given id and *any* valid card-form input (a
`front` and `back` each non-empty of at most 5000 characters after trimming), `addCard`
appends exactly one card to that deck whose `id` is a non-empty string distinct from every
existing card id in that deck, whose `box` equals the integer `1`, whose `lastReviewed` is
`null`, and whose `createdAt` parses as a valid ISO 8601 timestamp, with `front`/`back` set
to the trimmed input; every pre-existing card in that deck is retained in its original order
and every other deck is left unchanged.

**Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

### Property 3: Updating a card preserves id/box/lastReviewed/createdAt and every other card and deck

*For any* deck list containing a deck with a card of a given id and *any* valid card-form
input, calling `updateCard` for that deck id and card id yields a card with the same `id`,
`box`, `lastReviewed`, and `createdAt` as before, and with `front`/`back` set to the
submitted trimmed values; every other card in that deck and every other deck in the list
remain unchanged in their original order.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

### Property 4: A card action for an absent deck or card is a no-op that returns not-found

*For any* deck list and *any* deck id not present in that list, `addCard` and `updateCard`
return an error result with code `not-found` and leave the deck list unchanged; and *for any*
deck list containing a deck and *any* card id not present in that deck, `updateCard` returns
`not-found` and leaves the deck list unchanged.

**Validates: Requirements 2.11, 3.10**

### Property 5: Deleting removes exactly the target card and is idempotent for absent ids

*For any* deck list containing a deck with a card of a given id, `deleteCard` removes exactly
that card from that deck (every other card retained in its original order, every other deck
unchanged); and *for any* deck list and *any* card id absent from the target deck — or
deleting the same card id a second time — `deleteCard` returns an error result with code
`not-found` and leaves the deck list unchanged; that is, `deleteCard(deckId, cardId)` applied
twice produces the same list as applying it once.

**Validates: Requirements 4.3, 4.4, 4.8**

### Property 6: Invalid card input is rejected, leaves the list unchanged, and identifies each invalid field

*For any* deck list containing a target deck and *any* invalid card-form input — a `front`
and/or `back` that is empty, whitespace-only, or longer than 5000 characters — both `addCard`
and `updateCard` reject the change, leave the deck list unchanged, and return a validation
error whose fields identify each invalid field (`front` and/or `back`).

**Validates: Requirements 2.10, 3.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8**

### Property 7: Persistence round-trip preserves the deck list including grown card fields

*For any* valid deck list whose decks contain cards carrying the grown fields (`front`,
`back`, `box`, `lastReviewed`, `createdAt`), `saveDecks` followed by `loadDecks` yields an
equal deck list — same decks, same cards, same fields (including every grown card field), in
the same order.

**Validates: Requirements 7.7, 8.1, 8.2, 8.3**

## Error Handling

All failures are represented as data, never thrown across a render boundary, consistent with
slices 1 and 2.

- **Form validation (client)** — `CardForm` parses input with `cardFormSchema` on submit. On
  failure it maps `error.issues` to per-field messages (keyed by `issue.path[0]`), renders
  them inline with `role="alert"` beside the offending field, retains the entered values, and
  does not call the store (Requirements 6.3, 6.4, 6.5, 6.6).

- **Store validation (integrity)** — `addCard`/`updateCard` re-validate with `cardFormSchema`
  before mutating. On failure they set and return a `{ code: "validation", fields }` error and
  leave the list unchanged (Requirements 2.10, 3.11, 6.7, 6.8). `CardForm` maps any returned
  `fields` back onto the inputs.

- **Not found** — `addCard` for an unknown deck id, and `updateCard`/`deleteCard` for an
  unknown deck or card id, return `{ code: "not-found" }` and perform no mutation
  (Requirements 2.11, 3.10, 4.8).

- **Persistence failure** — the existing persistence effect surfaces `{ code: "persistence" }`
  when `saveDecks` fails after a card change, while the in-memory list is retained; the
  just-created/edited/deleted state stays visible (Requirements 2.9, 3.9, 4.6, 8.4).

- **Invalid stored data on load** — unchanged from slice 1: `loadDecks` returning `invalid`
  yields an empty list, `status: "ready"`, and an `invalid-data` error.

- **Delete confirmation** — card deletion only proceeds via the explicit confirm control of
  the reused `DeleteConfirm`; cancel and Escape are no-ops on the list and return focus to the
  trigger (Requirements 4.2, 4.7).

- **Route with no matching deck** — the detail page renders the `Deck_Missing_State` rather
  than throwing when `status` is `"ready"` and no deck matches the route id (Requirement 1.6).

## Testing Strategy

Testing uses the existing **Vitest** (`jsdom`) + **@testing-library/react** + **fast-check**
setup. Property tests reuse `test/arbitraries.ts`. Every property test runs a minimum of
**100 iterations** and is tagged with a comment in the established format:

```
// Feature: deck-detail-cards, Property N - <property text>
// Validates: Requirements X.Y
```

### Arbitraries to add/update (`test/arbitraries.ts`)

- Grow `arbCard` from `{ id }` to `{ id, front, back, box, lastReviewed, createdAt }`:
  - `arbCardFront` / `arbCardBack`: non-empty strings that stay valid after trimming (1–5000;
    bounded well below the cap for speed).
  - `arbBox`: `fc.integer({ min: 1, max: 8 })` (a small realistic Leitner range).
  - `arbLastReviewed`: `fc.option(arbCreatedAt, { nil: null })` — reuses the existing
    `arbCreatedAt` for the non-null branch.
  - Reuse the existing `arbCreatedAt` for `createdAt`.
- `arbCards`, `arbDeck`, and `arbLargeDeckList` pick up the grown `arbCard` automatically;
  ensure `arbLargeDeckList` supplies a fixed valid card where it needs non-empty card arrays.
- `arbCardFormInput`: a valid `{ front, back }` (each non-empty after trimming, ≤5000) for the
  create/update properties.
- Invalid companions for Property 6: `arbEmptyOrWhitespace` (empty or whitespace-only) and
  `arbOverlongText` (>5000 chars), composed into invalid front and/or back inputs.
- Invalid card-field companions for Property 1's rejection branch: an out-of-range `box`
  (non-integer or `< 1`), a non-null non-ISO `lastReviewed`, and an empty/unparseable
  `createdAt` (reuse `arbInvalidCreatedAt`).

### Property-based tests (universal correctness)

Implement each correctness property with a **single** `fast-check` property test at 100+ runs:

| Property | Suggested location | Validates |
| --- | --- | --- |
| 1 — card schema round-trip | `types/deck.test.ts` (extend existing) | 7.1–7.6 |
| 2 — create assignment + preservation | `contexts/DecksContext.card-create.test.tsx` | 2.2–2.7 |
| 3 — update preservation | `contexts/DecksContext.card-update.test.tsx` | 3.2–3.7 |
| 4 — card action not-found | `contexts/DecksContext.card-not-found.test.tsx` | 2.11, 3.10 |
| 5 — delete removal + idempotence | `contexts/DecksContext.card-delete.test.tsx` | 4.3, 4.4, 4.8 |
| 6 — card validation rejection | `contexts/DecksContext.card-validation.test.tsx` | 2.10, 3.11, 6.1–6.8 |
| 7 — persistence round-trip (grown cards) | `lib/storage.test.ts` (extend existing) | 7.7, 8.1–8.3 |

The existing slice-1/slice-2 properties (write-failure, load-resilience, hydration
determinism) continue to cover Requirement 8.4 once their arbitraries carry the grown card
shape.

### Example-based unit tests (specific scenarios, UI, accessibility)

These cover acceptance criteria that are specific interactions, rendering assertions, or
focus behavior rather than universal properties:

- **Deck detail page** — reads the route id via `use(params)` and looks up the deck (1.1);
  renders the deck name and `CardList` when a deck matches (1.2); renders a loading state
  while `status` is not `"ready"` (1.5); renders the `Deck_Missing_State` when no deck
  matches (1.6); a card added/edited/deleted via the store is reflected in the list (2.8,
  3.8, 4.5).
- **CardList / CardItem** — renders one `CardItem` per card (1.3); a `CardItem` shows the
  front text and a `Box 1` text label alongside the box badge — never color alone (1.4);
  renders an empty-cards state for a deck with zero cards (1.7).
- **CardForm** — opens empty in create mode and pre-filled in edit mode (2.1, 3.1); the
  `Markdown_Preview` renders and updates as the front/back inputs change (5.1, 5.2) and shows
  an empty preview for empty input (5.5); retains user input and shows the field-specific
  message on a validation failure, and does not call the store (6.3, 6.4, 6.5, 6.6); has
  labelled inputs and `role="dialog"`/`aria-modal`.
- **Markdown** — rendering `**bold**` produces a `<strong>` element, transitively confirming
  `remark-gfm` is wired (5.3, 5.4); rendering `""` produces an empty preview without error
  (5.5).
- **DeleteConfirm (reused)** — opens on delete and identifies the card context (4.1); presents
  exactly one confirm and one cancel control and does not delete without confirm (4.2); cancel
  leaves the list unchanged (4.7).
- **Type-level / barrel check** — `CardFormInput = z.infer<typeof cardFormSchema>` exists and
  `types/index.ts` barrel-exports the grown `Card`, `cardSchema`, `cardFormSchema`, and
  `CardFormInput` (7.8), enforced by `tsc`.

### Balance

The property tests carry the burden of input coverage (append / preservation / idempotence /
round-trip / rejection across many generated inputs). Unit tests stay focused on concrete
examples, component wiring, markdown rendering, and accessibility/focus behavior — avoiding
redundant enumeration the property tests already cover.
