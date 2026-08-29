import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { getInterval, isDue, getDueCards, promoteCard, resetCard } from "@/lib/leitner";
import { arbDeck } from "@/test/arbitraries";
import type { Card, Deck } from "@/types";

/**
 * Unit tests for the Leitner module.
 *
 * Requirements: 2, 10 (for this test file)
 */

describe("getInterval", () => {
  it("returns correct interval for each box (1-5)", () => {
    expect(getInterval(1)).toBe(1);
    expect(getInterval(2)).toBe(2);
    expect(getInterval(3)).toBe(4);
    expect(getInterval(4)).toBe(8);
    expect(getInterval(5)).toBe(16);
  });

  it("throws error for box < 1", () => {
    expect(() => getInterval(0)).toThrow("Box must be between 1 and 5");
    expect(() => getInterval(-1)).toThrow("Box must be between 1 and 5");
  });

  it("throws error for box > 5", () => {
    expect(() => getInterval(6)).toThrow("Box must be between 1 and 5");
    expect(() => getInterval(100)).toThrow("Box must be between 1 and 5");
  });
});

describe("isDue", () => {
  it("new cards (lastReviewed = null) are always due", () => {
    const card: Card = {
      id: "card-1",
      front: "Q?",
      back: "A.",
      box: 3,
      lastReviewed: null,
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const today = new Date("2024-06-15T12:00:00.000Z");
    expect(isDue(card, today)).toBe(true);
  });

  it("card is due on exact interval boundary", () => {
    // Card in Box 2 (2-day interval), last reviewed on Jan 1
    const card: Card = {
      id: "card-1",
      front: "Q?",
      back: "A.",
      box: 2,
      lastReviewed: "2024-01-01T12:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const dueDate = new Date("2024-01-03T12:00:00.000Z");
    expect(isDue(card, dueDate)).toBe(true);
  });

  it("card is not due before interval boundary", () => {
    // Card in Box 2 (2-day interval), last reviewed on Jan 1
    const card: Card = {
      id: "card-1",
      front: "Q?",
      back: "A.",
      box: 2,
      lastReviewed: "2024-01-01T12:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    // One day before due date
    const beforeDue = new Date("2024-01-02T12:00:00.000Z");
    expect(isDue(card, beforeDue)).toBe(false);
  });

  it("uses midnight comparison for date boundaries", () => {
    // Card in Box 1 (1-day interval), last reviewed on Jan 1
    const card: Card = {
      id: "card-1",
      front: "Q?",
      back: "A.",
      box: 1,
      lastReviewed: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    // On Jan 2 at 00:01 (after midnight), should be due
    const afterMidnight = new Date("2024-01-02T00:01:00.000Z");
    expect(isDue(card, afterMidnight)).toBe(true);

    // On Jan 2 at 00:00 (exactly midnight), should be due
    const atMidnight = new Date("2024-01-02T00:00:00.000Z");
    expect(isDue(card, atMidnight)).toBe(true);

    // Still Jan 1 at 23:59, not due yet
    const beforeMidnight = new Date("2024-01-01T23:59:00.000Z");
    expect(isDue(card, beforeMidnight)).toBe(false);
  });
});

describe("getDueCards", () => {
  it("filters only due cards from deck", () => {
    // Requirements 2: getDueCards() filters only due cards from deck
    const today = new Date("2024-01-05T12:00:00.000Z");

    const dueCard: Card = {
      id: "due-1",
      front: "Due Q",
      back: "Due A",
      box: 1,
      lastReviewed: "2024-01-04T00:00:00.000Z", // 1 day ago, due today (Box 1 = 1 day interval)
      createdAt: "2024-01-04T00:00:00.000Z",
    };

    const notDueCard: Card = {
      id: "not-due-1",
      front: "Not Due Q",
      back: "Not Due A",
      box: 1,
      lastReviewed: "2024-01-05T00:00:00.000Z", // Today, not due yet (needs 1 more day)
      createdAt: "2024-01-05T00:00:00.000Z",
    };

    const newCard: Card = {
      id: "new-1",
      front: "New Q",
      back: "New A",
      box: 1,
      lastReviewed: null,
      createdAt: "2024-01-05T00:00:00.000Z",
    };

    const deck: Deck = {
      id: "deck-1",
      name: "Test Deck",
      cards: [dueCard, notDueCard, newCard],
      createdAt: "2024-01-04T00:00:00.000Z",
    };

    const result = getDueCards(deck, today);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(dueCard);
    expect(result).toContainEqual(newCard);
    expect(result).not.toContainEqual(notDueCard);
  });

  it("returns empty array when no cards are due", () => {
    // Requirements 2: getDueCards() returns empty array when no cards are due
    const today = new Date("2024-01-10T12:00:00.000Z");

    const notDueCard1: Card = {
      id: "not-due-1",
      front: "Q1",
      back: "A1",
      box: 2,
      lastReviewed: "2024-01-09T00:00:00.000Z", // 1 day ago, Box 2 needs 2 days
      createdAt: "2024-01-09T00:00:00.000Z",
    };

    const notDueCard2: Card = {
      id: "not-due-2",
      front: "Q2",
      back: "A2",
      box: 3,
      lastReviewed: "2024-01-08T00:00:00.000Z", // 2 days ago, Box 3 needs 4 days
      createdAt: "2024-01-08T00:00:00.000Z",
    };

    const deck: Deck = {
      id: "deck-1",
      name: "Test Deck",
      cards: [notDueCard1, notDueCard2],
      createdAt: "2024-01-08T00:00:00.000Z",
    };

    const result = getDueCards(deck, today);

    expect(result).toEqual([]);
  });

  it("does not modify the original deck", () => {
    // Requirements 2: getDueCards() does not modify the original deck
    const today = new Date("2024-01-05T12:00:00.000Z");

    const card: Card = {
      id: "card-1",
      front: "Q",
      back: "A",
      box: 1,
      lastReviewed: null,
      createdAt: "2024-01-05T00:00:00.000Z",
    };

    const deck: Deck = {
      id: "deck-1",
      name: "Test Deck",
      cards: [card],
      createdAt: "2024-01-05T00:00:00.000Z",
    };

    const originalDeckString = JSON.stringify(deck);

    getDueCards(deck, today);

    const modifiedDeckString = JSON.stringify(deck);

    expect(modifiedDeckString).toBe(originalDeckString);
  });

  it("handles mixed card states (new, in different boxes)", () => {
    // Requirements 2: getDueCards() handles cards in various states
    const today = new Date("2024-01-10T12:00:00.000Z");

    const box1Card: Card = {
      id: "box1",
      front: "Q1",
      back: "A1",
      box: 1,
      lastReviewed: "2024-01-09T00:00:00.000Z", // 1 day ago, due
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const box3Card: Card = {
      id: "box3",
      front: "Q3",
      back: "A3",
      box: 3,
      lastReviewed: "2024-01-06T00:00:00.000Z", // 4 days ago, due
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const box5Card: Card = {
      id: "box5",
      front: "Q5",
      back: "A5",
      box: 5,
      lastReviewed: "2024-01-01T00:00:00.000Z", // 9 days ago, not due (16 day interval)
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const newCard: Card = {
      id: "new",
      front: "QNew",
      back: "ANew",
      box: 1,
      lastReviewed: null,
      createdAt: "2024-01-10T00:00:00.000Z",
    };

    const deck: Deck = {
      id: "deck-1",
      name: "Mixed Deck",
      cards: [box1Card, box3Card, box5Card, newCard],
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const result = getDueCards(deck, today);

    expect(result).toHaveLength(3);
    expect(result.map((c) => c.id)).toEqual(["box1", "box3", "new"]);
  });

  it("preserves card order from original deck", () => {
    // Requirements 2: getDueCards() maintains order of due cards
    const today = new Date("2024-01-05T12:00:00.000Z");

    const cards: Card[] = Array.from({ length: 5 }, (_, i) => ({
      id: `card-${i}`,
      front: `Q${i}`,
      back: `A${i}`,
      box: 1,
      lastReviewed: null,
      createdAt: "2024-01-05T00:00:00.000Z",
    }));

    const deck: Deck = {
      id: "deck-1",
      name: "Test Deck",
      cards,
      createdAt: "2024-01-05T00:00:00.000Z",
    };

    const result = getDueCards(deck, today);

    expect(result.map((c) => c.id)).toEqual([
      "card-0",
      "card-1",
      "card-2",
      "card-3",
      "card-4",
    ]);
  });

  it("works correctly with empty deck", () => {
    // Edge case: empty deck should return empty array
    const today = new Date("2024-01-05T12:00:00.000Z");

    const deck: Deck = {
      id: "deck-1",
      name: "Empty Deck",
      cards: [],
      createdAt: "2024-01-05T00:00:00.000Z",
    };

    const result = getDueCards(deck, today);

    expect(result).toEqual([]);
  });
});

describe("promoteCard", () => {
  it("increments box by 1", () => {
    const today = new Date("2024-01-05T12:00:00.000Z");

    const card: Card = {
      id: "card-1",
      front: "Q",
      back: "A",
      box: 2,
      lastReviewed: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const promoted = promoteCard(card, today);

    expect(promoted.box).toBe(3);
  });

  it("caps promotion at Box 5", () => {
    const today = new Date("2024-01-05T12:00:00.000Z");

    const card: Card = {
      id: "card-1",
      front: "Q",
      back: "A",
      box: 5,
      lastReviewed: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const promoted = promoteCard(card, today);

    expect(promoted.box).toBe(5);
  });

  it("sets lastReviewed to today", () => {
    const today = new Date("2024-01-05T12:00:00.000Z");

    const card: Card = {
      id: "card-1",
      front: "Q",
      back: "A",
      box: 1,
      lastReviewed: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const promoted = promoteCard(card, today);

    expect(promoted.lastReviewed).toBe(today.toISOString());
  });

  it("does not modify the original card", () => {
    const today = new Date("2024-01-05T12:00:00.000Z");

    const card: Card = {
      id: "card-1",
      front: "Q",
      back: "A",
      box: 2,
      lastReviewed: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const originalBox = card.box;
    const originalLastReviewed = card.lastReviewed;

    promoteCard(card, today);

    expect(card.box).toBe(originalBox);
    expect(card.lastReviewed).toBe(originalLastReviewed);
  });
});

describe("resetCard", () => {
  it("always sets box to 1", () => {
    const today = new Date("2024-01-05T12:00:00.000Z");

    for (let box = 1; box <= 5; box++) {
      const card: Card = {
        id: `card-${box}`,
        front: "Q",
        back: "A",
        box,
        lastReviewed: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const reset = resetCard(card, today);

      expect(reset.box).toBe(1);
    }
  });

  it("sets lastReviewed to today", () => {
    const today = new Date("2024-01-05T12:00:00.000Z");

    const card: Card = {
      id: "card-1",
      front: "Q",
      back: "A",
      box: 3,
      lastReviewed: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const reset = resetCard(card, today);

    expect(reset.lastReviewed).toBe(today.toISOString());
  });

  it("does not modify the original card", () => {
    const today = new Date("2024-01-05T12:00:00.000Z");

    const card: Card = {
      id: "card-1",
      front: "Q",
      back: "A",
      box: 4,
      lastReviewed: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const originalBox = card.box;
    const originalLastReviewed = card.lastReviewed;

    resetCard(card, today);

    expect(card.box).toBe(originalBox);
    expect(card.lastReviewed).toBe(originalLastReviewed);
  });
});

describe("getDueCards - Property Tests", () => {
  it("Property 1: New cards are always due", () => {
    // For any card with lastReviewed === null and any today date,
    // the card shall be identified as due for review.
    // Validates: Requirements 2, 4, 9
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.date({ noInvalidDate: true }),
        (box, today) => {
          const card: Card = {
            id: "test",
            front: "Q",
            back: "A",
            box,
            lastReviewed: null,
            createdAt: "2024-01-01T00:00:00.000Z",
          };

          const deck: Deck = {
            id: "deck",
            name: "Test",
            cards: [card],
            createdAt: "2024-01-01T00:00:00.000Z",
          };

          const dueCards = getDueCards(deck, today);
          expect(dueCards).toHaveLength(1);
          expect(dueCards[0]).toEqual(card);
        },
      ),
    );
  });

  it("Property 2: getDueCards returns only due cards", () => {
    // For any arbitrary deck and date, getDueCards returns only cards
    // that pass the isDue() check.
    fc.assert(
      fc.property(arbDeck, fc.date({ noInvalidDate: true }), (deck, today) => {
        const dueCards = getDueCards(deck, today);

        // Every returned card should pass isDue check
        dueCards.forEach((card) => {
          expect(isDue(card, today)).toBe(true);
        });

        // No non-due cards should be in the result
        deck.cards.forEach((card) => {
          if (!isDue(card, today)) {
            expect(dueCards).not.toContainEqual(card);
          }
        });
      }),
    );
  });

  it("Property 3: getDueCards does not modify original deck", () => {
    // For any arbitrary deck and date, getDueCards should not
    // mutate the original deck or its cards.
    fc.assert(
      fc.property(arbDeck, fc.date({ noInvalidDate: true }), (deck, today) => {
        const originalDecks = JSON.stringify(deck);

        getDueCards(deck, today);

        const modifiedDecks = JSON.stringify(deck);
        expect(modifiedDecks).toBe(originalDecks);
      }),
    );
  });

  it("Property 4: getDueCards preserves card order", () => {
    // For any arbitrary deck, getDueCards preserves the relative order
    // of due cards as they appear in the original deck.
    fc.assert(
      fc.property(arbDeck, fc.date({ noInvalidDate: true }), (deck, today) => {
        const dueCards = getDueCards(deck, today);

        // Extract indices of due cards in original deck
        const dueIndices = deck.cards
          .map((card, index) => (isDue(card, today) ? index : -1))
          .filter((index) => index !== -1);

        // Verify order is preserved
        dueIndices.forEach((originalIndex, resultIndex) => {
          expect(dueCards[resultIndex]).toEqual(deck.cards[originalIndex]);
        });
      }),
    );
  });
});
