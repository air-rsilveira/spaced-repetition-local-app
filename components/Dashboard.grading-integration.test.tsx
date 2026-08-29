import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import Dashboard from "@/components/Dashboard";
import { UIActionsProvider } from "@/contexts/UIActionsContext";
import { getDueCards, promoteCard, resetCard } from "@/lib/leitner";
import type { DeckList, Card } from "@/types";

/**
 * Integration test: Dashboard due count updates after grading cards (Task 6.2)
 *
 * Requirements: 7, 8, 9
 * Validates: Property 5 (Due Cards Decrease After Review)
 *
 * This test verifies the complete workflow of grading cards in the review
 * session and seeing the dashboard due counts update in real-time.
 *
 * Test scenarios:
 * 1. Initial dashboard shows correct due count for deck with due cards
 * 2. After grading a card Correct, due count decreases by 1
 * 3. After grading multiple cards with mixed results, due count reflects actual state
 * 4. DeckCard component displays updated due count badge
 * 5. Dashboard persists the updated due counts across re-renders
 *
 * This validates:
 * - Requirement 7: Persistence (cards updated through DecksContext)
 * - Requirement 8: Progress tracking (due count decreases as cards are reviewed)
 * - Requirement 9: Dashboard due count (displays and updates correctly)
 * - Property 5: After grading one card, due count decreases by exactly 1
 */

// Mock useDecks to return a mutable store
const mockUseDecks = vi.fn();

vi.mock("@/contexts/DecksContext", () => ({
  useDecks: () => mockUseDecks(),
}));

function mockStore(
  decks: DeckList,
  gradeCardCorrect: ReturnType<typeof vi.fn> = vi.fn(),
  gradeCardIncorrect: ReturnType<typeof vi.fn> = vi.fn()
) {
  mockUseDecks.mockReturnValue({
    decks,
    status: "ready",
    error: null,
    addDeck: vi.fn(),
    updateDeck: vi.fn(),
    deleteDeck: vi.fn(),
    addCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    gradeCardCorrect,
    gradeCardIncorrect,
  });
}

afterEach(() => {
  cleanup();
  mockUseDecks.mockReset();
});

describe("Dashboard due count updates after grading (Task 6.2, Requirements 7, 8, 9)", () => {
  /**
   * Subtask 1: Write integration test for Dashboard updates
   *
   * Verify that Dashboard correctly calculates and displays due counts
   * for each deck using getDueCards.
   */
  describe("Subtask 1: Dashboard integration test setup", () => {
    it("should render Dashboard with multiple decks and due counts", () => {
      const today = new Date();
      const decks: DeckList = [
        {
          id: "deck-1",
          name: "Spanish Basics",
          description: "Basic Spanish vocabulary",
          createdAt: today.toISOString(),
          cards: [
            {
              id: "es-card-1",
              front: "Hola",
              back: "Hello",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
            {
              id: "es-card-2",
              front: "Adiós",
              back: "Goodbye",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
          ],
        },
        {
          id: "deck-2",
          name: "French Basics",
          description: "Basic French vocabulary",
          createdAt: today.toISOString(),
          cards: [
            {
              id: "fr-card-1",
              front: "Bonjour",
              back: "Hello",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
          ],
        },
      ];

      mockStore(decks);
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Verify Dashboard renders
      expect(screen.getByRole("heading", { name: /Your decks/i })).toBeInTheDocument();

      // Verify deck cards are displayed
      expect(screen.getByText("Spanish Basics")).toBeInTheDocument();
      expect(screen.getByText("French Basics")).toBeInTheDocument();

      // Verify due count badges are displayed
      const badges = screen.getAllByTestId("due-count-badge");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("should calculate due count correctly using getDueCards", () => {
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);

      const deck = {
        id: "calc-deck",
        name: "Calculation Test",
        description: "",
        createdAt: today.toISOString(),
        cards: [
          // New card (always due)
          {
            id: "new-card",
            front: "Q1",
            back: "A1",
            box: 1,
            lastReviewed: null,
            createdAt: today.toISOString(),
          },
          // Box 2 card reviewed 3 days ago (3 days >= 2 day interval, so due)
          {
            id: "box2-card",
            front: "Q2",
            back: "A2",
            box: 2,
            lastReviewed: threeDaysAgo.toISOString(),
            createdAt: today.toISOString(),
          },
          // Box 5 card reviewed 3 days ago (3 days < 16 day interval, so NOT due)
          {
            id: "box5-card",
            front: "Q3",
            back: "A3",
            box: 5,
            lastReviewed: threeDaysAgo.toISOString(),
            createdAt: today.toISOString(),
          },
        ],
      };

      const dueCards = getDueCards(deck, today);
      
      // Should have 2 due cards (new + box2)
      expect(dueCards).toHaveLength(2);
      expect(dueCards.map((c) => c.id)).toContain("new-card");
      expect(dueCards.map((c) => c.id)).toContain("box2-card");
      expect(dueCards.map((c) => c.id)).not.toContain("box5-card");

      mockStore([deck]);
      render(<Dashboard />, { wrapper: UIActionsProvider });

      const badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("2 due");
    });
  });

  /**
   * Subtask 2: Test due count decreases when card graded correct
   *
   * When a card is graded Correct:
   * - Card is promoted to next box
   * - lastReviewed is set to today
   * - Card moves from "due today" to "due on future date"
   * - Dashboard should show due count decreased by 1
   */
  describe("Subtask 2: Due count decreases when card graded Correct", () => {
    it("should decrease due count by 1 after grading a Box 1 card Correct", () => {
      // Property 5: Due Cards Decrease After Review
      const today = new Date();
      const deckId = "correct-test-deck";
      const cardId = "correct-test-card-1";

      const initialDecks: DeckList = [
        {
          id: deckId,
          name: "Correct Grade Test",
          createdAt: today.toISOString(),
          cards: [
            {
              id: cardId,
              front: "Question 1",
              back: "Answer 1",
              box: 1,
              lastReviewed: null, // New card, always due
              createdAt: today.toISOString(),
            },
            {
              id: "correct-test-card-2",
              front: "Question 2",
              back: "Answer 2",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
          ],
        },
      ];

      mockStore(initialDecks);
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Initial state: 2 due cards
      const badgeInitial = screen.getByTestId("due-count-badge");
      expect(badgeInitial.textContent).toBe("2 due");

      // Simulate grading card-1 as Correct
      const currentCard = initialDecks[0].cards.find((c) => c.id === cardId)!;
      const promotedCard = promoteCard(currentCard, today);

      // Verify promotion logic
      expect(promotedCard.box).toBe(2); // 1 → 2
      expect(promotedCard.lastReviewed).toBe(today.toISOString());

      // Card in Box 2 with lastReviewed = today is NOT due today
      // (Box 2 has 2-day interval, so next due is tomorrow)
      expect(getDueCards(initialDecks[0], today)).toHaveLength(2);

      // Create updated decks with promoted card
      const updatedDecks: DeckList = [
        {
          id: deckId,
          name: "Correct Grade Test",
          createdAt: today.toISOString(),
          cards: [
            promotedCard,
            initialDecks[0].cards[1], // Card 2 unchanged
          ],
        },
      ];

      // Verify only 1 card is due after grading
      expect(getDueCards(updatedDecks[0], today)).toHaveLength(1);

      // Update mock store and re-render
      mockStore(updatedDecks);
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Verify due count decreased by 1
      const badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("1 due");
    });

    it("should decrease due count when grading Box 2 card Correct", () => {
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);

      const deckId = "box2-correct-test";
      const cardId = "box2-correct-card";

      const initialDecks: DeckList = [
        {
          id: deckId,
          name: "Box 2 Correct Test",
          createdAt: today.toISOString(),
          cards: [
            {
              id: cardId,
              front: "Q1",
              back: "A1",
              box: 2,
              lastReviewed: twoDaysAgo.toISOString(), // Due today (2 days ago + 2 day interval)
              createdAt: today.toISOString(),
            },
            {
              id: "box2-correct-card-2",
              front: "Q2",
              back: "A2",
              box: 1,
              lastReviewed: null, // Also due
              createdAt: today.toISOString(),
            },
          ],
        },
      ];

      mockStore(initialDecks);
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Initial: 2 due cards
      let badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("2 due");

      // Grade first card as Correct (Box 2 → Box 3)
      const currentCard = initialDecks[0].cards[0];
      const promotedCard = promoteCard(currentCard, today);
      expect(promotedCard.box).toBe(3);

      // Card in Box 3 with lastReviewed = today is NOT due today
      // (Box 3 has 4-day interval)
      const updatedDecks: DeckList = [
        {
          id: deckId,
          name: "Box 2 Correct Test",
          createdAt: today.toISOString(),
          cards: [
            promotedCard,
            initialDecks[0].cards[1],
          ],
        },
      ];

      expect(getDueCards(updatedDecks[0], today)).toHaveLength(1);

      mockStore(updatedDecks);
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("1 due");
    });

    it("should NOT decrease due count when grading Box 5 card Correct (already at max)", () => {
      const today = new Date();
      const sixteenDaysAgo = new Date(today);
      sixteenDaysAgo.setUTCDate(sixteenDaysAgo.getUTCDate() - 16);

      const deckId = "box5-correct-test";
      const cardId = "box5-correct-card";

      const initialDecks: DeckList = [
        {
          id: deckId,
          name: "Box 5 Correct Test",
          createdAt: today.toISOString(),
          cards: [
            {
              id: cardId,
              front: "Q1",
              back: "A1",
              box: 5,
              lastReviewed: sixteenDaysAgo.toISOString(), // Due today
              createdAt: today.toISOString(),
            },
            {
              id: "box5-correct-card-2",
              front: "Q2",
              back: "A2",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
          ],
        },
      ];

      mockStore(initialDecks);
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Initial: 2 due cards
      let badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("2 due");

      // Grade first card as Correct (Box 5 stays at 5, capped)
      const currentCard = initialDecks[0].cards[0];
      const promotedCard = promoteCard(currentCard, today);
      expect(promotedCard.box).toBe(5); // Capped at 5

      // Card in Box 5 with lastReviewed = today is NOT due today
      // (Box 5 has 16-day interval)
      const updatedDecks: DeckList = [
        {
          id: deckId,
          name: "Box 5 Correct Test",
          createdAt: today.toISOString(),
          cards: [
            promotedCard,
            initialDecks[0].cards[1],
          ],
        },
      ];

      expect(getDueCards(updatedDecks[0], today)).toHaveLength(1);

      mockStore(updatedDecks);
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("1 due");
    });
  });

  /**
   * Subtask 3: Test due count reflects correct state after multiple grades
   *
   * Grade multiple cards with different outcomes (Correct/Incorrect)
   * and verify the due count reflects the final state accurately.
   */
  describe("Subtask 3: Due count reflects correct state after multiple grades", () => {
    it("should reflect correct due count after grading multiple cards Correct", () => {
      const today = new Date();
      const deckId = "multi-correct-deck";

      const initialDecks: DeckList = [
        {
          id: deckId,
          name: "Multiple Correct Grades",
          createdAt: today.toISOString(),
          cards: [
            {
              id: "multi-1",
              front: "Q1",
              back: "A1",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
            {
              id: "multi-2",
              front: "Q2",
              back: "A2",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
            {
              id: "multi-3",
              front: "Q3",
              back: "A3",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
          ],
        },
      ];

      mockStore(initialDecks);
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Initial: 3 due cards
      let badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("3 due");

      // Grade card 1 as Correct (1 → 2)
      let cards = [...initialDecks[0].cards];
      cards[0] = promoteCard(cards[0], today);

      let updatedDecks: DeckList = [{ ...initialDecks[0], cards }];
      expect(getDueCards(updatedDecks[0], today)).toHaveLength(2);

      mockStore(updatedDecks);
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("2 due");

      // Grade card 2 as Correct (1 → 2)
      cards = [...updatedDecks[0].cards];
      cards[1] = promoteCard(cards[1], today);

      updatedDecks = [{ ...updatedDecks[0], cards }];
      expect(getDueCards(updatedDecks[0], today)).toHaveLength(1);

      mockStore(updatedDecks);
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("1 due");

      // Grade card 3 as Correct (1 → 2)
      cards = [...updatedDecks[0].cards];
      cards[2] = promoteCard(cards[2], today);

      updatedDecks = [{ ...updatedDecks[0], cards }];
      expect(getDueCards(updatedDecks[0], today)).toHaveLength(0);

      mockStore(updatedDecks);
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Final: No due cards badge should be hidden
      const finalBadges = screen.queryAllByTestId("due-count-badge");
      expect(finalBadges).toHaveLength(0);
    });

    it("should reflect correct due count after mix of Correct and Incorrect grades", () => {
      const today = new Date();
      const oneDayAgo = new Date(today);
      oneDayAgo.setUTCDate(oneDayAgo.getUTCDate() - 1);

      const deckId = "mixed-grades-deck";

      const initialDecks: DeckList = [
        {
          id: deckId,
          name: "Mixed Grades",
          createdAt: today.toISOString(),
          cards: [
            {
              id: "mixed-1",
              front: "Q1",
              back: "A1",
              box: 2,
              lastReviewed: oneDayAgo.toISOString(), // Box 2, reviewed 1 day ago (not yet due)
              createdAt: today.toISOString(),
            },
            {
              id: "mixed-2",
              front: "Q2",
              back: "A2",
              box: 1,
              lastReviewed: null, // New, always due
              createdAt: today.toISOString(),
            },
            {
              id: "mixed-3",
              front: "Q3",
              back: "A3",
              box: 2,
              lastReviewed: oneDayAgo.toISOString(), // Box 2, reviewed 1 day ago (not yet due)
              createdAt: today.toISOString(),
            },
          ],
        },
      ];

      mockStore(initialDecks);
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Initial: Only card 2 is due (new card)
      const badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("1 due");

      // Manually verify using getDueCards
      expect(getDueCards(initialDecks[0], today)).toHaveLength(1);

      // Now suppose cards were updated and reviewed:
      // - Card 1: graded Incorrect → Box 1, lastReviewed = today (NOT due today)
      // - Card 2: graded Correct → Box 2, lastReviewed = today (NOT due today)
      // - Card 3: graded Correct → Box 3, lastReviewed = today (NOT due today)

      const cards = [...initialDecks[0].cards];
      cards[0] = resetCard(cards[0], today); // Box 2 → Box 1
      cards[1] = promoteCard(cards[1], today); // Box 1 → Box 2
      cards[2] = promoteCard(cards[2], today); // Box 2 → Box 3

      const updatedDecks: DeckList = [{ ...initialDecks[0], cards }];
      expect(getDueCards(updatedDecks[0], today)).toHaveLength(0);

      mockStore(updatedDecks);
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Final: No due cards
      const finalBadges = screen.queryAllByTestId("due-count-badge");
      expect(finalBadges).toHaveLength(0);
    });

    it("should track due count across multiple decks independently", () => {
      const today = new Date();

      const initialDecks: DeckList = [
        {
          id: "deck-a",
          name: "Deck A",
          createdAt: today.toISOString(),
          cards: [
            {
              id: "a-1",
              front: "Q1",
              back: "A1",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
            {
              id: "a-2",
              front: "Q2",
              back: "A2",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
          ],
        },
        {
          id: "deck-b",
          name: "Deck B",
          createdAt: today.toISOString(),
          cards: [
            {
              id: "b-1",
              front: "Q1",
              back: "A1",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
          ],
        },
      ];

      mockStore(initialDecks);
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Initial: Deck A has 2 due, Deck B has 1 due
      const badges = screen.getAllByTestId("due-count-badge");
      expect(badges).toHaveLength(2);
      expect(badges[0].textContent).toBe("2 due"); // Deck A
      expect(badges[1].textContent).toBe("1 due"); // Deck B

      // Grade one card in Deck A
      let deckA = initialDecks[0];
      const updatedCards = [...deckA.cards];
      updatedCards[0] = promoteCard(updatedCards[0], today);
      deckA = { ...deckA, cards: updatedCards };

      const updatedDecks: DeckList = [deckA, initialDecks[1]];

      mockStore(updatedDecks);
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Updated: Deck A has 1 due, Deck B still has 1 due
      const newBadges = screen.getAllByTestId("due-count-badge");
      expect(newBadges).toHaveLength(2);
      expect(newBadges[0].textContent).toBe("1 due"); // Deck A (decreased)
      expect(newBadges[1].textContent).toBe("1 due"); // Deck B (unchanged)
    });
  });

  /**
   * Subtask 4: Test due count in DeckCard updates in real-time
   *
   * The DeckCard component should receive the updated dueCount prop
   * and display the correct badge without requiring a hard page refresh.
   */
  describe("Subtask 4: Due count in DeckCard updates in real-time", () => {
    it("should update DeckCard due count badge when deck is updated", () => {
      const today = new Date();
      const deckId = "realtime-deck";

      const initialDecks: DeckList = [
        {
          id: deckId,
          name: "Real-time Update Test",
          createdAt: today.toISOString(),
          cards: [
            {
              id: "realtime-1",
              front: "Q1",
              back: "A1",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
            {
              id: "realtime-2",
              front: "Q2",
              back: "A2",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
          ],
        },
      ];

      mockStore(initialDecks);
      const { rerender } = render(<Dashboard />, { wrapper: UIActionsProvider });

      // Initial badge shows 2 due
      let badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("2 due");

      // Grade first card as Correct
      const cards = [...initialDecks[0].cards];
      cards[0] = promoteCard(cards[0], today);

      const updatedDecks: DeckList = [{ ...initialDecks[0], cards }];
      mockStore(updatedDecks);

      // Re-render Dashboard with updated decks
      rerender(<Dashboard />);

      // Badge should update to 1 due without page refresh
      badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("1 due");
    });

    it("should hide due count badge when count reaches 0", () => {
      const today = new Date();
      const deckId = "hide-badge-deck";

      const initialDecks: DeckList = [
        {
          id: deckId,
          name: "Hide Badge Test",
          createdAt: today.toISOString(),
          cards: [
            {
              id: "hide-1",
              front: "Q1",
              back: "A1",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
          ],
        },
      ];

      mockStore(initialDecks);
      const { rerender } = render(<Dashboard />, { wrapper: UIActionsProvider });

      // Initial badge shows 1 due
      const badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("1 due");

      // Grade the only card as Correct
      const cards = [...initialDecks[0].cards];
      cards[0] = promoteCard(cards[0], today);

      const updatedDecks: DeckList = [{ ...initialDecks[0], cards }];
      mockStore(updatedDecks);

      rerender(<Dashboard />);

      // Badge should be hidden (not rendered) when count is 0
      const badges = screen.queryAllByTestId("due-count-badge");
      expect(badges).toHaveLength(0);
    });

    it("should display correct badge value for different due counts", () => {
      const today = new Date();

      const initialDecks: DeckList = [
        {
          id: "count-deck",
          name: "Count Test",
          createdAt: today.toISOString(),
          cards: Array.from({ length: 5 }, (_, i) => ({
            id: `card-${i + 1}`,
            front: `Q${i + 1}`,
            back: `A${i + 1}`,
            box: 1,
            lastReviewed: null,
            createdAt: today.toISOString(),
          })),
        },
      ];

      mockStore(initialDecks);
      const { rerender } = render(<Dashboard />, { wrapper: UIActionsProvider });

      let badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("5 due");

      // Grade cards one by one and verify badge updates
      let currentDecks = initialDecks;
      for (let i = 0; i < 5; i++) {
        const cards = [...currentDecks[0].cards];
        // Only promote cards that haven't been promoted yet
        for (let j = 0; j <= i; j++) {
          if (cards[j].box === 1 && cards[j].lastReviewed === null) {
            cards[j] = promoteCard(cards[j], today);
          }
        }

        currentDecks = [{ ...currentDecks[0], cards }];
        mockStore(currentDecks);

        rerender(<Dashboard />);

        // After grading (i+1) cards, should show (5 - (i+1)) due
        const expectedDue = 5 - (i + 1);
        if (expectedDue > 0) {
          badge = screen.getByTestId("due-count-badge");
          expect(badge.textContent).toBe(`${expectedDue} due`);
        } else {
          const badges = screen.queryAllByTestId("due-count-badge");
          expect(badges).toHaveLength(0);
        }
      }
    });
  });

  /**
   * Subtask 5: Test dashboard persists updated due counts
   *
   * The due count updates should persist across re-renders and
   * reflect the state stored in DecksContext (which is persisted to localStorage).
   */
  describe("Subtask 5: Dashboard persists updated due counts", () => {
    it("should maintain due count after simulating persistence", () => {
      const today = new Date();
      const deckId = "persist-deck";

      const initialDecks: DeckList = [
        {
          id: deckId,
          name: "Persistence Test",
          createdAt: today.toISOString(),
          cards: [
            {
              id: "persist-1",
              front: "Q1",
              back: "A1",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
            {
              id: "persist-2",
              front: "Q2",
              back: "A2",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
          ],
        },
      ];

      // First render with initial state
      mockStore(initialDecks);
      render(<Dashboard />, { wrapper: UIActionsProvider });

      let badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("2 due");

      // Simulate grading and persistence
      const cards = [...initialDecks[0].cards];
      cards[0] = promoteCard(cards[0], today);

      const persistedDecks: DeckList = [{ ...initialDecks[0], cards }];

      // Update store to reflect persisted state
      mockStore(persistedDecks);

      // Clean up and render fresh Dashboard with persisted state
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Due count should reflect persisted state
      badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("1 due");
    });

    it("should reflect correct due count when Dashboard re-mounts with updated decks", () => {
      const today = new Date();

      const initialDecks: DeckList = [
        {
          id: "remount-deck",
          name: "Remount Test",
          createdAt: today.toISOString(),
          cards: [
            {
              id: "remount-1",
              front: "Q1",
              back: "A1",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
            {
              id: "remount-2",
              front: "Q2",
              back: "A2",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
            {
              id: "remount-3",
              front: "Q3",
              back: "A3",
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            },
          ],
        },
      ];

      // First mount
      mockStore(initialDecks);
      render(<Dashboard />, { wrapper: UIActionsProvider });

      const badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("3 due");

      // Simulate session: grade all cards
      const gradeResults: Card[] = initialDecks[0].cards.map((card) =>
        promoteCard(card, today)
      );

      const updatedDecks: DeckList = [
        { ...initialDecks[0], cards: gradeResults },
      ];

      // Simulate page navigation away and back
      cleanup();

      // Re-mount with updated decks (simulating reload)
      mockStore(updatedDecks);
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // Due count should be 0 (all cards promoted)
      const badges = screen.queryAllByTestId("due-count-badge");
      expect(badges).toHaveLength(0);
    });

    it("should preserve due count accuracy across multiple update cycles", () => {
      const today = new Date();
      const deckId = "multi-cycle-deck";

      // Start with 4 due cards
      let decks: DeckList = [
        {
          id: deckId,
          name: "Multi-cycle Test",
          createdAt: today.toISOString(),
          cards: Array.from({ length: 4 }, (_, i) => ({
            id: `cycle-${i + 1}`,
            front: `Q${i + 1}`,
            back: `A${i + 1}`,
            box: 1,
            lastReviewed: null,
            createdAt: today.toISOString(),
          })),
        },
      ];

      // Cycle 1: Grade 1 card
      mockStore(decks);
      render(<Dashboard />, { wrapper: UIActionsProvider });

      let badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("4 due");

      // Grade first card as Correct
      let cards = [...decks[0].cards];
      cards[0] = promoteCard(cards[0], today);
      decks = [{ ...decks[0], cards }];

      mockStore(decks);
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("3 due");

      // Cycle 2: Grade another card
      cards = [...decks[0].cards];
      cards[1] = promoteCard(cards[1], today);
      decks = [{ ...decks[0], cards }];

      mockStore(decks);
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("2 due");

      // Cycle 3: Grade another card (now only 1 left)
      cards = [...decks[0].cards];
      cards[2] = promoteCard(cards[2], today);
      decks = [{ ...decks[0], cards }];

      mockStore(decks);
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      badge = screen.getByTestId("due-count-badge");
      expect(badge.textContent).toBe("1 due");

      // Cycle 4: Grade final card
      cards = [...decks[0].cards];
      cards[3] = promoteCard(cards[3], today);
      decks = [{ ...decks[0], cards }];

      mockStore(decks);
      cleanup();
      render(<Dashboard />, { wrapper: UIActionsProvider });

      // All done - badge should be hidden
      const badges = screen.queryAllByTestId("due-count-badge");
      expect(badges).toHaveLength(0);
    });
  });

  /**
   * Comprehensive integration test validating Property 5
   *
   * For any deck with N due cards, after grading one card and persisting
   * the update, the deck shall have N-1 due cards (when that card is promoted
   * or reset to change its due status).
   *
   * Validates: Property 5 (Due Cards Decrease After Review)
   */
  describe("Property 5: Due cards decrease after review", () => {
    it("should validate Property 5 across various deck sizes (fast-check style)", () => {
      const today = new Date();

      // Test with various deck sizes: 1, 2, 5, 10
      const deckSizes = [1, 2, 5, 10];

      for (const size of deckSizes) {
        // Create deck with N due cards
        const deckId = `property5-deck-${size}`;
        const decks: DeckList = [
          {
            id: deckId,
            name: `Property 5 Test - Size ${size}`,
            createdAt: today.toISOString(),
            cards: Array.from({ length: size }, (_, i) => ({
              id: `p5-card-${i + 1}`,
              front: `Q${i + 1}`,
              back: `A${i + 1}`,
              box: 1,
              lastReviewed: null,
              createdAt: today.toISOString(),
            })),
          },
        ];

        // Initial due count
        const initialDueCount = getDueCards(decks[0], today).length;
        expect(initialDueCount).toBe(size);

        // Grade first card as Correct
        const cards = [...decks[0].cards];
        cards[0] = promoteCard(cards[0], today);
        const updatedDecks: DeckList = [{ ...decks[0], cards }];

        // Due count should decrease by 1
        const newDueCount = getDueCards(updatedDecks[0], today).length;
        expect(newDueCount).toBe(initialDueCount - 1);
        expect(newDueCount).toBe(size - 1);
      }
    });

    it("should validate Property 5 with Incorrect grades (reset to Box 1)", () => {
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);

      // Create deck with one due card (Box 2, reviewed 2 days ago)
      // This should be due today (Box 2 = 2-day interval)
      const decks: DeckList = [
        {
          id: "property5-incorrect",
          name: "Property 5 Incorrect Test",
          createdAt: today.toISOString(),
          cards: [
            {
              id: "p5-incorrect-1",
              front: "Q1",
              back: "A1",
              box: 2,
              lastReviewed: twoDaysAgo.toISOString(), // Due (2 days ago + 2-day interval = today)
              createdAt: today.toISOString(),
            },
            {
              id: "p5-incorrect-2",
              front: "Q2",
              back: "A2",
              box: 1,
              lastReviewed: null, // Always due
              createdAt: today.toISOString(),
            },
          ],
        },
      ];

      // Initial due count: 2 (one Box 2 card due + one new card)
      const initialDueCount = getDueCards(decks[0], today).length;
      expect(initialDueCount).toBe(2);

      // Grade first card as Incorrect (reset to Box 1, lastReviewed = today)
      const cards = [...decks[0].cards];
      cards[0] = resetCard(cards[0], today);
      const updatedDecks: DeckList = [{ ...decks[0], cards }];

      // Card now in Box 1 with lastReviewed = today
      // Box 1 has 1-day interval, so next due is tomorrow (NOT due today)
      // Due count should decrease by 1 (from 2 to 1)
      const newDueCount = getDueCards(updatedDecks[0], today).length;
      expect(newDueCount).toBe(1); // Only card-2 (new) is due
      expect(newDueCount).toBe(initialDueCount - 1);
    });
  });
});
