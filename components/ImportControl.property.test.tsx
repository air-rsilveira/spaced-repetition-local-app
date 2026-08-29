import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DeckList } from "@/types";

// These must be at top level for vi.mock to work
vi.mock("@/lib/deckIO");
vi.mock("@/contexts/DecksContext");

// Import after mocking
import ImportControl from "./ImportControl";
import * as deckIO from "@/lib/deckIO";
import { useDecks } from "@/contexts/DecksContext";
import { arbGarbageStorage } from "@/test/arbitraries";

describe("ImportControl – Property 4: Invalid import input is rejected without mutating the store", () => {
  /**
   * Property 4: Invalid import input is rejected without mutating the store
   *
   * For all unreadable/unparseable/structurally-invalid contents, `parseDeck`
   * returns not-ok, the flow surfaces an `ErrorState`, and the deck list is
   * unchanged.
   *
   * Validates: Requirements 4.5, 10.2
   */
  it("rejects invalid input and leaves deck list unchanged", async () => {
    fc.assert(
      fc.asyncProperty(arbGarbageStorage, async (garbageContent) => {
        vi.clearAllMocks();

        // Immutable copy of initial deck list
        const initialDeckList: DeckList = [
          {
            id: "deck-1",
            name: "Test Deck",
            description: "Test Description",
            cards: [],
            createdAt: "2024-01-01T00:00:00Z",
          },
        ];

        const capturedDeckList = initialDeckList;
        const mockAddDeck = vi.fn();
        const mockReplaceDeck = vi.fn();

        // Setup mock for useDecks
        vi.mocked(useDecks).mockReturnValue({
          status: "ready",
          error: null,
          decks: capturedDeckList,
          addDeck: mockAddDeck,
          replaceDeck: mockReplaceDeck,
          updateDeck: vi.fn(),
          deleteDeck: vi.fn(),
          addCard: vi.fn(),
          updateCard: vi.fn(),
          deleteCard: vi.fn(),
          gradeCardCorrect: vi.fn(),
          gradeCardIncorrect: vi.fn(),
        });

        // Make parseDeck return not-ok for garbage content
        vi.mocked(deckIO.parseDeck).mockReturnValue({
          ok: false,
          error: "Invalid deck format",
        });

        const { rerender } = render(<ImportControl />);

        const input = screen.getByLabelText(/import a deck from json/i);
        const file = new File([garbageContent], "garbage.json", {
          type: "application/json",
        });

        const user = userEvent.setup();
        await user.upload(input, file);

        // Wait for error state to appear
        await waitFor(() => {
          expect(screen.getByRole("alert")).toBeInTheDocument();
        });

        // Assert error is visible
        const alert = screen.getByRole("alert");
        expect(alert).toHaveTextContent("Invalid deck format");

        // Assert that neither addDeck nor replaceDeck was called
        expect(mockAddDeck).not.toHaveBeenCalled();
        expect(mockReplaceDeck).not.toHaveBeenCalled();

        // Assert that the deck list passed to useDecks is still the original
        rerender(<ImportControl />);
        const mockUseDecks = vi.mocked(useDecks);
        expect(mockUseDecks().decks).toEqual(initialDeckList);
      }),
      { numRuns: 100 },
    );
  });
});
