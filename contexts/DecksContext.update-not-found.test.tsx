import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  DecksProvider,
  useDecks,
  type AddDeckInput,
} from "@/contexts/DecksContext";
import type { Deck, DeckList } from "@/types";
import { arbDeck, arbDeckFormInput } from "@/test/arbitraries";

/**
 * Property 3 test for the Decks store (`updateDeck`).
 *
 * Updating an id that is not present in the deck list must be a no-op: the
 * store returns a `not-found` error result and the deck list is left unchanged
 * (same decks, fields, and order).
 */

function wrapper({ children }: { children: ReactNode }) {
  return <DecksProvider>{children}</DecksProvider>;
}

/**
 * Remove decks that share an id (keeping first occurrence and order) and drop
 * decks whose name is whitespace-only, since the store rejects those on add.
 * This yields a clean, addable seed list with distinct ids.
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

/** Add each deck to the store in order, asserting every add succeeds. */
function seed(
  addDeck: (input: AddDeckInput) => { ok: boolean },
  decks: readonly Deck[],
): void {
  for (const deck of decks) {
    const res = addDeck({
      id: deck.id,
      name: deck.name,
      cards: deck.cards,
      ...(deck.description !== undefined
        ? { description: deck.description }
        : {}),
    });
    expect(res.ok).toBe(true);
  }
}

/** Deep-comparable snapshot of a deck list for the "unchanged" assertion. */
function snapshot(decks: DeckList): string {
  return JSON.stringify(decks);
}

describe("contexts/DecksContext updateDeck unknown id", () => {
  // Feature: deck-crud, Property 3 - Updating a non-existent id is a no-op that returns an error
  // Validates: Requirements 2.8
  it("returns a not-found error and leaves the deck list unchanged for an absent id", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 0, maxLength: 8 }),
        arbDeckFormInput,
        fc.string({ minLength: 1, maxLength: 40 }),
        (rawInitial, formInput, rawMissingId) => {
          // Isolate each iteration: the provider persists to and hydrates from
          // localStorage, so clear it to prevent decks leaking across runs.
          localStorage.clear();

          const initial = dedupeById(rawInitial);
          const existingIds = new Set(initial.map((deck) => deck.id));

          // Guarantee the target id is not present in the seeded list so the
          // update genuinely targets a non-existent deck.
          const missingId = existingIds.has(rawMissingId)
            ? `missing-${rawMissingId}-${initial.length}`
            : rawMissingId;

          const { result, unmount } = renderHook(() => useDecks(), {
            wrapper,
          });

          try {
            act(() => {
              seed(result.current.addDeck, initial);
            });

            const before = result.current.decks;
            const beforeSnapshot = snapshot(before);

            let updateResult: ReturnType<typeof result.current.updateDeck>;
            act(() => {
              updateResult = result.current.updateDeck({
                id: missingId,
                name: formInput.name,
                ...(formInput.description !== undefined
                  ? { description: formInput.description }
                  : {}),
              });
            });

            // The update fails with a not-found error.
            expect(updateResult!.ok).toBe(false);
            if (!updateResult!.ok) {
              expect(updateResult!.error.code).toBe("not-found");
            }

            const after = result.current.decks;

            // The deck list is unchanged: same decks, fields, and order.
            expect(after).toHaveLength(before.length);
            expect(snapshot(after)).toBe(beforeSnapshot);
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
