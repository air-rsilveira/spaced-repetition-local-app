import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import Dashboard from "@/components/Dashboard";
import EmptyState from "@/components/EmptyState";
import { useDecks } from "@/contexts/DecksContext";
import type {
  DecksContextValue,
  DecksStatus,
  DecksError,
} from "@/contexts/DecksContext";
import type { DeckList } from "@/types";
import { emptyDeckList, mockDeckList, singleDeckList } from "@/mocks";

// Mock the decks store so `useDecks` returns controllable state. This keeps the
// Dashboard tests focused on its render branches (listing / empty / error)
// without standing up the real provider, localStorage, or hydration timing.
vi.mock("@/contexts/DecksContext", () => ({
  useDecks: vi.fn(),
}));

const mockedUseDecks = vi.mocked(useDecks);

/**
 * Build a `useDecks` return value. `addDeck` is a no-op stub because the
 * Dashboard only reads `{ decks, status, error }`.
 */
function makeStore(
  decks: DeckList,
  status: DecksStatus,
  error: DecksError | null = null,
): DecksContextValue {
  return {
    decks,
    status,
    error,
    addDeck: vi.fn(),
  };
}

beforeEach(() => {
  mockedUseDecks.mockReset();
});

describe("Dashboard state transitions and error indication", () => {
  // Requirement 6.4: transitioning 0 -> 1+ decks swaps the empty state for the
  // deck listing.
  it("replaces the empty state with the deck listing when decks go from 0 to 1+", () => {
    mockedUseDecks.mockReturnValue(makeStore(emptyDeckList, "ready"));
    const { rerender } = render(<Dashboard />);

    // Empty state is shown; no deck listing.
    expect(
      screen.getByRole("heading", { name: /no decks yet/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^your decks$/i }),
    ).not.toBeInTheDocument();

    // Store transitions to a populated list; re-render.
    mockedUseDecks.mockReturnValue(makeStore(mockDeckList, "ready"));
    rerender(<Dashboard />);

    // Listing is shown; empty state is gone.
    expect(
      screen.getByRole("heading", { name: /^your decks$/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /no decks yet/i }),
    ).not.toBeInTheDocument();
    // One DeckCard (article) per deck in the store.
    expect(screen.getAllByRole("article")).toHaveLength(mockDeckList.length);
  });

  // Requirement 6.5: transitioning 1+ -> 0 decks swaps the deck listing for the
  // empty state.
  it("replaces the deck listing with the empty state when decks go from 1+ to 0", () => {
    mockedUseDecks.mockReturnValue(makeStore(singleDeckList, "ready"));
    const { rerender } = render(<Dashboard />);

    // Listing is shown; empty state is not.
    expect(
      screen.getByRole("heading", { name: /^your decks$/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(singleDeckList.length);
    expect(
      screen.queryByRole("heading", { name: /no decks yet/i }),
    ).not.toBeInTheDocument();

    // Store transitions to empty; re-render.
    mockedUseDecks.mockReturnValue(makeStore(emptyDeckList, "ready"));
    rerender(<Dashboard />);

    // Empty state is shown; listing is gone.
    expect(
      screen.getByRole("heading", { name: /no decks yet/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^your decks$/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  // Requirement 6.6: an error status renders an error indication and neither
  // the deck listing nor the empty state, even if decks are present in state.
  it("renders an error indication and neither listing nor empty state when status is error", () => {
    const error: DecksError = {
      code: "invalid-data",
      message: "Stored deck data is invalid and could not be loaded.",
    };
    // Include decks in state to prove they are retained but NOT rendered while
    // the status is "error".
    mockedUseDecks.mockReturnValue(makeStore(mockDeckList, "error", error));
    render(<Dashboard />);

    // Error indication present via role="alert".
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Neither the deck listing nor the empty state renders.
    expect(
      screen.queryByRole("heading", { name: /^your decks$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /no decks yet/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});

describe("EmptyState entry points", () => {
  // Requirements 6.2, 6.3: the empty state presents both a create-deck and an
  // import-deck entry point.
  it("shows both create and import entry points when the Dashboard renders with 0 decks", () => {
    mockedUseDecks.mockReturnValue(makeStore(emptyDeckList, "ready"));
    render(<Dashboard />);

    expect(
      screen.getByRole("button", { name: /create deck/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /import deck/i }),
    ).toBeInTheDocument();
  });

  // Requirements 6.2, 6.3: the same entry points are present when EmptyState is
  // rendered directly (it does not depend on the store).
  it("shows both create and import entry points when EmptyState is rendered directly", () => {
    cleanup();
    render(<EmptyState />);

    expect(
      screen.getByRole("button", { name: /create deck/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /import deck/i }),
    ).toBeInTheDocument();
  });
});
