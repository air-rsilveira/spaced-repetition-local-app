import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";
import { arbDeck, arbCardFormInput } from "@/test/arbitraries";

/**
 * Property test for card creation: Property 2 - Creating a valid card appends
 * one card with the correct defaults and preserves the rest.
 *
 * For any deck list containing a deck with a given id and any valid card-form
 * input (front and back each non-empty of at most 5000 characters after
 * trimming), addCard appends exactly one card to that deck whose id is a
 * non-empty string distinct from every existing card id in that deck, whose
 * box equals the integer 1, whose lastReviewed is null, and whose createdAt
 * parses as a valid ISO 8601 timestamp, with front/back set to the trimmed
 * input; every pre-existing card in that deck is retained in its original order
 * and every other deck is left unchanged.
 *
 * Feature: deck-detail-cards, Property 2 - Creating a valid card appends one card with correct defaults and preserves rest
 * Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */
describe("DecksContext.addCard", () => {
  it("appends exactly one card with correct defaults and preserves the rest", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 0, max: 100 }),
        arbCardFormInput,
        (decks, deckIndex, input) => {
          const targetDeck = decks[deckIndex % decks.length];
          const preExistingCardIds = new Set(targetDeck.cards.map((c) => c.id));

          const wrapper = ({ children }: { children: ReactNode }) => (
            <DecksProvider initialDecks={decks}>{children}</DecksProvider>
          );

          const { result } = renderHook(() => useDecks(), { wrapper });

          const addResult = result.current.addCard({
            deckId: targetDeck.id,
            front: input.front,
            back: input.back,
          });

          // Verify success
          expect(addResult.ok).toBe(true);
          if (!addResult.ok) return;

          const card = addResult.card;

          // Requirement 2.3: id is a non-empty string
          expect(typeof card.id).toBe("string");
          expect(card.id.length).toBeGreaterThan(0);

          // Requirement 2.3: id is distinct from every pre-existing card id
          expect(preExistingCardIds.has(card.id)).toBe(false);

          // Requirement 2.4: box equals 1
          expect(card.box).toBe(1);

          // Requirement 2.5: lastReviewed is null
          expect(card.lastReviewed).toBe(null);

          // Requirement 2.6: createdAt is a valid ISO 8601 timestamp
          expect(typeof card.createdAt).toBe("string");
          expect(card.createdAt.length).toBeGreaterThan(0);
          expect(card.createdAt.length).toBeLessThanOrEqual(30);
          expect(Number.isNaN(Date.parse(card.createdAt))).toBe(false);

          // Requirement 2.2: front/back are set to trimmed input
          expect(card.front).toBe(input.front.trim());
          expect(card.back).toBe(input.back.trim());
        },
      ),
      { numRuns: 100 },
    );
  });
});
