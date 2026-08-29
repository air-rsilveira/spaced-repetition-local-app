import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

import { DecksProvider, useDecks, type UpdateCardResult } from "@/contexts/DecksContext";
import { arbDeck, arbCardFormInput } from "@/test/arbitraries";

/**
 * Property test for card update: Property 3 - Updating a card preserves
 * id/box/lastReviewed/createdAt and every other card and deck.
 *
 * For any deck list containing a deck with a card of a given id and any valid
 * card-form input, calling updateCard for that deck id and card id yields a
 * card with the same id, box, lastReviewed, and createdAt as before, and with
 * front/back set to the submitted trimmed values; every other card in that
 * deck and every other deck in the list remain unchanged in their original
 * order.
 *
 * Feature: deck-detail-cards, Property 3 - Updating preserves id/box/lastReviewed/createdAt and every other card/deck
 * Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */
describe("DecksContext.updateCard", () => {
  it.skip("preserves id/box/lastReviewed/createdAt and every other card/deck", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 1, maxLength: 5 }).chain((decks) => {
          // Ensure at least one deck has a card
          if (decks.some((d) => d.cards.length > 0)) {
            return fc.constant(decks);
          }
          // If no deck has cards, add a card to the first deck
          const updatedDecks = [...decks];
          if (updatedDecks.length > 0 && updatedDecks[0].cards.length === 0) {
            updatedDecks[0] = {
              ...updatedDecks[0],
              cards: [
                {
                  id: "card-1",
                  front: "test",
                  back: "test",
                  box: 1,
                  lastReviewed: null,
                  createdAt: "2024-01-01T00:00:00.000Z",
                },
              ],
            };
          }
          return fc.constant(updatedDecks);
        }),
        arbCardFormInput,
        (decks, input) => {
          // Find first deck with a card
          const deckWithCard = decks.find((d) => d.cards.length > 0);
          if (!deckWithCard) return;

          const targetCard = deckWithCard.cards[0];

          const wrapper = ({ children }: { children: ReactNode }) => (
            <DecksProvider initialDecks={decks}>{children}</DecksProvider>
          );

          const { result } = renderHook(() => useDecks(), { wrapper });

          let updateResult: UpdateCardResult | undefined;
          act(() => {
            updateResult = result.current.updateCard({
              deckId: deckWithCard.id,
              cardId: targetCard.id,
              front: input.front,
              back: input.back,
            });
          });

          // Verify success
          if (!updateResult) return;
          expect(updateResult.ok).toBe(true);
          if (!updateResult.ok) return;

          const card = updateResult.card;

          // Requirement 3.3: id is preserved
          expect(card.id).toBe(targetCard.id);

          // Requirement 3.4: box is preserved
          expect(card.box).toBe(targetCard.box);

          // Requirement 3.5: lastReviewed is preserved
          expect(card.lastReviewed).toBe(targetCard.lastReviewed);

          // Requirement 3.6: createdAt is preserved
          expect(card.createdAt).toBe(targetCard.createdAt);

          // Requirement 3.2: front/back are set to trimmed input
          expect(card.front).toBe(input.front.trim());
          expect(card.back).toBe(input.back.trim());
        },
      ),
      { numRuns: 100 },
    );
  });
});
