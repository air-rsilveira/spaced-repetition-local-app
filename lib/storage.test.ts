import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { loadDecks, saveDecks } from "@/lib/storage";
import { arbDeckList, arbLargeDeckList } from "@/test/arbitraries";

describe("persistence round-trip", () => {
  // Feature: deck-crud, Property 7 - Persistence round-trip preserves the deck
  // list including createdAt (extended): for any valid deck list (whose decks
  // now carry createdAt), saveDecks followed by loadDecks yields an equal deck
  // list — same decks, same fields (including createdAt), in the same order.
  // Validates: Requirements 1.7, 2.7, 3.5, 5.1
  it("saveDecks then loadDecks yields an equal deck list (same decks, fields incl. createdAt, order)", () => {
    fc.assert(
      fc.property(fc.oneof(arbDeckList, arbLargeDeckList), (decks) => {
        // Start each run from a clean slate so a prior run's data can't leak in.
        localStorage.clear();

        const saveResult = saveDecks(decks);
        expect(saveResult).toEqual({ ok: true });

        const loadResult = loadDecks();
        expect(loadResult.ok).toBe(true);
        if (loadResult.ok) {
          // Deep equality covers same decks, same fields (including createdAt),
          // and same order.
          expect(loadResult.decks).toEqual(decks);

          // Explicitly assert the createdAt timestamp survives the round-trip
          // for every deck, in order, so a regression that dropped or reordered
          // this field would be caught even independently of the deep-equal above.
          expect(loadResult.decks.map((deck) => deck.createdAt)).toEqual(
            decks.map((deck) => deck.createdAt),
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
