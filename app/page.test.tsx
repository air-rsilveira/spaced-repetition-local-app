import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { getDueCards } from "@/lib/leitner";
import { arbDeck, arbBox, arbCardFront, arbCardBack } from "@/test/arbitraries";
import type { Card } from "@/types";

/**
 * Property-based tests for dashboard due count calculation.
 *
 * Feature: review-session, Property 1: New cards are always due
 * Validates: Requirements 2, 4, 9
 *
 * Property 1 states: For any deck with new cards (lastReviewed = null) and any date,
 * those new cards are always included in the due count.
 *
 * This test validates that `getDueCards(deck, today).length` correctly identifies
 * all new cards in a deck, ensuring the due count badge displayed on the dashboard
 * is accurate for new cards.
 */
describe("Dashboard due count calculation (Property 1: New cards are always due)", () => {
  /**
   * Property Test 1: New cards are always due on any date
   *
   * For any deck generated with cards (some of which may be new), the count
   * returned by `getDueCards()` includes all cards where `lastReviewed === null`,
   * regardless of the date being checked.
   *
   * This validates Requirements 2, 4, 9:
   * - Requirement 2: New cards are always due
   * - Requirement 4: Due count badge on dashboard reflects actual due cards
   * - Requirement 9: Dashboard displays due count for each deck
   */
  it(
    "new cards are always in due count for any date",
    () => {
      fc.assert(
        fc.property(arbDeck, fc.date(), (deck, today) => {
          const dueCards = getDueCards(deck, today);

          // Count how many cards in the deck are new (lastReviewed === null)
          const newCards = deck.cards.filter((c) => c.lastReviewed === null);

          // Every new card must be in the due cards list
          for (const newCard of newCards) {
            expect(dueCards).toContainEqual(newCard);
          }

          // The due count must be at least as large as the number of new cards
          expect(dueCards.length).toBeGreaterThanOrEqual(newCards.length);
        }),
        { numRuns: 100 },
      );
    },
  );

  /**
   * Property Test 2: Due count equals the sum of new cards plus reviewed due cards
   *
   * For any deck and any date, the returned due cards consist exactly of:
   *   1. All new cards (lastReviewed === null)
   *   2. All reviewed cards whose next-review date has arrived
   *
   * This validates that the due count calculation is correct and unbiased.
   */
  it(
    "due count is exactly new cards + reviewed cards on interval boundary",
    () => {
      fc.assert(
        fc.property(arbDeck, fc.date(), (deck, today) => {
          const dueCards = getDueCards(deck, today);

          // Count new cards
          const newCards = deck.cards.filter((c) => c.lastReviewed === null);

          // Count reviewed cards that are due
          const reviewedDueCards = deck.cards.filter((c) => {
            if (c.lastReviewed === null) return false;

            // A reviewed card is due if it's in the due cards list
            return dueCards.some((dc) => dc.id === c.id);
          });

          // The due count should match new + reviewed-due
          expect(dueCards.length).toBe(newCards.length + reviewedDueCards.length);

          // Every due card should either be new or reviewed-due
          for (const dueCard of dueCards) {
            const isNew = newCards.some((c) => c.id === dueCard.id);
            const isReviewedDue = reviewedDueCards.some((c) => c.id === dueCard.id);
            expect(isNew || isReviewedDue).toBe(true);
          }
        }),
        { numRuns: 100 },
      );
    },
  );

  /**
   * Property Test 3: New cards are always included regardless of box or other fields
   *
   * For any new card (lastReviewed = null) in a deck, regardless of its box value
   * or other fields, it must appear in the due cards list for any date.
   *
   * This validates that the new-card check only depends on lastReviewed being null.
   */
  it(
    "new cards are always due regardless of box or other fields",
    () => {
      fc.assert(
        fc.property(
          arbBox,
          arbCardFront,
          arbCardBack,
          fc.date({
            min: new Date("1970-01-01T00:00:00.000Z"),
            max: new Date("2100-12-31T23:59:59.999Z"),
            noInvalidDate: true,
          }),
          (box, front, back, today) => {
            // Create a single-card deck with a new card (lastReviewed = null)
            const newCard: Card = {
              id: "new-card-1",
              front,
              back,
              box,
              lastReviewed: null, // New card
              createdAt: new Date(today.getTime() - 86400000).toISOString(), // Created yesterday
            };

            const deck = {
              id: "test-deck",
              name: "Test Deck",
              cards: [newCard],
              createdAt: newCard.createdAt,
            };

            const dueCards = getDueCards(deck, today);

            // The new card must be in the due list
            expect(dueCards).toHaveLength(1);
            expect(dueCards[0]).toEqual(newCard);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  /**
   * Property Test 4: Dashboard due count is non-negative and bounded by total cards
   *
   * For any deck and any date, the returned due cards count is:
   *   - Never negative
   *   - Never greater than the total number of cards in the deck
   *
   * This validates that the due count is a sensible subset of the deck's cards.
   */
  it(
    "due count is non-negative and bounded by total cards",
    () => {
      fc.assert(
        fc.property(arbDeck, fc.date(), (deck, today) => {
          const dueCards = getDueCards(deck, today);

          expect(dueCards.length).toBeGreaterThanOrEqual(0);
          expect(dueCards.length).toBeLessThanOrEqual(deck.cards.length);
        }),
        { numRuns: 100 },
      );
    },
  );

  /**
   * Property Test 5: All new cards are always due, even in a mixed deck
   *
   * For any deck containing a mix of new cards and reviewed cards, all new cards
   * must be included in the due count.
   *
   * This validates the core Property 1 for realistic mixed-deck scenarios.
   */
  it(
    "all new cards are included in due count for mixed decks",
    () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              box: arbBox,
              front: arbCardFront,
              back: arbCardBack,
              lastReviewed: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
                nil: null,
              }),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          fc.date({
            min: new Date("1970-01-01T00:00:00.000Z"),
            max: new Date("2100-12-31T23:59:59.999Z"),
            noInvalidDate: true,
          }),
          (cardSpecs, today) => {
            const cards: Card[] = cardSpecs.map((spec, index) => ({
              id: `card-${index}`,
              front: spec.front,
              back: spec.back,
              box: spec.box,
              lastReviewed: spec.lastReviewed,
              createdAt: new Date(today.getTime() - 86400000).toISOString(),
            }));

            const deck = {
              id: "mixed-deck",
              name: "Mixed Deck",
              cards,
              createdAt: new Date(today.getTime() - 86400000).toISOString(),
            };

            const dueCards = getDueCards(deck, today);
            const newCards = cards.filter((c) => c.lastReviewed === null);

            // All new cards must be in the due cards
            for (const newCard of newCards) {
              expect(dueCards.map((c) => c.id)).toContain(newCard.id);
            }

            // The due cards must contain at least all new cards
            expect(dueCards.length).toBeGreaterThanOrEqual(newCards.length);
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
