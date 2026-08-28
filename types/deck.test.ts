import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { deckSchema } from "@/types";
import { arbDeck, arbInvalidCreatedAt, arbInvalidId } from "@/test/arbitraries";

describe("deck schema validation round-trip", () => {
  // Feature: deck-crud, Property 6 - Deck schema validation round-trip (extended for createdAt and id bounds)
  // Validates: Requirements 6.1, 6.2, 6.3, 6.5, 6.6
  it("parses valid decks to an equal value and rejects constraint violations", () => {
    // Arbitrary producing values that violate at least one Deck constraint.
    const arbInvalidDeck = fc.oneof(
      // Empty id (violates id min 1) or overlong id >100 (violates id max 100).
      arbDeck.chain((deck) =>
        arbInvalidId.map((id) => ({ ...deck, id })),
      ),
      // Empty name (violates name min 1).
      arbDeck.map((deck) => ({ ...deck, name: "" })),
      // Name longer than 100 chars (violates name max 100).
      arbDeck.chain((deck) =>
        fc
          .string({ minLength: 101, maxLength: 200 })
          .map((name) => ({ ...deck, name })),
      ),
      // Description longer than 500 chars (violates description max 500).
      arbDeck.chain((deck) =>
        fc
          .string({ minLength: 501, maxLength: 600 })
          .map((description) => ({ ...deck, description })),
      ),
      // A card with an empty id (violates card id min 1).
      arbDeck.map((deck) => ({
        ...deck,
        cards: [...deck.cards, { id: "" }],
      })),
      // Empty, whitespace-only, or unparseable createdAt (violates the ISO
      // timestamp refinement / min length).
      arbDeck.chain((deck) =>
        arbInvalidCreatedAt.map((createdAt) => ({ ...deck, createdAt })),
      ),
      // A non-string createdAt (violates the string type entirely).
      arbDeck.map((deck) => ({ ...deck, createdAt: 12345 })),
    );

    fc.assert(
      fc.property(fc.oneof(arbDeck, arbInvalidDeck), (candidate) => {
        const result = deckSchema.safeParse(candidate);

        // Determine, independent of Zod, whether the candidate is valid so
        // this property covers both the success and failure paths.
        const description = (candidate as { description?: unknown }).description;
        const cards = (candidate as { cards: Array<{ id: unknown }> }).cards;
        const createdAt = (candidate as { createdAt?: unknown }).createdAt;
        const isValid =
          typeof candidate.id === "string" &&
          candidate.id.length >= 1 &&
          candidate.id.length <= 100 &&
          typeof candidate.name === "string" &&
          candidate.name.length >= 1 &&
          candidate.name.length <= 100 &&
          (description === undefined ||
            (typeof description === "string" && description.length <= 500)) &&
          Array.isArray(cards) &&
          cards.length <= 1000 &&
          cards.every(
            (card) => typeof card.id === "string" && card.id.length >= 1,
          ) &&
          typeof createdAt === "string" &&
          createdAt.length >= 1 &&
          createdAt.length <= 30 &&
          !Number.isNaN(Date.parse(createdAt));

        if (isValid) {
          // Valid values parse successfully to a value equal to the input.
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toEqual(candidate);
          }
        } else {
          // Constraint-violating values fail parsing.
          expect(result.success).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});
