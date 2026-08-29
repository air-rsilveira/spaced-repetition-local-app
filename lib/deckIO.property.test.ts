import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { serializeDeck, parseDeck } from "./deckIO";
import { deckSchema } from "@/types";
import type { Deck, Card } from "@/types";

/**
 * Generate a valid ISO 8601 timestamp string.
 */
function isoTimestampArb() {
  return fc.integer({ min: 1577836800000, max: 1893456000000 }).map((ms) => {
    const date = new Date(ms);
    // Ensure the date is valid
    if (isNaN(date.getTime())) {
      return "2024-01-01T00:00:00Z";
    }
    return date.toISOString();
  });
}

/**
 * Generate a valid Card object.
 */
function cardArb(): fc.Arbitrary<Card> {
  return fc
    .record({
      id: fc
        .string({ minLength: 1, maxLength: 36 })
        .filter((s) => s.trim().length > 0),
      front: fc.string({ minLength: 1, maxLength: 500 }),
      back: fc.string({ minLength: 1, maxLength: 500 }),
      box: fc.integer({ min: 1, max: 5 }),
      lastReviewed: fc.oneof(fc.constant(null), isoTimestampArb()),
      createdAt: isoTimestampArb(),
    })
    .map(
      (obj): Card => ({
        ...obj,
        front: obj.front.slice(0, 5000), // Ensure within bounds
        back: obj.back.slice(0, 5000),
      }),
    );
}

/**
 * Generate a valid Deck object that satisfies the deckSchema.
 */
function deckArb(): fc.Arbitrary<Deck> {
  return fc
    .record({
      id: fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => s.trim().length > 0),
      name: fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => s.trim().length > 0),
      description: fc.oneof(
        fc.constant(undefined),
        fc.string({ minLength: 0, maxLength: 500 }),
      ),
      cards: fc.array(cardArb(), { minLength: 0, maxLength: 100 }),
      createdAt: isoTimestampArb(),
    })
    .map((obj): Deck => {
      const result: Deck = {
        id: obj.id.trim().slice(0, 100),
        name: obj.name.trim().slice(0, 100),
        cards: obj.cards,
        createdAt: obj.createdAt,
      };
      if (obj.description !== undefined) {
        result.description = obj.description.slice(0, 500);
      }
      return result;
    })
    .filter((deck) => {
      // Validate deck satisfies schema
      const result = deckSchema.safeParse(deck);
      return result.success;
    });
}

describe("deckIO property-based tests", () => {
  it("round-trip: serialize then parse produces equivalent deck", () => {
    fc.assert(
      fc.property(deckArb(), (deck) => {
        const json = serializeDeck(deck);
        const parseResult = parseDeck(json);

        expect(parseResult.ok).toBe(true);
        if (parseResult.ok) {
          expect(parseResult.data).toEqual(deck);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("export produces valid JSON string", () => {
    fc.assert(
      fc.property(deckArb(), (deck) => {
        const json = serializeDeck(deck);

        // Should be a non-empty string
        expect(typeof json).toBe("string");
        expect(json.length).toBeGreaterThan(0);

        // Should be valid JSON
        expect(() => JSON.parse(json)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it("parse always returns a result (success or failure)", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = parseDeck(input);

        // Must always return a discriminated union
        expect(result).toHaveProperty("ok");
        if (result.ok === true) {
          expect(result).toHaveProperty("data");
          expect(result.data).toBeDefined();
        } else {
          expect(result).toHaveProperty("error");
          expect(result.error).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });

  it("serialize is deterministic for the same deck", () => {
    fc.assert(
      fc.property(deckArb(), (deck) => {
        const json1 = serializeDeck(deck);
        const json2 = serializeDeck(deck);

        expect(json1).toBe(json2);
      }),
      { numRuns: 100 },
    );
  });

  it("multiple round-trips preserve equivalence", () => {
    fc.assert(
      fc.property(deckArb(), (initialDeck) => {
        let current = initialDeck;

        // Perform 3 round-trips
        for (let i = 0; i < 3; i++) {
          const json = serializeDeck(current);
          const parseResult = parseDeck(json);

          expect(parseResult.ok).toBe(true);
          if (parseResult.ok) {
            current = parseResult.data;
          }
        }

        // After 3 round-trips, should be equivalent to original
        expect(current).toEqual(initialDeck);
      }),
      { numRuns: 50 },
    );
  });

  it("deck fields are never lost during serialization", () => {
    fc.assert(
      fc.property(deckArb(), (deck) => {
        const json = serializeDeck(deck);

        // Serialize to JSON object to inspect
        const obj = JSON.parse(json);

        // All required fields should be present
        expect(obj).toHaveProperty("id");
        expect(obj).toHaveProperty("name");
        expect(obj).toHaveProperty("cards");
        expect(obj).toHaveProperty("createdAt");

        // Card fields should be present
        if (obj.cards.length > 0) {
          const card = obj.cards[0];
          expect(card).toHaveProperty("id");
          expect(card).toHaveProperty("front");
          expect(card).toHaveProperty("back");
          expect(card).toHaveProperty("box");
          expect(card).toHaveProperty("lastReviewed");
          expect(card).toHaveProperty("createdAt");
        }
      }),
      { numRuns: 100 },
    );
  });

  it("card order is preserved through round-trip", () => {
    fc.assert(
      fc.property(deckArb(), (deck) => {
        if (deck.cards.length === 0) {
          return; // Skip if no cards
        }

        const json = serializeDeck(deck);
        const parseResult = parseDeck(json);

        expect(parseResult.ok).toBe(true);
        if (parseResult.ok) {
          // Cards should be in same order
          expect(parseResult.data.cards.length).toBe(deck.cards.length);
          for (let i = 0; i < deck.cards.length; i++) {
            expect(parseResult.data.cards[i].id).toBe(deck.cards[i].id);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("invalid JSON is always rejected", () => {
    fc.assert(
      fc.property(
        fc
          .string()
          .filter((s) => {
            // Filter out strings that happen to be valid JSON
            try {
              JSON.parse(s);
              return false; // Exclude valid JSON
            } catch {
              return true; // Include invalid JSON
            }
          }),
        (invalidJson) => {
          const result = parseDeck(invalidJson);

          // Should be rejected
          expect(result.ok).toBe(false);
          if (!result.ok) {
            // Should have a meaningful error message
            expect(typeof result.error).toBe("string");
            expect(result.error.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it("parsed deck always satisfies the schema", () => {
    fc.assert(
      fc.property(deckArb(), (deck) => {
        const json = serializeDeck(deck);
        const parseResult = parseDeck(json);

        expect(parseResult.ok).toBe(true);
        if (parseResult.ok) {
          // Verify it satisfies the schema
          const schemaResult = deckSchema.safeParse(parseResult.data);
          expect(schemaResult.success).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
