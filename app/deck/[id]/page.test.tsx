import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import { act } from "@testing-library/react";
import DeckDetailPage from "./page";
import ContextualActionBar from "@/components/ContextualActionBar";
import { UIActionsProvider } from "@/contexts/UIActionsContext";
import { makeDeck, makeCards } from "@/mocks";

// Mock next/link to avoid Next.js routing during tests
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={href}>{children}</a>,
}));

// Drive the contextual action bar's route detection deterministically.
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/deck/deck-1"),
}));

import { usePathname } from "next/navigation";
const mockUsePathname = vi.mocked(usePathname);

// Mock the DecksContext to control the store state
const mockUseDecks = vi.fn();

vi.mock("@/contexts/DecksContext", () => ({
  useDecks: () => mockUseDecks(),
}));

afterEach(() => {
  cleanup();
  mockUseDecks.mockReset();
  mockUsePathname.mockReturnValue("/deck/deck-1");
});

/**
 * Renders the deck page together with the contextual action bar inside the
 * UIActions provider, mirroring the real app shell. The page registers its
 * deck actions and the bar renders them (deck name, Add card, Study).
 */
async function renderDeckPage(id: string) {
  mockUsePathname.mockReturnValue(`/deck/${id}`);
  const params = Promise.resolve({ id });
  await act(async () => {
    render(
      <UIActionsProvider>
        <ContextualActionBar />
        <DeckDetailPage params={params} />
      </UIActionsProvider>,
    );
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Unit tests for the deck detail page navigation and states.
 *
 * With the contextual action bar migration, the deck name, "Add card", and
 * "Study" live in the bar (not a page-body header). The page body renders only
 * the card grid or the empty state. Export and Back-to-Dashboard are no longer
 * part of the deck chrome (Back-to-Dashboard remains only on the not-found
 * error affordance).
 */
describe("DeckDetailPage", () => {
  it("renders LoadingState while store status is 'initial'", async () => {
    mockUseDecks.mockReturnValue({
      decks: [],
      status: "initial",
      error: null,
      deleteCard: vi.fn(),
    });

    await renderDeckPage("deck-1");

    const loadingRegion = screen.queryByRole("status");
    expect(loadingRegion).toBeInTheDocument();
    if (loadingRegion) {
      expect(loadingRegion).toHaveAttribute("aria-live", "polite");
      expect(within(loadingRegion).getByText(/loading/i)).toBeInTheDocument();
    }
  });

  it("renders ErrorState with Back-to-Dashboard link when deck is not found", async () => {
    mockUseDecks.mockReturnValue({
      decks: [],
      status: "ready",
      error: null,
      deleteCard: vi.fn(),
    });

    await renderDeckPage("nonexistent-deck");

    const alert = screen.queryByRole("alert");
    expect(alert).toBeInTheDocument();
    if (alert) {
      expect(within(alert).getByText(/deck not found/i)).toBeInTheDocument();
      expect(
        within(alert).getByText(/the deck was not found or has been deleted/i),
      ).toBeInTheDocument();

      const backLink = within(alert).queryByRole("link", {
        name: /back to dashboard/i,
      });
      expect(backLink).toBeInTheDocument();
      if (backLink) {
        expect(backLink).toHaveAttribute("href", "/");
      }
    }
  });

  it("shows the deck name and a 'Study' link to the review route in the action bar", async () => {
    const testDeck = makeDeck({
      id: "deck-1",
      name: "Test Deck",
      cards: makeCards(5),
    });

    mockUseDecks.mockReturnValue({
      decks: [testDeck],
      status: "ready",
      error: null,
      deleteCard: vi.fn(),
    });

    await renderDeckPage(testDeck.id);

    // Deck name renders in the action bar (level-1 heading).
    expect(
      screen.getByRole("heading", { level: 1, name: testDeck.name }),
    ).toBeInTheDocument();

    // "Study" replaces "Start review" and targets the review route.
    expect(screen.queryByText(/start review/i)).not.toBeInTheDocument();
    const studyLink = screen.getByRole("link", { name: /study/i });
    expect(studyLink).toHaveAttribute("href", `/deck/${testDeck.id}/review`);

    // No Export control and no in-body Back-to-Dashboard on the content phase.
    expect(
      screen.queryByRole("button", { name: /export/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /back to dashboard/i }),
    ).not.toBeInTheDocument();
  });

  it("renders empty state with an 'Add card' control when deck has no cards", async () => {
    const emptyDeck = makeDeck({
      id: "deck-1",
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

    await renderDeckPage(emptyDeck.id);

    // Empty-state heading and message.
    expect(
      screen.getByRole("heading", { name: /no cards yet/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/add your first card to start studying/i),
    ).toBeInTheDocument();

    // "Add card" is present (the action bar's + the empty-state button both use
    // this label; at least one is present and is keyboard-focusable).
    const addCardButtons = screen.getAllByRole("button", { name: /add card/i });
    expect(addCardButtons.length).toBeGreaterThanOrEqual(1);

    // Deck name renders via the action bar.
    expect(
      screen.getByRole("heading", { level: 1, name: emptyDeck.name }),
    ).toBeInTheDocument();

    // Description is dropped from the deck page; Export is gone.
    expect(screen.queryByText(emptyDeck.description!)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /export/i }),
    ).not.toBeInTheDocument();
  });

  it("renders deck cards when deck has cards and is ready", async () => {
    const deckWithCards = makeDeck({
      id: "deck-1",
      name: "Study Deck",
      cards: makeCards(3),
    });

    mockUseDecks.mockReturnValue({
      decks: [deckWithCards],
      status: "ready",
      error: null,
      deleteCard: vi.fn(),
    });

    await renderDeckPage(deckWithCards.id);

    // Deck name via the action bar.
    expect(
      screen.getByRole("heading", { level: 1, name: deckWithCards.name }),
    ).toBeInTheDocument();

    // "Add card" and "Study" are reachable from the bar.
    expect(
      screen.getByRole("button", { name: /add card/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /study/i })).toBeInTheDocument();

    // The card grid renders one list item per card.
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });
});
