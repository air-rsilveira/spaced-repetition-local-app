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

/**
 * ISO 8601 timestamp: a non-empty string of 1–30 characters that parses as a
 * real date. Recorded when a deck is created and preserved across edits.
 */
const isoTimestamp = z
  .string()
  .min(1)
  .max(30)
  .refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "createdAt must be a valid ISO 8601 timestamp",
  });

export const deckSchema = z.object({
  // Identifier valid for both an export filename and a route param.
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  cards: z.array(cardSchema).max(1000),
  createdAt: isoTimestamp,
});

export const deckListSchema = z.array(deckSchema).max(10_000);

/**
 * Validates only the user-editable form fields (create + edit). The form-input
 * type is `z.infer`red from this schema so the Deck_Form and its validation can
 * never drift apart.
 */
export const deckFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name exceeds 100 characters"),
  description: z
    .string()
    .max(500, "Description exceeds 500 characters")
    .optional(),
});

export type Card = z.infer<typeof cardSchema>;
export type Deck = z.infer<typeof deckSchema>;
export type DeckList = z.infer<typeof deckListSchema>;
export type DeckFormInput = z.infer<typeof deckFormSchema>;
