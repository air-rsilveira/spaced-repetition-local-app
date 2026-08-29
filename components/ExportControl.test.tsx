import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExportControl from "./ExportControl";
import type { Deck } from "@/types";
import * as deckIO from "@/lib/deckIO";

// Mock the deckIO module
vi.mock("@/lib/deckIO", () => ({
  serializeDeck: vi.fn(),
}));

describe("ExportControl", () => {
  const mockDeck: Deck = {
    id: "test-deck-1",
    name: "Test Deck",
    description: "A test deck",
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

    // Mock serializeDeck
    (deckIO.serializeDeck as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify(mockDeck)
    );
  });

  it("renders an export button", () => {
    render(<ExportControl deck={mockDeck} />);
    const button = screen.getByRole("button", { name: /export/i });
    expect(button).toBeInTheDocument();
  });

  it("displays the deck name in the aria-label", () => {
    render(<ExportControl deck={mockDeck} />);
    const button = screen.getByRole("button", {
      name: /export deck: test deck/i,
    });
    expect(button).toBeInTheDocument();
  });

  it("serializes the deck to JSON on click", async () => {
    const user = userEvent.setup();
    render(<ExportControl deck={mockDeck} />);
    const button = screen.getByRole("button", { name: /export/i });

    await user.click(button);

    expect(deckIO.serializeDeck).toHaveBeenCalledWith(mockDeck);
    expect(deckIO.serializeDeck).toHaveBeenCalledTimes(1);
  });

  it("calls onExportStart callback if provided", async () => {
    const user = userEvent.setup();
    const onExportStart = vi.fn();

    render(<ExportControl deck={mockDeck} onExportStart={onExportStart} />);
    const button = screen.getByRole("button", { name: /export/i });

    await user.click(button);

    expect(onExportStart).toHaveBeenCalledTimes(1);
  });

  it("calls onExportEnd callback if provided", async () => {
    const user = userEvent.setup();
    const onExportEnd = vi.fn();

    render(<ExportControl deck={mockDeck} onExportEnd={onExportEnd} />);
    const button = screen.getByRole("button", { name: /export/i });

    await user.click(button);

    await waitFor(() => {
      expect(onExportEnd).toHaveBeenCalledTimes(1);
    });
  });

  it("does not display error message initially", () => {
    render(<ExportControl deck={mockDeck} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("displays error message on serialization failure", async () => {
    const user = userEvent.setup();
    const errorMessage = "Serialization failed";

    (deckIO.serializeDeck as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        throw new Error(errorMessage);
      }
    );

    render(<ExportControl deck={mockDeck} />);
    const button = screen.getByRole("button", { name: /export/i });

    await user.click(button);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(errorMessage);
  });

  it("clears error message when button is clicked again after an error", async () => {
    const user = userEvent.setup();

    // First click: error
    (deckIO.serializeDeck as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => {
        throw new Error("First error");
      }
    );

    render(<ExportControl deck={mockDeck} />);
    const button = screen.getByRole("button", { name: /export/i });

    await user.click(button);

    let alert: HTMLElement | null = screen.getByRole("alert");
    expect(alert).toHaveTextContent("First error");

    // Second click: success (mock is reset to normal)
    (deckIO.serializeDeck as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      JSON.stringify(mockDeck)
    );

    await user.click(button);

    await waitFor(() => {
      alert = screen.queryByRole("alert");
      expect(alert).not.toBeInTheDocument();
    });
  });

  it("handles error gracefully without throwing", async () => {
    const user = userEvent.setup();

    (deckIO.serializeDeck as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        throw new Error("Export failed");
      }
    );

    render(<ExportControl deck={mockDeck} />);
    const button = screen.getByRole("button", { name: /export/i });

    // Should not throw
    await expect(async () => {
      await user.click(button);
    }).not.toThrow();
  });

  it("re-enables button after export error", async () => {
    const user = userEvent.setup();

    (deckIO.serializeDeck as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        throw new Error("Export failed");
      }
    );

    render(<ExportControl deck={mockDeck} />);
    const button = screen.getByRole("button", { name: /export/i });

    await user.click(button);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it("exports a deck with special characters in name", async () => {
    const user = userEvent.setup();
    const specialDeck: Deck = {
      ...mockDeck,
      name: "Deck with émoji 🚀",
    };

    render(<ExportControl deck={specialDeck} />);
    const button = screen.getByRole("button", {
      name: /export deck: deck with émoji 🚀/i,
    });

    expect(button).toBeInTheDocument();

    await user.click(button);

    expect(deckIO.serializeDeck).toHaveBeenCalledWith(specialDeck);
  });
});
