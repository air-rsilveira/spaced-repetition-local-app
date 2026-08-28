/**
 * Shared TypeScript types, interfaces, and enums for the app.
 *
 * Export cross-cutting types from this barrel so features can import them
 * via the `@/types` path alias.
 */

export type { Card, Deck, DeckList, DeckFormInput, CardFormInput } from "./deck";
export {
  cardSchema,
  deckSchema,
  deckListSchema,
  deckFormSchema,
  cardFormSchema,
} from "./deck";
