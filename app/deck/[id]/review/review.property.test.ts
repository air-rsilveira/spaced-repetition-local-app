import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { Card, Deck } from "@/types";
import { getDueCards, promoteCard, resetCard } from "@/lib/leitner";

/**
 * Property-based tests for the review page.
 *
 * Property 5: Due cards decrease after review
 * For any deck with N due cards, after grading one card and persisting the update,
 * the deck shall have N-1 due cards.
 *
 * Validates: Requirements 7, 8
 */

/**
 * Helper to count due cards in a deck on a given date.
 */
function countDueCards(deck: Deck, today: Date): number {
  return getDueCards(deck, today).length;
}

/**
 * Simulate grading a card (either correct or incorrect) and updating the deck.
 * Returns the updated deck.
 */
function gradeCardInDeck(
  deck: Deck,
  cardId: string,
  gradeCorrect: boolean,
  today: Date
): Deck {
  const cardIndex = deck.cards.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    throw new Error(`Card ${cardId} not found in deck`);
  }

  const card = deck.cards[cardIndex];
  const gradedCard = gradeCorrect ? promoteCard(card, today) : resetCard(card, today);

  // Create new deck with updated card
  return {
    ...deck,
    cards: [
      ...deck.cards.slice(0, cardIndex),
      gradedCard,
      ...deck.cards.slice(cardIndex + 1),
    ],
  };
}

/**
 * Create a card that is guaranteed to be due on a given date.
 * New cards (lastReviewed = null) are always due, so we use those.
 */
function createDueCard(id: string): Card {
  return {
    id,
    front: "Question",
    back: "Answer",
    box: 1,
    lastReviewed: null, // New cards are always due
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

/**
 * Create a card that is NOT due on a given date (far future due date).
 * We use a high box number with a recent lastReviewed to ensure it's not due.
 */
function createNotDueCard(id: string, today: Date): Card {
  // Put in Box 5 (16-day interval) and review it today, so it won't be due for 16 days
  return {
    id,
    front: "Question",
    back: "Answer",
    box: 5,
    lastReviewed: today.toISOString(),
    createdAt: today.toISOString(),
  };
}

describe("ReviewPage Property Tests", () => {
  describe("Property 5: Due cards decrease after review", () => {
    it("grading a due card reduces due count by 1 (correct grade)", () => {
      /**
       * For any deck with N due cards (N > 0), when we grade one due card
       * as Correct (promoting it), the due count should decrease by 1.
       *
       * Validates: Requirements 7, 8
       */
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 5 }), // number of not-due cards to add
          (numDueCards, numNotDueCards) => {
            const today = new Date("2024-01-05T12:00:00.000Z");

            // Build a deck with due and not-due cards
            const dueCards = Array.from({ length: numDueCards }, (_, i) =>
              createDueCard(`due-${i}`)
            );
            const notDueCards = Array.from({ length: numNotDueCards }, (_, i) =>
              createNotDueCard(`not-due-${i}`, today)
            );

            const deck: Deck = {
              id: "test-deck",
              name: "Test Deck",
              cards: [...dueCards, ...notDueCards],
              createdAt: today.toISOString(),
            };

            // Verify initial state
            const initialDueCount = countDueCards(deck, today);
            expect(initialDueCount).toBe(numDueCards);

            // Grade the first due card as Correct
            const firstDueCardId = dueCards[0].id;
            const deckAfterGrade = gradeCardInDeck(deck, firstDueCardId, true, today);

            // Verify due count decreased by 1
            const updatedDueCount = countDueCards(deckAfterGrade, today);
            expect(updatedDueCount).toBe(numDueCards - 1);
          }
        )
      );
    });

    it("grading a due card reduces due count by 1 (incorrect grade)", () => {
      /**
       * For any deck with N due cards (N > 0), when we grade one due card
       * as Incorrect (resetting it), the due count should still decrease by 1
       * because resetting moves it to Box 1 with lastReviewed = today,
       * making it not due until tomorrow.
       *
       * Validates: Requirements 7, 8
       */
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 5 }),
          (numDueCards, numNotDueCards) => {
            const today = new Date("2024-01-05T12:00:00.000Z");

            // Build a deck with due and not-due cards
            const dueCards = Array.from({ length: numDueCards }, (_, i) =>
              createDueCard(`due-${i}`)
            );
            const notDueCards = Array.from({ length: numNotDueCards }, (_, i) =>
              createNotDueCard(`not-due-${i}`, today)
            );

            const deck: Deck = {
              id: "test-deck",
              name: "Test Deck",
              cards: [...dueCards, ...notDueCards],
              createdAt: today.toISOString(),
            };

            // Verify initial state
            const initialDueCount = countDueCards(deck, today);
            expect(initialDueCount).toBe(numDueCards);

            // Grade the first due card as Incorrect
            const firstDueCardId = dueCards[0].id;
            const deckAfterGrade = gradeCardInDeck(deck, firstDueCardId, false, today);

            // Verify due count decreased by 1
            // After reset, the card is in Box 1 with lastReviewed = today,
            // so it's not due until tomorrow.
            const updatedDueCount = countDueCards(deckAfterGrade, today);
            expect(updatedDueCount).toBe(numDueCards - 1);
          }
        )
      );
    });

    it("grading multiple cards in sequence decreases due count correctly", () => {
      /**
       * For any deck with N due cards (N >= 3), when we grade multiple cards
       * sequentially, the due count should decrease by 1 for each graded card.
       *
       * Validates: Requirements 7, 8
       */
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 10 }),
          fc.integer({ min: 0, max: 5 }),
          (numDueCards, numNotDueCards) => {
            const today = new Date("2024-01-05T12:00:00.000Z");

            // Build a deck with due and not-due cards
            const dueCards = Array.from({ length: numDueCards }, (_, i) =>
              createDueCard(`due-${i}`)
            );
            const notDueCards = Array.from({ length: numNotDueCards }, (_, i) =>
              createNotDueCard(`not-due-${i}`, today)
            );

            let deck: Deck = {
              id: "test-deck",
              name: "Test Deck",
              cards: [...dueCards, ...notDueCards],
              createdAt: today.toISOString(),
            };

            // Grade 3 cards sequentially and verify due count decreases each time
            const initialDueCount = countDueCards(deck, today);
            expect(initialDueCount).toBe(numDueCards);

            for (let i = 0; i < 3; i++) {
              const dueCardId = dueCards[i].id;
              const gradeCorrect = i % 2 === 0; // Alternate correct/incorrect

              deck = gradeCardInDeck(deck, dueCardId, gradeCorrect, today);

              const currentDueCount = countDueCards(deck, today);
              expect(currentDueCount).toBe(numDueCards - (i + 1));
            }
          }
        )
      );
    });

    it("grading does not affect non-due cards", () => {
      /**
       * For any deck with N due cards and M non-due cards, when we grade
       * a due card, the non-due cards remain non-due (unless they were
       * previously due). The total card count remains N + M.
       *
       * Validates: Requirements 7, 8
       */
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          (numDueCards, numNotDueCards) => {
            const today = new Date("2024-01-05T12:00:00.000Z");

            // Build a deck with due and not-due cards
            const dueCards = Array.from({ length: numDueCards }, (_, i) =>
              createDueCard(`due-${i}`)
            );
            const notDueCards = Array.from({ length: numNotDueCards }, (_, i) =>
              createNotDueCard(`not-due-${i}`, today)
            );

            const originalNotDueIds = new Set(notDueCards.map((c) => c.id));

            const deck: Deck = {
              id: "test-deck",
              name: "Test Deck",
              cards: [...dueCards, ...notDueCards],
              createdAt: today.toISOString(),
            };

            // Grade the first due card
            const firstDueCardId = dueCards[0].id;
            const deckAfterGrade = gradeCardInDeck(deck, firstDueCardId, true, today);

            // Verify total card count remains the same
            expect(deckAfterGrade.cards).toHaveLength(
              numDueCards + numNotDueCards
            );

            // Verify non-due cards are still in the deck
            deckAfterGrade.cards.forEach((card) => {
              if (originalNotDueIds.has(card.id)) {
                // The card content should be unchanged
                expect(card.front).toBe("Question");
                expect(card.back).toBe("Answer");
              }
            });

            // Verify non-due cards are still not due
            const notDueCardsAfter = deckAfterGrade.cards.filter((c) =>
              originalNotDueIds.has(c.id)
            );
            const notDueCountAfter = notDueCardsAfter.filter((c) =>
              !getDueCards({ ...deckAfterGrade, cards: [c] }, today).length
            ).length;
            expect(notDueCountAfter).toBe(numNotDueCards);
          }
        )
      );
    });

    it("grading results in deterministic due count (same result for same inputs)", () => {
      /**
       * For the same deck and grading action, the resulting due count
       * should be deterministic (no random variance).
       *
       * Validates: Requirements 7, 8
       */
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.boolean(),
          (numDueCards, gradeCorrect) => {
            const today = new Date("2024-01-05T12:00:00.000Z");

            // Build identical decks
            const buildDeck = () => {
              const dueCards = Array.from({ length: numDueCards }, (_, i) =>
                createDueCard(`due-${i}`)
              );
              return {
                id: "test-deck",
                name: "Test Deck",
                cards: dueCards,
                createdAt: today.toISOString(),
              } as Deck;
            };

            const deck1 = buildDeck();
            const deck2 = buildDeck();

            // Grade the same card in both decks
            const deckAfterGrade1 = gradeCardInDeck(
              deck1,
              deck1.cards[0].id,
              gradeCorrect,
              today
            );
            const deckAfterGrade2 = gradeCardInDeck(
              deck2,
              deck2.cards[0].id,
              gradeCorrect,
              today
            );

            // Both should have the same due count
            const count1 = countDueCards(deckAfterGrade1, today);
            const count2 = countDueCards(deckAfterGrade2, today);

            expect(count1).toBe(count2);
            expect(count1).toBe(numDueCards - 1);
          }
        )
      );
    });
  });
});
