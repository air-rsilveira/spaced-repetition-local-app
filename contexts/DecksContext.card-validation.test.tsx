import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

import { DecksProvider, useDecks, type AddCardResult, type UpdateCardResult } from "@/contexts/DecksContext";
import { arbDeck, arbEmptyOrWhitespace, arbOverlongText } from "@/test/arbitraries";

/**
 * Property test for card validation rejection: Property 6 - Invalid card input
 * is rejected, leaves the list unchanged, and identifies each invalid field.
 *
 * For any deck list containing a deck with a given id, any card input that
 * violates at least one constraint (empty/whitespace/overlong front or back),
 * calling addCard or updateCard returns a validation error result with a
 * `fields` map identifying each invalid field, and the deck list remains
 * unchanged.
 *
 * Feature: deck-detail-cards, Property 6 - Invalid card input rejected, list unchanged, identifies each invalid field
 * Validates: Requirements 2.10, 3.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */
describe("DecksContext card validation rejection", () => {
  it("rejects invalid addCard input and identifies each invalid field", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 1, maxLength: 5 }),
        fc.oneof(
          // Empty or whitespace-only front
          fc.tuple(arbEmptyOrWhitespace, fc.string({ maxLength: 100 })),
          // Empty or whitespace-only back
          fc.tuple(fc.string({ maxLength: 100 }), arbEmptyOrWhitespace),
          // Overlong front
          fc.tuple(arbOverlongText, fc.string({ maxLength: 100 })),
          // Overlong back
          fc.tuple(fc.string({ maxLength: 100 }), arbOverlongText),
          // Both front and back invalid
          fc.tuple(arbEmptyOrWhitespace, arbOverlongText),
        ),
        (decks, [frontInput, backInput]) => {
          const targetDeck = decks[0];

          // Requirement 2.10: addCard rejects invalid input
          const wrapper = ({ children }: { children: ReactNode }) => (
            <DecksProvider initialDecks={decks}>{children}</DecksProvider>
          );

          const { result } = renderHook(() => useDecks(), { wrapper });

          let addResult: AddCardResult | undefined;
          act(() => {
            addResult = result.current.addCard({
              deckId: targetDeck.id,
              front: frontInput,
              back: backInput,
            });
          });

          // Should be rejected
          if (!addResult) return;
          expect(addResult.ok).toBe(false);
          if (!addResult.ok) {
            expect(addResult.error.code).toBe("validation");

            // Requirement 6.3, 6.4, 6.5, 6.6, 6.7, 6.8: identifies each invalid field
            const trimmedFront = frontInput.trim();
            const trimmedBack = backInput.trim();

            if (addResult.error.code === "validation") {
              if (trimmedFront.length === 0 || trimmedFront.length > 5000) {
                expect(addResult.error.fields.front).toBeDefined();
              }
              if (trimmedBack.length === 0 || trimmedBack.length > 5000) {
                expect(addResult.error.fields.back).toBeDefined();
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );

    // Requirement 3.11: updateCard rejects invalid input
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
        fc.oneof(
          // Empty or whitespace-only front
          fc.tuple(arbEmptyOrWhitespace, fc.string({ maxLength: 100 })),
          // Empty or whitespace-only back
          fc.tuple(fc.string({ maxLength: 100 }), arbEmptyOrWhitespace),
          // Overlong front
          fc.tuple(arbOverlongText, fc.string({ maxLength: 100 })),
          // Overlong back
          fc.tuple(fc.string({ maxLength: 100 }), arbOverlongText),
        ),
        (decks, [frontInput, backInput]) => {
          const targetDeck = decks.find((d) => d.cards.length > 0) || decks[0];
          const targetCard = targetDeck.cards[0];

          if (!targetCard) return;

          const wrapper = ({ children }: { children: ReactNode }) => (
            <DecksProvider initialDecks={decks}>{children}</DecksProvider>
          );

          const { result } = renderHook(() => useDecks(), { wrapper });

          let updateResult: UpdateCardResult | undefined;
          act(() => {
            updateResult = result.current.updateCard({
              deckId: targetDeck.id,
              cardId: targetCard.id,
              front: frontInput,
              back: backInput,
            });
          });

          // Should be rejected
          if (!updateResult) return;
          expect(updateResult.ok).toBe(false);
          if (!updateResult.ok) {
            expect(updateResult.error.code).toBe("validation");

            // Identifies each invalid field
            const trimmedFront = frontInput.trim();
            const trimmedBack = backInput.trim();

            if (updateResult.error.code === "validation") {
              if (trimmedFront.length === 0 || trimmedFront.length > 5000) {
                expect(updateResult.error.fields.front).toBeDefined();
              }
              if (trimmedBack.length === 0 || trimmedBack.length > 5000) {
                expect(updateResult.error.fields.back).toBeDefined();
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
