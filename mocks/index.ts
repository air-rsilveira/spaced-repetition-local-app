/**
 * Mock data and fixtures for development and testing.
 *
 * Export fixtures from this barrel so they can be imported via the
 * `@/mocks` path alias.
 */

export {
  makeCards,
  makeDeck,
  emptyDeckList,
  singleDeckList,
  mockDeckList,
  deckWithDescription,
  deckWithoutDescription,
  deckWithZeroCards,
} from "./decks";
export type { MakeDeckOverrides } from "./decks";
