import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { DecksContextValue } from "@/contexts/DecksContext";

// Mock the decks store so the Dashboard reads a deterministic empty list.
// `useDecks` returns 0 decks in a non-error "ready" state, which drives the
// Dashboard down its empty-state branch (Requirements 6.1, 8.7).
const useDecksMock = vi.fn<() => DecksContextValue>();

vi.mock("@/contexts/DecksContext", () => ({
  useDecks: () => useDecksMock(),
}));

import Dashboard from "@/components/Dashboard";

describe("Dashboard empty state", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Feature: walking-skeleton, Requirement 8.7:
  // With 0 decks, the Dashboard renders the EmptyState and no DeckCard.
  it("renders the EmptyState and no DeckCard when the store has 0 decks", () => {
    useDecksMock.mockReturnValue({
      decks: [],
      status: "ready",
      error: null,
      addDeck: vi.fn(),
      updateDeck: vi.fn(),
      deleteDeck: vi.fn(),
      addCard: vi.fn(),
      updateCard: vi.fn(),
      deleteCard: vi.fn(),
      gradeCardCorrect: vi.fn(),
      gradeCardIncorrect: vi.fn(),
    });

    const { container } = render(<Dashboard />);

    // The EmptyState is present: its "no decks" heading and both entry-point
    // buttons render (create-deck / import-deck).
    expect(
      screen.getByRole("heading", { name: /no decks yet/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create deck/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /import deck/i }),
    ).toBeInTheDocument();

    // No DeckCard renders. DeckCard uses <article> with an <h3> deck name, so
    // the absence of both confirms no deck was listed.
    expect(container.querySelector("article")).toBeNull();
    expect(container.querySelector("h3")).toBeNull();
  });
});
