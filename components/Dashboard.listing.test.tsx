import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import Dashboard from "@/components/Dashboard";
import { singleDeckList, mockDeckList } from "@/mocks";
import type { DeckList } from "@/types";

// Mock the decks store so the Dashboard renders from a fixed, in-memory deck
// list without touching localStorage or the real provider. `useDecks` is the
// only thing the Dashboard consumes, so returning a static ready store is
// enough to exercise the listing branch (Requirement 8.6, concrete instance of
// Property 10).
const mockUseDecks = vi.fn();

vi.mock("@/contexts/DecksContext", () => ({
  useDecks: () => mockUseDecks(),
}));

function mockStore(decks: DeckList) {
  mockUseDecks.mockReturnValue({
    decks,
    status: "ready",
    error: null,
    addDeck: vi.fn(),
  });
}

afterEach(() => {
  cleanup();
  mockUseDecks.mockReset();
});

describe("Dashboard deck listing (Requirement 8.6)", () => {
  it("renders every deck in a 1-3 deck mock store, with the rendered count equal to the mock count", () => {
    // mockDeckList is a 1-3 deck fixture (mixed described / description-less /
    // zero-card decks) — the upper bound of the required 1-3 range.
    expect(mockDeckList.length).toBeGreaterThanOrEqual(1);
    expect(mockDeckList.length).toBeLessThanOrEqual(3);

    mockStore(mockDeckList);
    render(<Dashboard />);

    // Every deck renders: each DeckCard shows the deck name in an <h3>.
    for (const deck of mockDeckList) {
      expect(
        screen.getByRole("heading", { level: 3, name: deck.name }),
      ).toBeInTheDocument();
    }

    // The count of rendered DeckCards equals the mock deck count. Each deck is
    // wrapped in its own <li>, so the number of list items is the render count.
    const list = screen.getByRole("list");
    const renderedCards = within(list).getAllByRole("listitem");
    expect(renderedCards).toHaveLength(mockDeckList.length);

    // The empty state is not shown when the store has decks.
    expect(
      screen.queryByRole("heading", { name: /no decks/i }),
    ).not.toBeInTheDocument();
  });

  it("renders exactly one deck for a single-deck mock store (lower bound of the 1-3 range)", () => {
    expect(singleDeckList).toHaveLength(1);

    mockStore(singleDeckList);
    render(<Dashboard />);

    const [deck] = singleDeckList;
    expect(
      screen.getByRole("heading", { level: 3, name: deck.name }),
    ).toBeInTheDocument();

    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(
      singleDeckList.length,
    );
  });
});
