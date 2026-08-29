import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import { act } from "@testing-library/react";
import DeckDetailPage from "./page";
import { makeDeck, makeCards } from "@/mocks";

// Mock next/link to avoid Next.js routing during tests
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={href}>{children}</a>,
}));

// Mock the DecksContext to control the store state
const mockUseDecks = vi.fn();

vi.mock("@/contexts/DecksContext", () => ({
  useDecks: () => mockUseDecks(),
}));

afterEach(() => {
  cleanup();
  mockUseDecks.mockReset();
});

/**
 * Unit tests for the deck detail page navigation and states.
 *
 * Tests verify that:
 * - Loading phase renders LoadingState while store status is "initial"
 * - Not-found state renders ErrorState with Back-to-Dashboard action
 * - "Start review" and "Back to Dashboard" links target correct hrefs
 * - Empty deck renders empty state with focusable add-card control
 *
 * Requirements: 1.3, 1.4, 1.9, 2.2, 3.2, 4.2
 */
describe("DeckDetailPage", () => {
  // Requirement 2.2: Loading phase while status is "initial"
  it("renders LoadingState while store status is 'initial'", async () => {
    mockUseDecks.mockReturnValue({
      decks: [],
      status: "initial",
      error: null,
      deleteCard: vi.fn(),
    });

    const params = Promise.resolve({ id: "deck-1" });
    await act(async () => {
      render(<DeckDetailPage params={params} />);
    });

    // Give it time to settle
    await new Promise((resolve) => setTimeout(resolve, 0));

    // LoadingState renders with role="status" and aria-live="polite"
    const loadingRegion = screen.queryByRole("status");
    expect(loadingRegion).toBeInTheDocument();
    if (loadingRegion) {
      expect(loadingRegion).toHaveAttribute("aria-live", "polite");
      expect(within(loadingRegion).getByText(/loading/i)).toBeInTheDocument();
    }
  });

  // Requirement 4.2: Not-found renders ErrorState with Back-to-Dashboard action
  it("renders ErrorState with Back-to-Dashboard link when deck is not found", async () => {
    mockUseDecks.mockReturnValue({
      decks: [],
      status: "ready",
      error: null,
      deleteCard: vi.fn(),
    });

    const params = Promise.resolve({ id: "nonexistent-deck" });
    await act(async () => {
      render(<DeckDetailPage params={params} />);
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // ErrorState renders with role="alert" for not-found condition
    const alert = screen.queryByRole("alert");
    expect(alert).toBeInTheDocument();
    if (alert) {
      expect(within(alert).getByText(/deck not found/i)).toBeInTheDocument();
      expect(
        within(alert).getByText(/the deck was not found or has been deleted/i),
      ).toBeInTheDocument();

      // ErrorState action contains Back-to-Dashboard link
      const backLink = within(alert).queryByRole("link", {
        name: /back to dashboard/i,
      });
      expect(backLink).toBeInTheDocument();
      if (backLink) {
        expect(backLink).toHaveAttribute("href", "/");
      }
    }
  });

  // Requirement 1.3, 1.4, 1.9: Navigation controls have correct hrefs
  it("renders 'Start review' link targeting /deck/[id]/review and 'Back to Dashboard' link targeting /", async () => {
    const testDeck = makeDeck({
      id: "deck-123",
      name: "Test Deck",
      cards: makeCards(5),
    });

    mockUseDecks.mockReturnValue({
      decks: [testDeck],
      status: "ready",
      error: null,
      deleteCard: vi.fn(),
    });

    const params = Promise.resolve({ id: testDeck.id });
    await act(async () => {
      render(<DeckDetailPage params={params} />);
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // "Back to Dashboard" link targets "/"
    const backLink = screen.queryAllByRole("link").find((link) =>
      link.textContent?.includes("Back to Dashboard"),
    );
    expect(backLink).toBeInTheDocument();
    if (backLink) {
      expect(backLink).toHaveAttribute("href", "/");
    }

    // "Start review" link targets /deck/[id]/review
    const startReviewLink = screen.queryAllByRole("link").find((link) =>
      link.textContent?.includes("Start review"),
    );
    expect(startReviewLink).toBeInTheDocument();
    if (startReviewLink) {
      expect(startReviewLink).toHaveAttribute("href", `/deck/${testDeck.id}/review`);
    }
  });

  // Requirement 3.2: Empty deck renders empty state with focusable add-card control
  it("renders empty state with focusable 'Add card' control when deck has no cards", async () => {
    const emptyDeck = makeDeck({
      id: "empty-deck",
      name: "Empty Deck",
      description: "A brand-new deck with no cards",
      cards: [],
    });

    mockUseDecks.mockReturnValue({
      decks: [emptyDeck],
      status: "ready",
      error: null,
      deleteCard: vi.fn(),
    });

    const params = Promise.resolve({ id: emptyDeck.id });
    await act(async () => {
      render(<DeckDetailPage params={params} />);
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Empty state heading is rendered
    const heading = screen.queryByRole("heading", { name: /no cards yet/i });
    expect(heading).toBeInTheDocument();

    // Empty state message explains what to do
    expect(
      screen.queryByText(/add cards to this deck to start studying/i),
    ).toBeInTheDocument();

    // "Add card" button is rendered and is keyboard-focusable
    const addCardButton = screen.queryByRole("button", { name: /add card/i });
    expect(addCardButton).toBeInTheDocument();
    if (addCardButton) {
      expect(addCardButton).toHaveAttribute("type", "button");
    }

    // Deck header still shows deck name and description
    expect(
      screen.queryByRole("heading", { level: 1, name: emptyDeck.name }),
    ).toBeInTheDocument();
    expect(screen.queryByText(emptyDeck.description!)).toBeInTheDocument();

    // Back-to-Dashboard is present in empty state
    const backLink = screen.queryAllByRole("link").find((link) =>
      link.textContent?.includes("Back to Dashboard"),
    );
    expect(backLink).toBeInTheDocument();
  });

  // Additional: Verify content phase renders correctly with cards
  it("renders deck content and cards when deck has cards and is ready", async () => {
    const deckWithCards = makeDeck({
      id: "deck-with-cards",
      name: "Study Deck",
      cards: makeCards(3),
    });

    mockUseDecks.mockReturnValue({
      decks: [deckWithCards],
      status: "ready",
      error: null,
      deleteCard: vi.fn(),
    });

    const params = Promise.resolve({ id: deckWithCards.id });
    await act(async () => {
      render(<DeckDetailPage params={params} />);
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Deck header renders with name
    expect(
      screen.queryByRole("heading", { level: 1, name: deckWithCards.name }),
    ).toBeInTheDocument();

    // Navigation controls are present
    const backLink = screen.queryAllByRole("link").find((link) =>
      link.textContent?.includes("Back to Dashboard"),
    );
    expect(backLink).toBeInTheDocument();

    const startReviewLink = screen.queryAllByRole("link").find((link) =>
      link.textContent?.includes("Start review"),
    );
    expect(startReviewLink).toBeInTheDocument();

    // "Add card" button is present in header
    const addCardButton = screen.queryByRole("button", { name: /add card/i });
    expect(addCardButton).toBeInTheDocument();
  });
});
