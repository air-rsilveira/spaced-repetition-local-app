// Feature: walking-skeleton, Property 4: Duplicate identifiers are rejected
import { act, renderHook } from "@testing-library/react";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";
import type { Deck, DeckList } from "@/types";

/**
 * Property 4: Duplicate identifiers are rejected.
 *
 * For any deck seeded into the store and any add-deck input whose supplied id
 * equals an existing deck's id, `addDeck` must reject with a `duplicate-id`
 * error, preserve the existing deck unchanged, and leave the list unchanged.
 *
 * Validates: Requirements 7.6
 */

// Local arbitraries (do not import from test/arbitraries.ts to avoid
// concurrent-edit collisions). Bounded well within the schema's limits.
const arbId: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 40 });
const arbDeckName: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 100 })
  // Ensure a non-empty post-trim name so the seed add always succeeds.
  .map((s) => `deck-${s}`);

describe("DecksContext — Property 4: duplicate identifiers are rejected", () => {
  it("rejects a duplicate id, preserves the existing deck, and leaves the list unchanged", () => {
    fc.assert(
      fc.property(
        arbId,
        arbDeckName,
        arbDeckName,
        (sharedId, firstName, secondName) => {
          // Isolate each property run: the persistence effect writes to
          // localStorage, and a fresh provider hydrates from it, so without
          // this a deck seeded in a prior run would leak in and turn the
          // first (seed) add into a duplicate.
          localStorage.clear();

          const { result } = renderHook(() => useDecks(), {
            wrapper: DecksProvider,
          });

          // Seed: add a first deck with an explicit, known id.
          let firstAdd: ReturnType<typeof result.current.addDeck>;
          act(() => {
            firstAdd = result.current.addDeck({ id: sharedId, name: firstName });
          });
          expect(firstAdd!.ok).toBe(true);

          const listBefore: DeckList = result.current.decks;
          const existingDeck: Deck | undefined = listBefore.find(
            (deck) => deck.id === sharedId,
          );
          expect(existingDeck).toBeDefined();
          // Snapshot for deep-equality comparison after the rejected add.
          const listSnapshot = structuredClone(listBefore);

          // Attempt: add a second deck reusing the same id.
          let secondAdd: ReturnType<typeof result.current.addDeck>;
          act(() => {
            secondAdd = result.current.addDeck({
              id: sharedId,
              name: secondName,
            });
          });

          // Rejected with a duplicate-id error.
          expect(secondAdd!.ok).toBe(false);
          if (secondAdd!.ok === false) {
            expect(secondAdd!.error.code).toBe("duplicate-id");
          }
          expect(result.current.error?.code).toBe("duplicate-id");

          // List unchanged (same length, same contents, order preserved).
          const listAfter = result.current.decks;
          expect(listAfter).toHaveLength(listSnapshot.length);
          expect(listAfter).toEqual(listSnapshot);

          // Existing deck preserved unchanged.
          const preservedDeck = listAfter.find((deck) => deck.id === sharedId);
          expect(preservedDeck).toEqual(existingDeck);
        },
      ),
      { numRuns: 100 },
    );
  });
});
