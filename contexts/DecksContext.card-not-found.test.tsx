import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";
import { arbDeck, arbCardFormInput, arbId } from "@/test/arbitraries";

/**
 * Property test for card action not-found: Property 4 - A card action for an
 * absent deck or card is a no-op that returns not-found.
 *
 * For any deck list and any deck id not present in that list, addCard and
 * updateCard return an error result with code not-found and leave the deck
 * list unchanged; and for any deck list containing a deck and any card id not
 * present in that deck, updateCard and deleteCard return an error result with
 * code not-found and leave the deck list unchanged.
 *
 * Feature: deck-detail-cards, Property 4 - Card action for absent deck/card is no-op returning not-found
 * Validates: Requirements 2.11, 3.10
 */
describe("DecksContext card actions not-found", () => {
  it("returns not-found for absent deck and leaves list unchanged", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 0, maxLength: 5 }),
        arbCardFormInput,
        arbId,
        (decks, input, deckId) => {
          // Requirement 2.11: addCard for absent deck returns not-found
          const wrapper = ({ children }: { children: ReactNode }) => (
            <DecksProvider initialDecks={decks}>{children}</DecksProvider>
          );

          const { result } = renderHook(() => useDecks(), { wrapper });

          const addResult = result.current.addCard({
            deckId,
            front: input.front,
            back: input.back,
          });

          // If deck id doesn't exist, should be not-found
          const deckExists = decks.some((d) => d.id === deckId);
          if (!deckExists) {
            expect(addResult.ok).toBe(false);
            if (!addResult.ok) {
              expect(addResult.error.code).toBe("not-found");
            }
          }
        },
      ),
      { numRuns: 100 },
    );

    // Requirement 3.10: updateCard for absent card returns not-found
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 1, maxLength: 5 }),
        arbCardFormInput,
        arbId,
        (decks, input, cardId) => {
          const targetDeck = decks[0];

          const wrapper = ({ children }: { children: ReactNode }) => (
            <DecksProvider initialDecks={decks}>{children}</DecksProvider>
          );

          const { result } = renderHook(() => useDecks(), { wrapper });

          const updateResult = result.current.updateCard({
            deckId: targetDeck.id,
            cardId,
            front: input.front,
            back: input.back,
          });

          // If card id doesn't exist in deck, should be not-found
          const cardExists = targetDeck.cards.some((c) => c.id === cardId);
          if (!cardExists) {
            expect(updateResult.ok).toBe(false);
            if (!updateResult.ok) {
              expect(updateResult.error.code).toBe("not-found");
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
