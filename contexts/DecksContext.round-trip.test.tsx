import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";
import type { Card } from "@/types";

/**
 * Required round-trip example test for the Decks store (Requirement 8.5).
 *
 * Adds one deck through the store (which persists to localStorage via the
 * provider's persistence effect), then re-initializes a FRESH provider whose
 * mount effect hydrates from that same localStorage. Asserts the re-initialized
 * store contains exactly one deck matching the added deck's id and content.
 *
 * localStorage is intentionally NOT cleared between the two renders — that
 * persistence hand-off is the whole point of the round trip. The shared setup
 * clears localStorage in `beforeEach`, so both renders run against a clean
 * slate that only this test populates.
 *
 * Validates: Requirements 8.5
 */

function wrapper({ children }: { children: ReactNode }) {
  return <DecksProvider>{children}</DecksProvider>;
}

describe("contexts/DecksContext round-trip persistence", () => {
  it("re-hydrates exactly one deck matching the added deck's id and content", async () => {
    const cards: Card[] = [
      {
        id: "card-1",
        front: "Bonjour?",
        back: "Hello",
        box: 1,
        lastReviewed: null,
        createdAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "card-2",
        front: "Merci?",
        back: "Thank you",
        box: 1,
        lastReviewed: null,
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ];
    const input = {
      id: "deck-round-trip",
      name: "French Vocabulary",
      description: "Common phrases",
      cards,
    };

    // Provider #1: add one deck; the persistence effect writes to localStorage.
    const first = renderHook(() => useDecks(), { wrapper });

    await waitFor(() => {
      expect(first.result.current.status).toBe("ready");
    });

    act(() => {
      const res = first.result.current.addDeck(input);
      expect(res.ok).toBe(true);
    });

    // Wait for the persistence effect to flush the new deck to localStorage.
    await waitFor(() => {
      expect(first.result.current.decks).toHaveLength(1);
    });

    // Tear down provider #1. localStorage retains the persisted deck.
    first.unmount();

    // Provider #2: a fresh mount hydrates from localStorage (no clear between).
    const second = renderHook(() => useDecks(), { wrapper });

    await waitFor(() => {
      expect(second.result.current.status).toBe("ready");
      expect(second.result.current.decks).toHaveLength(1);
    });

    // Exactly one deck, matching the added deck's id and content.
    const [deck] = second.result.current.decks;
    expect(second.result.current.decks).toHaveLength(1);
    expect(deck.id).toBe(input.id);
    expect(deck.name).toBe(input.name);
    expect(deck.description).toBe(input.description);
    expect(deck.cards).toEqual(cards);

    second.unmount();
  });
});
