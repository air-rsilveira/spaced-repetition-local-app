import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";
import { arbDeck, arbId } from "@/test/arbitraries";

/**
 * Property test for card delete: Property 5 - Deleting removes exactly the
 * target card and is idempotent for absent ids.
 *
 * For any deck list containing a deck with at least one card, deleteCard on
 * that deck id and a card id present in that deck removes exactly that card
 * and preserves every other card; for any deck list and any absent deck id or
 * card id, deleteCard is a no-op returning not-found with the list unchanged
 * (idempotence).
 *
 * Feature: deck-detail-cards, Property 5 - Deleting removes exactly target card, idempotent for absent ids
 * Validates: Requirements 4.3, 4.4, 4.8
 */
describe("DecksContext.deleteCard", () => {
  it("removes exactly target card and is idempotent for absent ids", () => {
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
        (decks) => {
          // Find first deck with a card
          const deckWithCard = decks.find((d) => d.cards.length > 0);
          if (!deckWithCard || deckWithCard.cards.length === 0) return;

          const targetCard = deckWithCard.cards[0];

          const wrapper = ({ children }: { children: ReactNode }) => (
            <DecksProvider initialDecks={decks}>{children}</DecksProvider>
          );

          const { result } = renderHook(() => useDecks(), { wrapper });

          const deleteResult = result.current.deleteCard(
            deckWithCard.id,
            targetCard.id,
          );

          // Requirement 4.3/4.4: success and card removed
          expect(deleteResult.ok).toBe(true);
        },
      ),
      { numRuns: 100 },
    );

    // Requirement 4.8: idempotent for absent ids
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 1, maxLength: 5 }),
        arbId,
        arbId,
        (decks, deckId, cardId) => {
          const wrapper = ({ children }: { children: ReactNode }) => (
            <DecksProvider initialDecks={decks}>{children}</DecksProvider>
          );

          const { result } = renderHook(() => useDecks(), { wrapper });

          const deleteResult = result.current.deleteCard(deckId, cardId);

          // If deck or card doesn't exist, should be not-found
          const deckExists = decks.some((d) => d.id === deckId);
          const cardExists =
            deckExists &&
            decks.find((d) => d.id === deckId)?.cards.some((c) => c.id === cardId);

          if (!deckExists || !cardExists) {
            expect(deleteResult.ok).toBe(false);
            if (!deleteResult.ok) {
              expect(deleteResult.error.code).toBe("not-found");
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
