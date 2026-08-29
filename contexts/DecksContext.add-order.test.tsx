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
import { arbDeck } from "@/test/arbitraries";

/**
 * Property 1 test for the Decks store (`addDeck`).
 *
 * The store rejects duplicate ids, so both the seeded list and the new deck
 * must carry distinct ids. `arbDeck` does not guarantee uniqueness across a
 * list, so we dedupe the seed by id and force the new deck's id to be one that
 * is not already present.
 */

function wrapper({ children }: { children: ReactNode }) {
  return <DecksProvider>{children}</DecksProvider>;
}

/**
 * Remove decks that share an id (keeping first occurrence and order) and drop
 * decks whose name is whitespace-only, since the store rejects those with a
 * `name-required` error and they are not valid adds for this property.
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

describe("contexts/DecksContext addDeck append/order", () => {
  // Feature: walking-skeleton, Property 1: Adding a valid deck appends and preserves order
  it("appends a valid deck as last, preserving prior decks and their order", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 0, maxLength: 8 }),
        arbDeck,
        (rawInitial, rawNew) => {
          // Isolate each iteration: the provider persists to and hydrates from
          // localStorage, so clear it to prevent decks leaking across runs.
          localStorage.clear();

          const initial = dedupeById(rawInitial);
          const existingIds = new Set(initial.map((deck) => deck.id));

          // Guarantee the new deck's id is not already present so the add is
          // a valid (non-duplicate) operation.
          const newId = existingIds.has(rawNew.id)
            ? `new-${rawNew.id}-${initial.length}`
            : rawNew.id;
          // Ensure a valid (non-whitespace) name so the add is accepted; the
          // store trims names, so compare against the trimmed value below.
          const newName =
            rawNew.name.trim().length === 0 ? "new-deck" : rawNew.name;
          const newInput: AddDeckInput = {
            id: newId,
            name: newName,
            cards: rawNew.cards,
            ...(rawNew.description !== undefined
              ? { description: rawNew.description }
              : {}),
          };

          const { result, unmount } = renderHook(() => useDecks(), {
            wrapper,
          });

          try {
            // Seed the store by adding each initial deck in order. Each carries
            // a distinct id, so every add succeeds.
            act(() => {
              for (const deck of initial) {
                const res = result.current.addDeck({
                  id: deck.id,
                  name: deck.name,
                  cards: deck.cards,
                  ...(deck.description !== undefined
                    ? { description: deck.description }
                    : {}),
                });
                expect(res.ok).toBe(true);
              }
            });

            const before: DeckList = result.current.decks;
            expect(before).toHaveLength(initial.length);
            const beforeIds = before.map((deck) => deck.id);

            // Act: add one more valid deck.
            let addResult: ReturnType<typeof result.current.addDeck>;
            act(() => {
              addResult = result.current.addDeck(newInput);
            });

            // The operation succeeds.
            expect(addResult!.ok).toBe(true);

            const after = result.current.decks;

            // Length increases by exactly one.
            expect(after).toHaveLength(before.length + 1);

            // All prior decks remain, in their original order.
            expect(after.slice(0, before.length).map((deck) => deck.id)).toEqual(
              beforeIds,
            );

            // The new deck is last and matches the input (name trimmed by the
            // store, but our generated names are used verbatim here).
            const last = after[after.length - 1];
            expect(last.id).toBe(newId);
            expect(last.name).toBe(newName.trim());
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
