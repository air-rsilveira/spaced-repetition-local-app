import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { loadDecks, saveDecks } from "@/lib/storage";
import { arbDeckList, arbLargeDeckList } from "@/test/arbitraries";

describe("persistence round-trip", () => {
  // Feature: walking-skeleton, Property 5: Persistence round-trip preserves the deck list
  it("saveDecks then loadDecks yields an equal deck list (same decks, fields, order)", () => {
    fc.assert(
      fc.property(fc.oneof(arbDeckList, arbLargeDeckList), (decks) => {
        // Start each run from a clean slate so a prior run's data can't leak in.
        localStorage.clear();

        const saveResult = saveDecks(decks);
        expect(saveResult).toEqual({ ok: true });

        const loadResult = loadDecks();
        expect(loadResult.ok).toBe(true);
        if (loadResult.ok) {
          // Deep equality covers same decks, same fields, and same order.
          expect(loadResult.decks).toEqual(decks);
        }
      }),
      { numRuns: 100 },
    );
  });
});
