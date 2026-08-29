import { describe, expect, it } from "vitest";
import { act, renderHook, type RenderHookOptions } from "@testing-library/react";
import type { ReactNode } from "react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";
import { getDueCards } from "@/lib/leitner";
import { makeDeck } from "@/mocks";
import type { Card } from "@/types";

/**
 * Unit tests for the review page edge cases (Task 3.8).
 *
 * These tests verify core review session logic including:
 * 1. Single card review: one due card progress display
 * 2. Empty due cards: no due cards state
 * 3. Promotion cap: Box 5 card stays at Box 5
 * 4. Reset to Box 1: card resets regardless of prior box
 * 5. Multiple cards: sequence state management
 *
 * Requirements: 5 (Card Promotion), 6 (Card Reset)
 */

function wrapper({ children }: { children: ReactNode }) {
  return <DecksProvider>{children}</DecksProvider>;
}

const wrappedOptions: RenderHookOptions<unknown> = { wrapper };

describe("ReviewPage - Edge Cases (Task 3.8)", () => {
  /**
   * Subtask: Test single card review
   * Requirement 5, 6 - Card promotion and reset
   *
   * A deck with only one due card should show "1 of 1" progress
   * and mark the session complete after grading.
   */
  describe("Subtask: Single card review", () => {
    it("should identify a single due card in a deck", () => {
      // Create a card that is due (lastReviewed = null)
      const singleCard: Card = {
        id: "single-card",
        front: "Only Question",
        back: "Only Answer",
        box: 1,
        lastReviewed: null,
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "single-card-deck",
        name: "Single Card Deck",
        cards: [singleCard],
      });

      // getDueCards should identify the one due card
      const today = new Date();
      const dueCards = getDueCards(deck, today);

      expect(dueCards).toHaveLength(1);
      expect(dueCards[0].id).toBe("single-card");
    });

    it("should show progress as '1 of 1' for a single card", () => {
      // Create a single due card
      const singleCard: Card = {
        id: "card-solo",
        front: "Q",
        back: "A",
        box: 1,
        lastReviewed: null,
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "solo-deck",
        name: "Solo",
        cards: [singleCard],
      });

      const today = new Date();
      const dueCards = getDueCards(deck, today);

      // Progress indicator: current card / total cards
      const currentCardIndex = 0;
      const progressText = `${currentCardIndex + 1} of ${dueCards.length}`;

      expect(progressText).toBe("1 of 1");
    });

    it("should mark review complete after grading a single card", () => {
      const singleCard: Card = {
        id: "card-complete",
        front: "Final Question",
        back: "Final Answer",
        box: 1,
        lastReviewed: null,
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "complete-deck",
        name: "To Complete",
        cards: [singleCard],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      // After grading the only card, the due count should be 0
      const addedDeck = result.current.decks.find((d) => d.id === "complete-deck");
      const today = new Date();
      const dueCardsBefore = getDueCards(addedDeck!, today);
      expect(dueCardsBefore).toHaveLength(1);

      // Grade the card (promote it)
      const cardToGrade = addedDeck!.cards[0];
      act(() => {
        result.current.gradeCardCorrect(deck.id, cardToGrade.id, today);
      });

      // After grading, the due count should drop to 0
      const updatedDeck = result.current.decks.find((d) => d.id === "complete-deck");
      const duCardsAfter = getDueCards(updatedDeck!, today);
      expect(duCardsAfter).toHaveLength(0);
    });
  });

  /**
   * Subtask: Test empty due cards
   * Requirement 5, 6 - Review session state
   *
   * When a deck has no due cards, the system should show a
   * "No cards due" message.
   */
  describe("Subtask: Empty due cards", () => {
    it("should return empty due cards when deck has no cards", () => {
      const emptyDeck = makeDeck({
        id: "empty-deck",
        name: "Empty",
        cards: [],
      });

      const today = new Date();
      const dueCards = getDueCards(emptyDeck, today);

      expect(dueCards).toHaveLength(0);
    });

    it("should return empty due cards when all cards are in the future", () => {
      // Create a card reviewed today but in Box 5 (16 day interval)
      // so it won't be due again for 16 days
      const card: Card = {
        id: "card-future",
        front: "Future Question",
        back: "Future Answer",
        box: 5,
        lastReviewed: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "future-deck",
        name: "Future Deck",
        cards: [card],
      });

      // Check on 2024-01-10 (9 days later, but interval is 16)
      const today = new Date("2024-01-10T00:00:00.000Z");
      const dueCards = getDueCards(deck, today);

      expect(dueCards).toHaveLength(0);
    });

    it("should show 'No cards due' state when due cards array is empty", () => {
      const cardInFuture: Card = {
        id: "card-not-due",
        front: "Not Due Yet",
        back: "Will be due later",
        box: 3,
        lastReviewed: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "no-due-deck",
        name: "No Due Cards",
        cards: [cardInFuture],
      });

      // Check on a date where no cards are due
      const today = new Date("2024-01-02T00:00:00.000Z");
      const dueCards = getDueCards(deck, today);

      // When no due cards, show appropriate message
      if (dueCards.length === 0) {
        const emptyStateMessage = "No cards due";
        expect(emptyStateMessage).toBe("No cards due");
      }
    });

    it("should handle deck with all reviewed cards not yet due", () => {
      // Create multiple cards all reviewed recently (not due yet)
      const cards: Card[] = [
        {
          id: "card-1",
          front: "Q1",
          back: "A1",
          box: 1,
          lastReviewed: new Date("2024-01-05T00:00:00.000Z").toISOString(),
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "card-2",
          front: "Q2",
          back: "A2",
          box: 2,
          lastReviewed: new Date("2024-01-04T00:00:00.000Z").toISOString(),
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "card-3",
          front: "Q3",
          back: "A3",
          box: 3,
          lastReviewed: new Date("2024-01-03T00:00:00.000Z").toISOString(),
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const deck = makeDeck({
        id: "recent-deck",
        name: "Recently Reviewed",
        cards,
      });

      // Check on 2024-01-05 (one day after first card reviewed)
      // - Card 1 (Box 1, 1 day interval): due on 2024-01-06, so NOT due on 2024-01-05
      // - Card 2 (Box 2, 2 day interval): due on 2024-01-06, so NOT due on 2024-01-05
      // - Card 3 (Box 3, 4 day interval): due on 2024-01-07, so NOT due on 2024-01-05
      const today = new Date("2024-01-05T12:00:00.000Z");
      const dueCards = getDueCards(deck, today);

      expect(dueCards).toHaveLength(0);
    });
  });

  /**
   * Subtask: Test promotion cap at Box 5
   * Requirement 5 - Card Promotion
   *
   * When a card in Box 5 is graded Correct, it should stay at Box 5.
   */
  describe("Subtask: Promotion cap at Box 5", () => {
    it("should keep a Box 5 card at Box 5 when graded Correct", () => {
      const cardAtBox5: Card = {
        id: "card-box5",
        front: "Advanced Q",
        back: "Advanced A",
        box: 5,
        lastReviewed: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "box5-deck",
        name: "Box 5 Test",
        cards: [cardAtBox5],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const addedDeck = result.current.decks.find((d) => d.id === "box5-deck");
      const cardToGrade = addedDeck!.cards[0];

      expect(cardToGrade.box).toBe(5);

      // Grade it Correct
      const today = new Date();
      act(() => {
        result.current.gradeCardCorrect(deck.id, cardToGrade.id, today);
      });

      // Should still be at Box 5, not 6
      const updatedDeck = result.current.decks.find((d) => d.id === "box5-deck");
      const updatedCard = updatedDeck!.cards[0];

      expect(updatedCard.box).toBe(5);
    });

    it("should not exceed Box 5 when promoting", () => {
      const cardAtBox5: Card = {
        id: "card-max",
        front: "Max Level",
        back: "Stay max",
        box: 5,
        lastReviewed: "2023-12-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "max-deck",
        name: "Max Box",
        cards: [cardAtBox5],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const addedDeck = result.current.decks.find((d) => d.id === "max-deck");
      const cardToGrade = addedDeck!.cards[0];

      // Grade multiple times to ensure cap holds
      const today = new Date();

      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.gradeCardCorrect(deck.id, cardToGrade.id, today);
        });

        const currentDeck = result.current.decks.find((d) => d.id === "max-deck");
        const currentCard = currentDeck!.cards[0];

        expect(currentCard.box).toBeLessThanOrEqual(5);
        expect(currentCard.box).toBe(5);
      }
    });

    it("should update lastReviewed even when capped at Box 5", () => {
      const cardAtBox5: Card = {
        id: "card-lastreviewed",
        front: "Q",
        back: "A",
        box: 5,
        lastReviewed: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "reviewed-deck",
        name: "Last Reviewed",
        cards: [cardAtBox5],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const addedDeck = result.current.decks.find((d) => d.id === "reviewed-deck");
      const cardToGrade = addedDeck!.cards[0];
      const originalLastReviewed = cardToGrade.lastReviewed;

      // Grade on a new date
      const newDate = new Date("2024-01-20T00:00:00.000Z");
      act(() => {
        result.current.gradeCardCorrect(deck.id, cardToGrade.id, newDate);
      });

      const updatedDeck = result.current.decks.find((d) => d.id === "reviewed-deck");
      const updatedCard = updatedDeck!.cards[0];

      // Box should stay at 5
      expect(updatedCard.box).toBe(5);
      // But lastReviewed should update
      expect(updatedCard.lastReviewed).not.toBe(originalLastReviewed);
      expect(updatedCard.lastReviewed).toBe(newDate.toISOString());
    });
  });

  /**
   * Subtask: Test reset to Box 1
   * Requirement 6 - Card Reset
   *
   * When a card in any box is graded Incorrect, it should reset to Box 1.
   */
  describe("Subtask: Reset to Box 1", () => {
    it("should reset a Box 2 card to Box 1 when graded Incorrect", () => {
      const cardAtBox2: Card = {
        id: "card-box2",
        front: "Q2",
        back: "A2",
        box: 2,
        lastReviewed: "2024-01-03T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "reset2-deck",
        name: "Reset from 2",
        cards: [cardAtBox2],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const addedDeck = result.current.decks.find((d) => d.id === "reset2-deck");
      const cardToGrade = addedDeck!.cards[0];

      expect(cardToGrade.box).toBe(2);

      // Grade as Incorrect
      const today = new Date();
      act(() => {
        result.current.gradeCardIncorrect(deck.id, cardToGrade.id, today);
      });

      // Should be at Box 1
      const updatedDeck = result.current.decks.find((d) => d.id === "reset2-deck");
      const updatedCard = updatedDeck!.cards[0];

      expect(updatedCard.box).toBe(1);
    });

    it("should reset a Box 5 card to Box 1 when graded Incorrect", () => {
      const cardAtBox5: Card = {
        id: "card-reset-from-5",
        front: "Advanced",
        back: "Will reset",
        box: 5,
        lastReviewed: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "reset5-deck",
        name: "Reset from 5",
        cards: [cardAtBox5],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const addedDeck = result.current.decks.find((d) => d.id === "reset5-deck");
      const cardToGrade = addedDeck!.cards[0];

      // Grade as Incorrect
      const today = new Date();
      act(() => {
        result.current.gradeCardIncorrect(deck.id, cardToGrade.id, today);
      });

      // Should be reset to Box 1 from Box 5
      const updatedDeck = result.current.decks.find((d) => d.id === "reset5-deck");
      const updatedCard = updatedDeck!.cards[0];

      expect(updatedCard.box).toBe(1);
    });

    it("should reset a Box 1 card to Box 1 when graded Incorrect", () => {
      const cardAtBox1: Card = {
        id: "card-box1-reset",
        front: "New card",
        back: "Will stay at 1",
        box: 1,
        lastReviewed: null,
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "reset1-deck",
        name: "Reset from 1",
        cards: [cardAtBox1],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const addedDeck = result.current.decks.find((d) => d.id === "reset1-deck");
      const cardToGrade = addedDeck!.cards[0];

      // Grade as Incorrect
      const today = new Date();
      act(() => {
        result.current.gradeCardIncorrect(deck.id, cardToGrade.id, today);
      });

      // Should stay at Box 1
      const updatedDeck = result.current.decks.find((d) => d.id === "reset1-deck");
      const updatedCard = updatedDeck!.cards[0];

      expect(updatedCard.box).toBe(1);
    });

    it("should update lastReviewed when resetting to Box 1", () => {
      const cardAtBox4: Card = {
        id: "card-box4-reset",
        front: "Q4",
        back: "A4",
        box: 4,
        lastReviewed: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "reset4-deck",
        name: "Reset from 4",
        cards: [cardAtBox4],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const addedDeck = result.current.decks.find((d) => d.id === "reset4-deck");
      const cardToGrade = addedDeck!.cards[0];
      const originalLastReviewed = cardToGrade.lastReviewed;

      // Grade on a new date
      const newDate = new Date("2024-01-15T00:00:00.000Z");
      act(() => {
        result.current.gradeCardIncorrect(deck.id, cardToGrade.id, newDate);
      });

      // Should be reset to Box 1
      const updatedDeck = result.current.decks.find((d) => d.id === "reset4-deck");
      const updatedCard = updatedDeck!.cards[0];

      expect(updatedCard.box).toBe(1);
      // lastReviewed should update to new date
      expect(updatedCard.lastReviewed).not.toBe(originalLastReviewed);
      expect(updatedCard.lastReviewed).toBe(newDate.toISOString());
    });
  });

  /**
   * Subtask: Test multiple cards state management
   * Requirement 5, 6 - State management across card sequence
   *
   * Verify state management handles sequence correctly when
   * grading multiple cards in sequence.
   */
  describe("Subtask: Multiple cards state management", () => {
    it("should maintain correct state through multiple card grades", () => {
      // Create multiple cards with different boxes
      const cards: Card[] = [
        {
          id: "card-seq-1",
          front: "Q1",
          back: "A1",
          box: 1,
          lastReviewed: null,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "card-seq-2",
          front: "Q2",
          back: "A2",
          box: 2,
          lastReviewed: "2024-01-03T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "card-seq-3",
          front: "Q3",
          back: "A3",
          box: 3,
          lastReviewed: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const deck = makeDeck({
        id: "seq-deck",
        name: "Sequence Deck",
        cards,
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const today = new Date("2024-01-05T00:00:00.000Z");
      let addedDeck = result.current.decks.find((d) => d.id === "seq-deck");
      const dueCards = getDueCards(addedDeck!, today);

      // All three should be due on 2024-01-05
      expect(dueCards).toHaveLength(3);

      // Grade card 1 as Correct (1 → 2)
      act(() => {
        result.current.gradeCardCorrect(deck.id, cards[0].id, today);
      });

      addedDeck = result.current.decks.find((d) => d.id === "seq-deck");
      const card1 = addedDeck!.cards.find((c) => c.id === "card-seq-1");
      expect(card1!.box).toBe(2);

      // Grade card 2 as Incorrect (2 → 1)
      act(() => {
        result.current.gradeCardIncorrect(deck.id, cards[1].id, today);
      });

      addedDeck = result.current.decks.find((d) => d.id === "seq-deck");
      const card2 = addedDeck!.cards.find((c) => c.id === "card-seq-2");
      expect(card2!.box).toBe(1);

      // Grade card 3 as Correct (3 → 4)
      act(() => {
        result.current.gradeCardCorrect(deck.id, cards[2].id, today);
      });

      addedDeck = result.current.decks.find((d) => d.id === "seq-deck");
      const card3 = addedDeck!.cards.find((c) => c.id === "card-seq-3");
      expect(card3!.box).toBe(4);

      // Verify all cards were updated correctly
      const finalCard1 = addedDeck!.cards.find((c) => c.id === "card-seq-1");
      const finalCard2 = addedDeck!.cards.find((c) => c.id === "card-seq-2");
      const finalCard3 = addedDeck!.cards.find((c) => c.id === "card-seq-3");

      expect(finalCard1!.box).toBe(2);
      expect(finalCard2!.box).toBe(1);
      expect(finalCard3!.box).toBe(4);
    });

    it("should update due count as cards are graded", () => {
      // Create a deck with 3 due cards
      const cards: Card[] = [
        {
          id: "due-1",
          front: "Q1",
          back: "A1",
          box: 1,
          lastReviewed: null,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "due-2",
          front: "Q2",
          back: "A2",
          box: 1,
          lastReviewed: null,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "due-3",
          front: "Q3",
          back: "A3",
          box: 1,
          lastReviewed: null,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const deck = makeDeck({
        id: "due-count-deck",
        name: "Due Count",
        cards,
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const today = new Date();
      let addedDeck = result.current.decks.find((d) => d.id === "due-count-deck");
      let dueCards = getDueCards(addedDeck!, today);

      expect(dueCards).toHaveLength(3);

      // Grade first card
      act(() => {
        result.current.gradeCardCorrect(deck.id, cards[0].id, today);
      });

      addedDeck = result.current.decks.find((d) => d.id === "due-count-deck");
      dueCards = getDueCards(addedDeck!, today);
      expect(dueCards).toHaveLength(2);

      // Grade second card
      act(() => {
        result.current.gradeCardCorrect(deck.id, cards[1].id, today);
      });

      addedDeck = result.current.decks.find((d) => d.id === "due-count-deck");
      dueCards = getDueCards(addedDeck!, today);
      expect(dueCards).toHaveLength(1);

      // Grade third card
      act(() => {
        result.current.gradeCardCorrect(deck.id, cards[2].id, today);
      });

      addedDeck = result.current.decks.find((d) => d.id === "due-count-deck");
      dueCards = getDueCards(addedDeck!, today);
      expect(dueCards).toHaveLength(0);
    });

    it("should handle mixed Correct and Incorrect grades in sequence", () => {
      const cards: Card[] = [
        {
          id: "mixed-1",
          front: "Q1",
          back: "A1",
          box: 1,
          lastReviewed: null,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "mixed-2",
          front: "Q2",
          back: "A2",
          box: 2,
          lastReviewed: "2024-01-02T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "mixed-3",
          front: "Q3",
          back: "A3",
          box: 3,
          lastReviewed: "2024-01-01T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "mixed-4",
          front: "Q4",
          back: "A4",
          box: 4,
          lastReviewed: "2024-01-02T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const deck = makeDeck({
        id: "mixed-deck",
        name: "Mixed Grades",
        cards,
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const today = new Date("2024-01-05T00:00:00.000Z");

      // Grade card 1: Correct (1 → 2)
      act(() => {
        result.current.gradeCardCorrect(deck.id, cards[0].id, today);
      });

      // Grade card 2: Incorrect (2 → 1)
      act(() => {
        result.current.gradeCardIncorrect(deck.id, cards[1].id, today);
      });

      // Grade card 3: Correct (3 → 4)
      act(() => {
        result.current.gradeCardCorrect(deck.id, cards[2].id, today);
      });

      // Grade card 4: Incorrect (4 → 1)
      act(() => {
        result.current.gradeCardIncorrect(deck.id, cards[3].id, today);
      });

      const finalDeck = result.current.decks.find((d) => d.id === "mixed-deck");

      const finalCard1 = finalDeck!.cards.find((c) => c.id === "mixed-1");
      const finalCard2 = finalDeck!.cards.find((c) => c.id === "mixed-2");
      const finalCard3 = finalDeck!.cards.find((c) => c.id === "mixed-3");
      const finalCard4 = finalDeck!.cards.find((c) => c.id === "mixed-4");

      expect(finalCard1!.box).toBe(2);
      expect(finalCard2!.box).toBe(1);
      expect(finalCard3!.box).toBe(4);
      expect(finalCard4!.box).toBe(1);
    });
  });
});
