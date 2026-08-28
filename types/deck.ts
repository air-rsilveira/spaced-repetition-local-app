import { z } from "zod";

/**
 * Single source of truth for the deck/card domain shape.
 *
 * The Zod schemas below are the one definition; the `Card`, `Deck`, and
 * `DeckList` types are `z.infer`red from them so the runtime validation
 * schema and the compile-time types can never drift apart.
 */

export const cardSchema = z.object({
  id: z.string().min(1),
});

export const deckSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  cards: z.array(cardSchema).max(1000),
});

export const deckListSchema = z.array(deckSchema).max(10_000);

export type Card = z.infer<typeof cardSchema>;
export type Deck = z.infer<typeof deckSchema>;
export type DeckList = z.infer<typeof deckListSchema>;
