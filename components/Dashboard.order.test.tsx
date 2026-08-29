import { describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { cleanup, render } from "@testing-library/react";

import Dashboard from "@/components/Dashboard";
import { arbDeck } from "@/test/arbitraries";
import type { Deck } from "@/types";

// Mock the store so the Dashboard reads a deck list we control directly. The
// mock is scoped to this file: `useDecks` returns a ready store whose `decks`
// we set per fast-check run via the mutable `mockDecks` reference below.
let mockDecks: Deck[] = [];

vi.mock("@/contexts/DecksContext", () => ({
  useDecks: () => ({
    decks: mockDecks,
    status: "ready" as const,
    error: null,
    addDeck: vi.fn(),
  }),
}));

/**
 * A non-empty deck list with unique ids. `arbDeck` alone can yield duplicate
 * ids across a list, which would collide on React keys and break the
 * one-card-per-deck contract; we dedupe by id and require at least one deck.
 */
const arbUniqueNonEmptyDeckList: fc.Arbitrary<Deck[]> = fc
  .array(arbDeck, { minLength: 1, maxLength: 10 })
  .map((decks) => {
    const seen = new Set<string>();
    return decks.filter((deck) => {
      if (seen.has(deck.id)) {
        return false;
      }
      seen.add(deck.id);
      return true;
    });
  })
  .filter((decks) => decks.length >= 1);

describe("Dashboard deck listing order", () => {
  // Feature: walking-skeleton, Property 10: One DeckCard per deck in store order
  it("renders exactly one DeckCard per deck in the same order as the store", () => {
    fc.assert(
      fc.property(arbUniqueNonEmptyDeckList, (decks) => {
        mockDecks = decks;

        const { container } = render(<Dashboard />);

        try {
          // Each deck renders as exactly one <article> (DeckCard), so the count
          // of articles equals the number of decks in the store.
          const cards = container.querySelectorAll("article");
          expect(cards).toHaveLength(decks.length);

          // The deck name is rendered in an <h3> inside each <article> (DeckCard).
          // The order of rendered names must match the store's order exactly.
          // We query for h3s within articles specifically to exclude any h3s in
          // other parts of the layout (e.g., the "Import a deck" header).
          const renderedNames = Array.from(
            container.querySelectorAll("article h3"),
          ).map((heading) => heading.textContent);
          const expectedNames = decks.map((deck) => deck.name);
          expect(renderedNames).toEqual(expectedNames);
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });
});
