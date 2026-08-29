import { describe, it, expect } from "vitest";
import { serializeDeck, parseDeck } from "./deckIO";
import type { Deck } from "@/types";

describe("deckIO", () => {
  const mockDeck: Deck = {
    id: "test-deck-1",
    name: "Test Deck",
    description: "A test deck for verification",
    cards: [
      {
        id: "card-1",
        front: "What is 2 + 2?",
        back: "4",
        box: 1,
        lastReviewed: null,
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "card-2",
        front: "What is the capital of France?",
        back: "Paris",
        box: 2,
        lastReviewed: "2024-01-15T12:30:00Z",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ],
    createdAt: "2024-01-01T00:00:00Z",
  };

  describe("serializeDeck", () => {
    it("serializes a deck to a JSON string", () => {
      const result = serializeDeck(mockDeck);
      expect(typeof result).toBe("string");
      expect(result).toContain('"id"');
      expect(result).toContain('"test-deck-1"');
    });

    it("includes all deck fields in the serialized output", () => {
      const result = serializeDeck(mockDeck);
      expect(result).toContain('"name"');
      expect(result).toContain('"Test Deck"');
      expect(result).toContain('"description"');
      expect(result).toContain('"cards"');
      expect(result).toContain('"createdAt"');
    });

    it("includes all card fields in the serialized output", () => {
      const result = serializeDeck(mockDeck);
      expect(result).toContain('"front"');
      expect(result).toContain('"back"');
      expect(result).toContain('"box"');
      expect(result).toContain('"lastReviewed"');
    });

    it("produces human-readable JSON with proper indentation", () => {
      const result = serializeDeck(mockDeck);
      const lines = result.split("\n");
      // Should have multiple lines due to indentation
      expect(lines.length).toBeGreaterThan(1);
      // Should have indentation (spaces at start of some lines)
      expect(lines.some((line) => line.startsWith("  "))).toBe(true);
    });

    it("serializes a deck without description", () => {
      const deckWithoutDescription: Deck = {
        ...mockDeck,
        description: undefined,
      };
      const result = serializeDeck(deckWithoutDescription);
      expect(result).toContain('"id"');
      expect(result).toContain('"name"');
    });

    it("serializes an empty deck with no cards", () => {
      const emptyDeck: Deck = {
        id: "empty-deck",
        name: "Empty Deck",
        cards: [],
        createdAt: "2024-01-01T00:00:00Z",
      };
      const result = serializeDeck(emptyDeck);
      expect(result).toContain('"cards"');
      expect(result).toContain("[]");
    });

    it("preserves special characters and unicode", () => {
      const deckWithSpecialChars: Deck = {
        ...mockDeck,
        name: "Deck with émoji 🚀",
        description: "Contains <html> & special chars",
        cards: [
          {
            id: "card-1",
            front: 'Question with "quotes"',
            back: "Answer with 'apostrophes'",
            box: 1,
            lastReviewed: null,
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
      };
      const result = serializeDeck(deckWithSpecialChars);
      expect(result).toContain("émoji 🚀");
      expect(result).toContain("<html>");
    });
  });

  describe("parseDeck", () => {
    it("parses valid JSON and returns success with data", () => {
      const json = serializeDeck(mockDeck);
      const result = parseDeck(json);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(mockDeck);
      }
    });

    it("returns failure on invalid JSON", () => {
      const result = parseDeck("{ invalid json }");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not valid JSON");
      }
    });

    it("returns failure on empty string", () => {
      const result = parseDeck("");
      expect(result.ok).toBe(false);
    });

    it("returns failure on non-JSON string", () => {
      const result = parseDeck("not json at all");
      expect(result.ok).toBe(false);
    });

    it("returns failure when JSON is valid but missing required deck fields", () => {
      const incompleteJson = JSON.stringify({
        id: "test",
        name: "Test",
        // Missing cards and createdAt
      });
      const result = parseDeck(incompleteJson);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("expected");
      }
    });

    it("returns failure when JSON has invalid field values", () => {
      const invalidJson = JSON.stringify({
        id: "test-deck",
        name: "Test",
        description: "A test",
        cards: [
          {
            id: "card-1",
            front: "Question",
            back: "Answer",
            box: "not-a-number", // Invalid: should be number
            lastReviewed: null,
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        createdAt: "2024-01-01T00:00:00Z",
      });
      const result = parseDeck(invalidJson);
      expect(result.ok).toBe(false);
    });

    it("returns failure when deck id exceeds max length", () => {
      const longIdJson = JSON.stringify({
        id: "a".repeat(101), // Max is 100
        name: "Test",
        cards: [],
        createdAt: "2024-01-01T00:00:00Z",
      });
      const result = parseDeck(longIdJson);
      expect(result.ok).toBe(false);
    });

    it("returns failure when deck name is empty", () => {
      const emptyNameJson = JSON.stringify({
        id: "test-deck",
        name: "", // Empty, must be at least 1 char
        cards: [],
        createdAt: "2024-01-01T00:00:00Z",
      });
      const result = parseDeck(emptyNameJson);
      expect(result.ok).toBe(false);
    });

    it("returns failure when createdAt is not a valid ISO timestamp", () => {
      const invalidTimestampJson = JSON.stringify({
        id: "test-deck",
        name: "Test",
        cards: [],
        createdAt: "not-a-timestamp",
      });
      const result = parseDeck(invalidTimestampJson);
      expect(result.ok).toBe(false);
    });

    it("succeeds when description is omitted (optional field)", () => {
      const noDescriptionJson = JSON.stringify({
        id: "test-deck",
        name: "Test",
        cards: [],
        createdAt: "2024-01-01T00:00:00Z",
      });
      const result = parseDeck(noDescriptionJson);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.description).toBeUndefined();
      }
    });

    it("accepts null for lastReviewed (nullable field)", () => {
      const json = JSON.stringify({
        id: "test-deck",
        name: "Test",
        cards: [
          {
            id: "card-1",
            front: "Q",
            back: "A",
            box: 1,
            lastReviewed: null,
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        createdAt: "2024-01-01T00:00:00Z",
      });
      const result = parseDeck(json);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.cards[0].lastReviewed).toBeNull();
      }
    });

    it("rejects when cards array exceeds max length (1000 cards)", () => {
      const manyCards = Array.from({ length: 1001 }, (_, i) => ({
        id: `card-${i}`,
        front: "Q",
        back: "A",
        box: 1,
        lastReviewed: null,
        createdAt: "2024-01-01T00:00:00Z",
      }));
      const tooManyCardsJson = JSON.stringify({
        id: "test-deck",
        name: "Test",
        cards: manyCards,
        createdAt: "2024-01-01T00:00:00Z",
      });
      const result = parseDeck(tooManyCardsJson);
      expect(result.ok).toBe(false);
    });

    it("returns error message for parse errors", () => {
      const result = parseDeck("invalid");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(typeof result.error).toBe("string");
        expect(result.error.length).toBeGreaterThan(0);
      }
    });

    it("returns error message for validation errors", () => {
      const invalidJson = JSON.stringify({ id: "", name: "Test" });
      const result = parseDeck(invalidJson);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(typeof result.error).toBe("string");
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Round-trip integrity", () => {
    it("serializes and parses a deck to produce an equivalent result", () => {
      const serialized = serializeDeck(mockDeck);
      const parsed = parseDeck(serialized);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.data).toEqual(mockDeck);
      }
    });

    it("round-trip produces identical JSON for multiple iterations", () => {
      let current = mockDeck;
      for (let i = 0; i < 5; i++) {
        const serialized = serializeDeck(current);
        const parsed = parseDeck(serialized);
        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
          current = parsed.data;
        }
      }
      // After 5 round-trips, should be equivalent to original
      expect(current).toEqual(mockDeck);
    });

    it("round-trip with a deck containing special characters", () => {
      const specialDeck: Deck = {
        id: "special-deck",
        name: "Deck with émoji 🎯 and special chars",
        description:
          'Contains "quotes" and \'apostrophes\' and <tags> & ampersands',
        cards: [
          {
            id: "card-1",
            front: 'Question: What is "life"?',
            back: "Answer: Life is... \n complicated",
            box: 3,
            lastReviewed: "2024-06-15T10:30:00Z",
            createdAt: "2024-01-01T00:00:00Z",
          },
        ],
        createdAt: "2024-01-01T00:00:00Z",
      };
      const serialized = serializeDeck(specialDeck);
      const parsed = parseDeck(serialized);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.data).toEqual(specialDeck);
      }
    });

    it("round-trip with an empty deck", () => {
      const emptyDeck: Deck = {
        id: "empty",
        name: "Empty",
        cards: [],
        createdAt: "2024-01-01T00:00:00Z",
      };
      const serialized = serializeDeck(emptyDeck);
      const parsed = parseDeck(serialized);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.data).toEqual(emptyDeck);
      }
    });

    it("produces identical JSON on consecutive serializations", () => {
      const first = serializeDeck(mockDeck);
      const second = serializeDeck(mockDeck);
      expect(first).toBe(second);
    });
  });
});
