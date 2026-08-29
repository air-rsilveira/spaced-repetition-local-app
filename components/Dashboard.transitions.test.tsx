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
 * Build a `useDecks` return value. Card actions are no-op stubs because the
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
    updateDeck: vi.fn(),
    replaceDeck: vi.fn(),
    deleteDeck: vi.fn(),
    addCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    gradeCardCorrect: vi.fn(),
    gradeCardIncorrect: vi.fn(),
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

  // Requirement 2.1: during "initial" status, LoadingState renders instead of
  // the deck listing or empty state.
  it("renders LoadingState during initial phase instead of empty listing", () => {
    mockedUseDecks.mockReturnValue(
      makeStore(emptyDeckList, "initial"),
    );
    render(<Dashboard />);

    // Loading indication is shown (via aria-live status region).
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Neither empty state nor listing renders during loading phase.
    expect(
      screen.queryByRole("heading", { name: /no decks yet/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^your decks$/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  // Requirement 2.1, 2.4: loading phase transitions to ready with populated
  // list (content phase).
  it("transitions from LoadingState to deck listing when status becomes ready with decks", () => {
    mockedUseDecks.mockReturnValue(
      makeStore(emptyDeckList, "initial"),
    );
    const { rerender } = render(<Dashboard />);

    // During initial, LoadingState renders.
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^your decks$/i }),
    ).not.toBeInTheDocument();

    // Transition to ready with populated decks.
    mockedUseDecks.mockReturnValue(makeStore(mockDeckList, "ready"));
    rerender(<Dashboard />);

    // LoadingState is gone; listing is shown.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^your decks$/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(mockDeckList.length);
  });

  // Requirement 2.1, 2.4: loading phase transitions to ready with empty list
  // (empty phase).
  it("transitions from LoadingState to EmptyState when status becomes ready with no decks", () => {
    mockedUseDecks.mockReturnValue(
      makeStore(emptyDeckList, "initial"),
    );
    const { rerender } = render(<Dashboard />);

    // During initial, LoadingState renders.
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /no decks yet/i }),
    ).not.toBeInTheDocument();

    // Transition to ready with empty list.
    mockedUseDecks.mockReturnValue(makeStore(emptyDeckList, "ready"));
    rerender(<Dashboard />);

    // LoadingState is gone; empty state is shown.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /no decks yet/i }),
    ).toBeInTheDocument();
  });

  // Requirement 6.5: transitioning 1+ -> 0 decks swaps the deck listing for the
  // empty state (when status is ready).
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

  // Requirement 3.5, 4.1: error, empty, and content phases are mutually exclusive.
  // When status is "error", neither listing nor empty state renders.
  it("ensures error, empty, and content phases are mutually exclusive", () => {
    const error: DecksError = {
      code: "invalid-data",
      message: "Stored deck data is invalid and could not be loaded.",
    };

    // Error phase: status is "error", with decks present in state to prove they
    // are retained but not rendered.
    mockedUseDecks.mockReturnValue(makeStore(mockDeckList, "error", error));
    const { rerender } = render(<Dashboard />);

    // Error state renders (via role="alert").
    expect(screen.getByRole("alert")).toBeInTheDocument();
    // Neither listing nor empty state.
    expect(
      screen.queryByRole("heading", { name: /^your decks$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /no decks yet/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);

    // Transition from error to loading (initial status): only loading state.
    mockedUseDecks.mockReturnValue(makeStore(emptyDeckList, "initial"));
    rerender(<Dashboard />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /no decks yet/i }),
    ).not.toBeInTheDocument();

    // Transition from loading to empty (ready + empty list): only empty state.
    mockedUseDecks.mockReturnValue(makeStore(emptyDeckList, "ready"));
    rerender(<Dashboard />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /no decks yet/i }),
    ).toBeInTheDocument();

    // Transition to content (ready + decks): only listing.
    mockedUseDecks.mockReturnValue(makeStore(mockDeckList, "ready"));
    rerender(<Dashboard />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^your decks$/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(mockDeckList.length);
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
  // Requirement 6.2: the empty state presents a create-deck entry point.
  it("shows the create entry point when the Dashboard renders with 0 decks", () => {
    mockedUseDecks.mockReturnValue(makeStore(emptyDeckList, "ready"));
    render(<Dashboard />);

    expect(
      screen.getByRole("button", { name: /create deck/i }),
    ).toBeInTheDocument();
  });

  // Requirement 6.2: the entry point is present when EmptyState is rendered
  // directly (it does not depend on the store).
  it("shows the create entry point when EmptyState is rendered directly", () => {
    cleanup();
    render(<EmptyState onCreate={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /create deck/i }),
    ).toBeInTheDocument();
  });
});
