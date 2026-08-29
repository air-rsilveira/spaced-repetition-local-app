import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  DecksProvider,
  useDecks,
  type AddDeckInput,
} from "@/contexts/DecksContext";
import type { Deck } from "@/types";
import { arbDeck, arbDeckFormInput } from "@/test/arbitraries";

/**
 * Property 2 test for the Decks store (`updateDeck`).
 *
 * `updateDeck` must replace only `name`/`description` (with the submitted,
 * trimmed values) while preserving the target deck's `id`, `createdAt`, and
 * `cards`; every other deck in the list must be left untouched.
 *
 * The store rejects duplicate ids and whitespace-only names on add, so the
 * seeded list is deduped by id and empty-named decks are dropped before
 * seeding.
 */

function wrapper({ children }: { children: ReactNode }) {
  return <DecksProvider>{children}</DecksProvider>;
}

/**
 * Remove decks sharing an id (keeping first occurrence and order) and drop
 * decks whose name is whitespace-only, so every deck is a valid, accepted add.
 */
function dedupeById(decks: readonly Deck[]): Deck[] {
  const seen = new Set<string>();
  const unique: Deck[] = [];
  for (const deck of decks) {
    if (deck.name.trim().length === 0) {
      continue;
    }
    if (!seen.has(deck.id)) {
      seen.add(deck.id);
      unique.push(deck);
    }
  }
  return unique;
}

/** Add a deck via the store, preserving optional fields, and assert success. */
function seedDeck(
  add: ReturnType<typeof useDecks>["addDeck"],
  deck: Deck,
): void {
  const input: AddDeckInput = {
    id: deck.id,
    name: deck.name,
    cards: deck.cards,
    ...(deck.description !== undefined ? { description: deck.description } : {}),
  };
  const res = add(input);
  expect(res.ok).toBe(true);
}

describe("contexts/DecksContext updateDeck preservation", () => {
  // Feature: deck-crud, Property 2 - Updating a deck preserves id, createdAt, and cards while replacing only name and description
  // Validates: Requirements 2.2, 2.3, 2.4, 2.5
  it("preserves id, createdAt, and cards while replacing only name/description and leaves other decks unchanged", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 1, maxLength: 8 }),
        fc.nat(),
        arbDeckFormInput,
        (rawDecks, targetSeed, formInput) => {
          // Isolate each iteration: the provider persists to and hydrates from
          // localStorage, so clear it to prevent decks leaking across runs.
          localStorage.clear();

          const decks = dedupeById(rawDecks);
          // dedupeById can drop every deck (all whitespace names); skip those
          // degenerate inputs so there is always a valid target to update.
          fc.pre(decks.length > 0);

          const targetIndex = targetSeed % decks.length;
          const target = decks[targetIndex];

          const { result, unmount } = renderHook(() => useDecks(), { wrapper });

          try {
            // Seed the store with each deck in order; each has a distinct id.
            act(() => {
              for (const deck of decks) {
                seedDeck(result.current.addDeck, deck);
              }
            });

            const before = result.current.decks;
            expect(before).toHaveLength(decks.length);

            // Snapshot the target's preserved fields before updating.
            const beforeTarget = before[targetIndex];
            const preservedId = beforeTarget.id;
            const preservedCreatedAt = beforeTarget.createdAt;
            const preservedCards = beforeTarget.cards;
            // Snapshot the other decks to confirm none of them change.
            const otherIds = before
              .filter((_deck, i) => i !== targetIndex)
              .map((deck) => deck.id);
            const otherDecks = before.filter((_deck, i) => i !== targetIndex);

            // Act: update the target deck with the generated valid form input.
            let updateResult: ReturnType<typeof result.current.updateDeck>;
            act(() => {
              updateResult = result.current.updateDeck({
                id: target.id,
                name: formInput.name,
                ...(formInput.description !== undefined
                  ? { description: formInput.description }
                  : {}),
              });
            });

            // The update succeeds.
            expect(updateResult!.ok).toBe(true);

            const after = result.current.decks;

            // Length and ordering are unchanged.
            expect(after).toHaveLength(before.length);
            expect(after.map((deck) => deck.id)).toEqual(
              before.map((deck) => deck.id),
            );

            const updated = after[targetIndex];

            // id, createdAt, and cards are preserved exactly (Requirements
            // 2.3, 2.4, 2.5). cards is deeply equal to the original array.
            expect(updated.id).toBe(preservedId);
            expect(updated.createdAt).toBe(preservedCreatedAt);
            expect(updated.cards).toEqual(preservedCards);

            // name is replaced by the submitted trimmed value (Requirement 2.2).
            expect(updated.name).toBe(formInput.name.trim());

            // description is replaced by the submitted trimmed value, or
            // cleared when the input omits/empties it (Requirement 2.2).
            const expectedDescription = formInput.description?.trim();
            if (expectedDescription) {
              expect(updated.description).toBe(expectedDescription);
            } else {
              expect(updated.description).toBeUndefined();
            }

            // No other deck changed (same identity of fields, same order).
            const afterOthers = after.filter((_deck, i) => i !== targetIndex);
            expect(afterOthers.map((deck) => deck.id)).toEqual(otherIds);
            expect(afterOthers).toEqual(otherDecks);
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
