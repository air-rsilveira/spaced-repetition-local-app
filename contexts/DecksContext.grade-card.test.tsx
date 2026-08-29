import { describe, expect, it } from "vitest";
import { act, renderHook, type RenderHookOptions } from "@testing-library/react";
import type { ReactNode } from "react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";
import { makeDeck, makeCards } from "@/mocks";
import type { Card } from "@/types";

/**
 * Unit tests for grade card actions (Requirement 7).
 *
 * These tests verify the interaction between grading actions and DecksContext:
 * 1. Correct grading promotes the card via promoteCard + updateCard
 * 2. Incorrect grading resets the card via resetCard + updateCard
 * 3. Changes persist and are reflected in the context
 *
 * All tests use a deterministic test deck with known cards for consistency.
 */

function wrapper({ children }: { children: ReactNode }) {
  return <DecksProvider>{children}</DecksProvider>;
}

const wrappedOptions: RenderHookOptions<unknown> = { wrapper };

describe("DecksContext grade card actions (Requirement 7)", () => {
  describe("Test Correct grading promotes card", () => {
    it("should promote a card to the next box when graded Correct", () => {
      // Setup: Create a deck with one card in box 1
      const card: Card = {
        id: "card-1",
        front: "What is 2+2?",
        back: "4",
        box: 1,
        lastReviewed: null,
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "test-deck",
        name: "Math",
        cards: [card],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      // Add the deck to the context
      let addResult;
      act(() => {
        addResult = result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      expect(addResult!.ok).toBe(true);

      // Get the original card from the context
      const addedDeck = result.current.decks.find((d) => d.id === "test-deck");
      expect(addedDeck).toBeDefined();
      const originalCard = addedDeck!.cards[0];
      expect(originalCard.box).toBe(1);

      // Simulate grading Correct: calls gradeCardCorrect which uses promoteCard internally
      const today = new Date();

      let updateResult;
      act(() => {
        updateResult = result.current.gradeCardCorrect(deck.id, originalCard.id, today);
      });

      expect(updateResult!.ok).toBe(true);

      // Verify the card was promoted (box 1 → box 2)
      const updatedDeck = result.current.decks.find((d) => d.id === "test-deck");
      const updatedCard = updatedDeck!.cards.find((c) => c.id === "card-1");

      expect(updatedCard!.box).toBe(2);
      expect(updatedCard!.lastReviewed).toBeDefined();
      expect(updatedCard!.lastReviewed).not.toBeNull();
    });

    it("should cap promotion at box 5", () => {
      // Setup: Create a card already in box 5
      const card: Card = {
        id: "card-box5",
        front: "Advanced question",
        back: "Advanced answer",
        box: 5,
        lastReviewed: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "advanced-deck",
        name: "Advanced Topics",
        cards: [card],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const addedDeck = result.current.decks.find((d) => d.id === "advanced-deck");
      const originalCard = addedDeck!.cards[0];

      // Promote a card already at box 5
      const today = new Date();

      act(() => {
        result.current.gradeCardCorrect(deck.id, originalCard.id, today);
      });

      const updatedDeck = result.current.decks.find((d) => d.id === "advanced-deck");
      const updatedCard = updatedDeck!.cards.find((c) => c.id === "card-box5");

      // Should remain at box 5
      expect(updatedCard!.box).toBe(5);
    });
  });

  describe("Test Incorrect grading resets card", () => {
    it("should reset a card to box 1 when graded Incorrect", () => {
      // Setup: Create a card in box 3
      const card: Card = {
        id: "card-box3",
        front: "Medium question",
        back: "Medium answer",
        box: 3,
        lastReviewed: "2024-01-10T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "medium-deck",
        name: "Medium Topics",
        cards: [card],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const addedDeck = result.current.decks.find((d) => d.id === "medium-deck");
      const originalCard = addedDeck!.cards[0];
      expect(originalCard.box).toBe(3);

      // Simulate grading Incorrect: calls gradeCardIncorrect
      const today = new Date();

      act(() => {
        result.current.gradeCardIncorrect(deck.id, originalCard.id, today);
      });

      // Verify the card was reset to box 1
      const updatedDeck = result.current.decks.find((d) => d.id === "medium-deck");
      const updatedCard = updatedDeck!.cards.find((c) => c.id === "card-box3");

      expect(updatedCard!.box).toBe(1);
      expect(updatedCard!.lastReviewed).toBeDefined();
      expect(updatedCard!.lastReviewed).not.toBeNull();
    });

    it("should reset card from any box to box 1", () => {
      // Setup: Create a card in box 5
      const card: Card = {
        id: "card-reset-from-5",
        front: "Question",
        back: "Answer",
        box: 5,
        lastReviewed: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "reset-deck",
        name: "Reset Test",
        cards: [card],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const addedDeck = result.current.decks.find((d) => d.id === "reset-deck");
      const originalCard = addedDeck!.cards[0];

      // Reset a card from box 5
      const today = new Date();

      act(() => {
        result.current.gradeCardIncorrect(deck.id, originalCard.id, today);
      });

      const updatedDeck = result.current.decks.find((d) => d.id === "reset-deck");
      const updatedCard = updatedDeck!.cards.find((c) => c.id === "card-reset-from-5");

      // Should be reset to box 1 regardless of prior box
      expect(updatedCard!.box).toBe(1);
    });
  });

  describe("Test persistence via updateCard", () => {
    it("should persist card updates via gradeCardCorrect", () => {
      // Setup: Create a deck with a card
      const card: Card = {
        id: "card-persist",
        front: "Question",
        back: "Answer",
        box: 2,
        lastReviewed: "2024-01-05T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      const deck = makeDeck({
        id: "persist-deck",
        name: "Persistence Test",
        cards: [card],
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      const addedDeck = result.current.decks.find((d) => d.id === "persist-deck");
      const originalCard = addedDeck!.cards[0];

      // Grade the card (promote it)
      const today = new Date();

      let updateResult;
      act(() => {
        updateResult = result.current.gradeCardCorrect(deck.id, originalCard.id, today);
      });

      expect(updateResult!.ok).toBe(true);

      // Verify the update result contains the promoted card with updated box
      if (updateResult!.ok) {
        expect(updateResult!.card.box).toBe(3);
      }

      // Verify it persists in the context
      const persistedDeck = result.current.decks.find((d) => d.id === "persist-deck");
      const persistedCard = persistedDeck!.cards.find((c) => c.id === "card-persist");

      expect(persistedCard!.box).toBe(3);
      expect(persistedCard!.lastReviewed).not.toBeNull();
    });

    it("should update multiple cards independently", () => {
      // Setup: Create a deck with three cards
      const cards: Card[] = [
        {
          id: "card-1",
          front: "Q1",
          back: "A1",
          box: 1,
          lastReviewed: null,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "card-2",
          front: "Q2",
          back: "A2",
          box: 2,
          lastReviewed: "2024-01-03T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "card-3",
          front: "Q3",
          back: "A3",
          box: 3,
          lastReviewed: "2024-01-05T00:00:00.000Z",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const deck = makeDeck({
        id: "multi-deck",
        name: "Multiple Cards",
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

      const addedDeck = result.current.decks.find((d) => d.id === "multi-deck");
      const today = new Date();

      // Grade card 1 as Correct (promote)
      const card1 = addedDeck!.cards[0];
      act(() => {
        result.current.gradeCardCorrect(deck.id, card1.id, today);
      });

      // Grade card 2 as Incorrect (reset)
      const card2 = addedDeck!.cards[1];
      act(() => {
        result.current.gradeCardIncorrect(deck.id, card2.id, today);
      });

      // Grade card 3 as Correct (promote)
      const card3 = addedDeck!.cards[2];
      act(() => {
        result.current.gradeCardCorrect(deck.id, card3.id, today);
      });

      // Verify all updates persisted correctly
      const finalDeck = result.current.decks.find((d) => d.id === "multi-deck");

      const updatedCard1 = finalDeck!.cards.find((c) => c.id === "card-1");
      expect(updatedCard1!.box).toBe(2); // 1 → 2

      const updatedCard2 = finalDeck!.cards.find((c) => c.id === "card-2");
      expect(updatedCard2!.box).toBe(1); // Reset to 1

      const updatedCard3 = finalDeck!.cards.find((c) => c.id === "card-3");
      expect(updatedCard3!.box).toBe(4); // 3 → 4
    });

    it("should return error when updating a non-existent card", () => {
      const deck = makeDeck({
        id: "error-deck",
        name: "Error Test",
        cards: makeCards(1),
      });

      const { result } = renderHook(() => useDecks(), wrappedOptions);

      act(() => {
        result.current.addDeck({
          id: deck.id,
          name: deck.name,
          cards: deck.cards,
        });
      });

      // Try to update a card that doesn't exist
      let updateResult;
      act(() => {
        updateResult = result.current.updateCard({
          deckId: deck.id,
          cardId: "non-existent-card",
          front: "Front",
          back: "Back",
        });
      });

      expect(updateResult!.ok).toBe(false);
      if (!updateResult!.ok) {
        expect(updateResult!.error.code).toBe("not-found");
      }
    });
  });
});
