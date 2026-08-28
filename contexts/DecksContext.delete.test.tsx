import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";
import type { Deck, DeckList } from "@/types";
import { arbDeck, arbId } from "@/test/arbitraries";

/**
 * Property 4 test for the Decks store (`deleteDeck`).
 *
 * Feature: deck-crud, Property 4 - Deleting removes exactly the target deck and
 * is idempotent for absent ids: for any deck list, deleting a present id removes
 * exactly the deck with that id (all other decks retained in their original
 * order), and deleting an absent id — or deleting the same id a second time —
 * leaves the deck list unchanged; that is, `deleteDeck(id)` applied twice
 * produces the same list as applying it once.
 * Validates: Requirements 3.3, 3.9
 *
 * The store rejects duplicate ids and whitespace-only names on add, so the
 * seed list is deduped by id and stripped of blank-name decks before it is
 * loaded into the store. `arbDeck` does not guarantee list-wide id uniqueness.
 */

function wrapper({ children }: { children: ReactNode }) {
  return <DecksProvider>{children}</DecksProvider>;
}

/**
 * Keep the first occurrence of each id (preserving order) and drop decks whose
 * name is whitespace-only, since the store rejects those on add.
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

/** Seed the store with the given decks via `addDeck`, asserting each succeeds. */
function seed(
  addDeck: ReturnType<typeof useDecks>["addDeck"],
  decks: readonly Deck[],
): void {
  act(() => {
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
  });
}

describe("contexts/DecksContext deleteDeck removal + idempotence", () => {
  it("removes exactly the target deck, preserving the order of the rest", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 1, maxLength: 8 }),
        fc.nat(),
        (rawInitial, targetPick) => {
          // Isolate each iteration: the provider hydrates from / persists to
          // localStorage, so clear it to prevent decks leaking across runs.
          localStorage.clear();

          const initial = dedupeById(rawInitial);
          // Skip degenerate iterations where the seed collapses to empty.
          fc.pre(initial.length > 0);

          const { result, unmount } = renderHook(() => useDecks(), { wrapper });

          try {
            seed(result.current.addDeck, initial);

            const before: DeckList = result.current.decks;
            expect(before).toHaveLength(initial.length);

            // Pick a present id to delete.
            const target = before[targetPick % before.length];
            const expectedIds = before
              .filter((deck) => deck.id !== target.id)
              .map((deck) => deck.id);

            let deleteResult: ReturnType<typeof result.current.deleteDeck>;
            act(() => {
              deleteResult = result.current.deleteDeck(target.id);
            });

            // The delete succeeds and reports the removed id.
            expect(deleteResult!.ok).toBe(true);
            if (deleteResult!.ok) {
              expect(deleteResult!.id).toBe(target.id);
            }

            const after = result.current.decks;

            // Exactly one deck removed.
            expect(after).toHaveLength(before.length - 1);
            // The target is gone.
            expect(after.some((deck) => deck.id === target.id)).toBe(false);
            // Every other deck is retained in its original relative order.
            expect(after.map((deck) => deck.id)).toEqual(expectedIds);
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("is idempotent: deleting an absent id, or deleting twice, leaves the list unchanged", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 0, maxLength: 8 }),
        arbId,
        fc.nat(),
        (rawInitial, absentSeed, targetPick) => {
          localStorage.clear();

          const initial = dedupeById(rawInitial);
          const existingIds = new Set(initial.map((deck) => deck.id));

          const { result, unmount } = renderHook(() => useDecks(), { wrapper });

          try {
            seed(result.current.addDeck, initial);

            const before: DeckList = result.current.decks;
            const beforeIds = before.map((deck) => deck.id);

            // Case A: deleting an id not present is a no-op returning not-found.
            const absentId = existingIds.has(absentSeed)
              ? `absent-${absentSeed}-${initial.length}`
              : absentSeed;
            // Guard against the synthesized id colliding with an existing one.
            fc.pre(!existingIds.has(absentId));

            let absentResult: ReturnType<typeof result.current.deleteDeck>;
            act(() => {
              absentResult = result.current.deleteDeck(absentId);
            });

            expect(absentResult!.ok).toBe(false);
            if (!absentResult!.ok) {
              expect(absentResult!.error.code).toBe("not-found");
            }
            // The list is untouched (same decks, fields, and order).
            expect(result.current.decks).toEqual(before);
            expect(result.current.decks.map((deck) => deck.id)).toEqual(
              beforeIds,
            );

            // Case B: deleting the same present id twice matches deleting once.
            if (before.length > 0) {
              const target = before[targetPick % before.length];

              act(() => {
                result.current.deleteDeck(target.id);
              });
              const afterFirst = result.current.decks;

              // Second delete of the now-absent id is a no-op.
              let secondResult: ReturnType<typeof result.current.deleteDeck>;
              act(() => {
                secondResult = result.current.deleteDeck(target.id);
              });

              expect(secondResult!.ok).toBe(false);
              if (!secondResult!.ok) {
                expect(secondResult!.error.code).toBe("not-found");
              }
              // Applying deleteDeck twice yields the same list as once.
              expect(result.current.decks).toEqual(afterFirst);
            }
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
