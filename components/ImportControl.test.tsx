import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Deck, DeckList } from "@/types";

// These must be at top level for vi.mock to work
vi.mock("@/lib/deckIO");
vi.mock("@/contexts/DecksContext");

// Import after mocking
import ImportControl from "./ImportControl";
import * as deckIO from "@/lib/deckIO";
import { useDecks } from "@/contexts/DecksContext";

describe("ImportControl", () => {
  const mockDecks: DeckList = [
    {
      id: "existing-deck",
      name: "Existing Deck",
      description: "Already in store",
      cards: [],
      createdAt: "2024-01-01T00:00:00Z",
    },
  ];

  const mockImportedDeck: Deck = {
    id: "new-deck-1",
    name: "Imported Deck",
    description: "A newly imported deck",
    cards: [
      {
        id: "card-1",
        front: "Question",
        back: "Answer",
        box: 1,
        lastReviewed: null,
        createdAt: "2024-01-01T00:00:00Z",
      },
    ],
    createdAt: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const mockAddDeck = vi.fn().mockReturnValue({
      ok: true,
      deck: mockImportedDeck,
    });

    const mockReplaceDeck = vi.fn().mockReturnValue({
      ok: true,
      deck: mockImportedDeck,
    });

    // Setup mock for useDecks
    (useDecks as ReturnType<typeof vi.fn>).mockReturnValue({
      decks: mockDecks,
      addDeck: mockAddDeck,
      replaceDeck: mockReplaceDeck,
    });

    // Setup mock for parseDeck
    (deckIO.parseDeck as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      data: mockImportedDeck,
    });
  });

  it("renders a file input with correct accept attribute", () => {
    render(<ImportControl />);
    const input = screen.getByLabelText(/import a deck from json/i) as HTMLInputElement;
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", ".json");
  });

  it("renders a label for the file input", () => {
    render(<ImportControl />);
    const label = screen.getByText(/import a deck from json/i);
    expect(label).toBeInTheDocument();
  });

  it("does not display error message initially", () => {
    render(<ImportControl />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("parses file on selection", async () => {
    const user = userEvent.setup();
    render(<ImportControl />);

    const input = screen.getByLabelText(/import a deck from json/i);
    const file = new File([JSON.stringify(mockImportedDeck)], "deck.json", {
      type: "application/json",
    });

    await user.upload(input, file);

    await waitFor(() => {
      expect(deckIO.parseDeck).toHaveBeenCalled();
    });
  });

  it("adds deck to store on successful import", async () => {
    const user = userEvent.setup();
    render(<ImportControl />);

    const input = screen.getByLabelText(/import a deck from json/i);
    const file = new File([JSON.stringify(mockImportedDeck)], "deck.json", {
      type: "application/json",
    });

    await user.upload(input, file);

    const { addDeck } = useDecks();
    await waitFor(() => {
      expect(addDeck).toHaveBeenCalledWith({
        id: mockImportedDeck.id,
        name: mockImportedDeck.name,
        description: mockImportedDeck.description,
        cards: mockImportedDeck.cards,
      });
    });
  });

  it("successfully imports valid deck and displays no error", async () => {
    const user = userEvent.setup();
    render(<ImportControl />);

    const input = screen.getByLabelText(/import a deck from json/i);
    const file = new File([JSON.stringify(mockImportedDeck)], "deck.json", {
      type: "application/json",
    });

    await user.upload(input, file);

    await waitFor(() => {
      // Verify no error is displayed
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("displays error on invalid JSON", async () => {
    const user = userEvent.setup();

    (deckIO.parseDeck as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: false,
      error: "The file is not valid JSON.",
    });

    render(<ImportControl />);

    const input = screen.getByLabelText(/import a deck from json/i);
    const file = new File(["invalid json"], "deck.json", {
      type: "application/json",
    });

    await user.upload(input, file);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("The file is not valid JSON.");
    // Verify the store was not modified
    const { addDeck } = useDecks();
    expect(addDeck).not.toHaveBeenCalled();
  });

  it("resets file input after error", async () => {
    const user = userEvent.setup();

    (deckIO.parseDeck as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: false,
      error: "Invalid file",
    });

    render(<ImportControl />);

    const input = screen.getByLabelText(/import a deck from json/i) as HTMLInputElement;
    const file = new File(["invalid"], "deck.json", {
      type: "application/json",
    });

    await user.upload(input, file);

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("shows duplicate modal when imported deck ID exists", async () => {
    const user = userEvent.setup();

    const duplicateDeck: Deck = {
      ...mockImportedDeck,
      id: "existing-deck",
    };

    (deckIO.parseDeck as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      data: duplicateDeck,
    });

    render(<ImportControl />);

    const input = screen.getByLabelText(/import a deck from json/i);
    const file = new File([JSON.stringify(duplicateDeck)], "deck.json", {
      type: "application/json",
    });

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });

  it("shows existing and imported deck names in duplicate modal", async () => {
    const user = userEvent.setup();

    const duplicateDeck: Deck = {
      ...mockImportedDeck,
      id: "existing-deck",
      name: "Duplicate Name",
    };

    (deckIO.parseDeck as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      data: duplicateDeck,
    });

    render(<ImportControl />);

    const input = screen.getByLabelText(/import a deck from json/i);
    const file = new File([JSON.stringify(duplicateDeck)], "deck.json", {
      type: "application/json",
    });

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Existing Deck")).toBeInTheDocument();
      expect(screen.getByText("Duplicate Name")).toBeInTheDocument();
    });
  });

  it("replaces deck when user chooses replace in modal", async () => {
    const user = userEvent.setup();

    const duplicateDeck: Deck = {
      ...mockImportedDeck,
      id: "existing-deck",
    };

    (deckIO.parseDeck as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      data: duplicateDeck,
    });

    render(<ImportControl />);

    const input = screen.getByLabelText(/import a deck from json/i);
    const file = new File([JSON.stringify(duplicateDeck)], "deck.json", {
      type: "application/json",
    });

    await user.upload(input, file);

    const replaceButton = await screen.findByRole("button", {
      name: /replace/i,
    });
    await user.click(replaceButton);

    const { replaceDeck } = useDecks();
    expect(replaceDeck).toHaveBeenCalledWith(duplicateDeck);
  });

  it("imports as new with generated ID when user chooses new ID", async () => {
    const user = userEvent.setup();

    const duplicateDeck: Deck = {
      ...mockImportedDeck,
      id: "existing-deck",
    };

    (deckIO.parseDeck as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      data: duplicateDeck,
    });

    render(<ImportControl />);

    const input = screen.getByLabelText(/import a deck from json/i);
    const file = new File([JSON.stringify(duplicateDeck)], "deck.json", {
      type: "application/json",
    });

    await user.upload(input, file);

    const importAsNewButton = await screen.findByRole("button", {
      name: /import as new/i,
    });
    await user.click(importAsNewButton);

    const { addDeck: mockAddDeck } = useDecks();
    expect(mockAddDeck).toHaveBeenCalled();
    const callArgs = (mockAddDeck as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.name).toBe(duplicateDeck.name);
    expect(callArgs.id).toContain("existing-deck-import");
    expect(callArgs.id).not.toBe("existing-deck");
  });

  it("closes modal on cancel", async () => {
    const user = userEvent.setup();

    const duplicateDeck: Deck = {
      ...mockImportedDeck,
      id: "existing-deck",
    };

    (deckIO.parseDeck as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      data: duplicateDeck,
    });

    render(<ImportControl />);

    const input = screen.getByLabelText(/import a deck from json/i);
    const file = new File([JSON.stringify(duplicateDeck)], "deck.json", {
      type: "application/json",
    });

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: /^cancel$/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText(/already exists/i)).not.toBeInTheDocument();
    });
  });
});
