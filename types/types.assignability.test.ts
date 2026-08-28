import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import {
  cardSchema,
  deckSchema,
  deckListSchema,
  type Card,
  type Deck,
  type DeckList,
} from "@/types";

/**
 * Type-level assertions that the `@/types` barrel exports resolve and that the
 * `z.infer`red `Deck`/`Card`/`DeckList` types stay assignable to the shapes the
 * Zod schemas produce — the single-source-of-truth guarantee.
 *
 * Validates: Requirements 7.3, 7.4
 */
describe("@/types exports and z.infer assignability", () => {
  it("resolves the schema and type exports via the @/types alias", () => {
    // If the `@/*` alias failed to resolve, these imports would be undefined
    // and the module would never have loaded — asserting keeps it a runtime
    // check too, not just a compile-time one.
    expect(deckSchema).toBeDefined();
    expect(cardSchema).toBeDefined();
    expect(deckListSchema).toBeDefined();
  });

  it("keeps the inferred Deck type equal to the schema output", () => {
    // z.infer of the schema must match the exported Deck type in both
    // directions, proving the runtime schema and compile-time type share one
    // source of truth.
    expectTypeOf<z.infer<typeof deckSchema>>().toEqualTypeOf<Deck>();
    expectTypeOf<z.infer<typeof cardSchema>>().toEqualTypeOf<Card>();
    expectTypeOf<z.infer<typeof deckListSchema>>().toEqualTypeOf<DeckList>();
  });

  it("accepts a literal Deck value as assignable to the inferred type", () => {
    // A hand-written literal must be assignable to Deck (id, name, cards
    // required; description optional), and must survive schema validation.
    const deck: Deck = {
      id: "deck-1",
      name: "Capitals",
      cards: [
        {
          id: "card-1",
          front: "What is the capital of France?",
          back: "Paris",
          box: 1,
          lastReviewed: null,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    expectTypeOf(deck).toMatchTypeOf<Deck>();

    const parsed = deckSchema.parse(deck);
    expect(parsed).toEqual(deck);
  });

  it("treats a parsed deck list as a DeckList", () => {
    const list: DeckList = deckListSchema.parse([
      {
        id: "deck-1",
        name: "Capitals",
        description: "Geo",
        cards: [],
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ]);

    expectTypeOf(list).toEqualTypeOf<DeckList>();
    expect(list).toHaveLength(1);
  });
});
