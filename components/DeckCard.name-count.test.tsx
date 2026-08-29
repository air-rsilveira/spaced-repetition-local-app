import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { cleanup, render } from "@testing-library/react";

import DeckCard from "@/components/DeckCard";
import { arbDeck } from "@/test/arbitraries";

describe("DeckCard name and card count", () => {
  // Feature: walking-skeleton, Property 11: DeckCard renders name and card count
  it("renders the deck name as visible text and a card count equal to the number of cards (0 when empty)", () => {
    fc.assert(
      fc.property(arbDeck, (deck) => {
        const { container } = render(<DeckCard deck={deck} dueCount={0} />);

        try {
          const rendered = container.textContent ?? "";

          // The deck name always appears as visible text. The name can be any
          // 1-100 char string (incl. whitespace/special chars), so match on the
          // rendered container's text content rather than a role/label query.
          expect(rendered).toContain(deck.name);

          // The card count always equals deck.cards.length (0 when empty) and is
          // rendered with singular/plural wording ("0 cards", "1 card", ...).
          // Asserting the full "<n> card(s)" phrase pins the numeric count to
          // the count element specifically, rather than to any digits that may
          // incidentally appear in an arbitrary name or description.
          const count = deck.cards.length;
          const unit = count === 1 ? "card" : "cards";
          expect(rendered).toContain(`${count} ${unit}`);
        } finally {
          // Each fast-check run renders fresh; unmount to avoid duplicates.
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });
});
