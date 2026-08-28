/**
 * Deck fixtures and factory for development and tests.
 *
 * Covers the shapes the Dashboard and store need to exercise:
 * an empty list, a small 1-3 deck list, decks with and without a
 * description, and a deck with zero cards. `makeDeck` is a small factory
 * for building decks in unit and property tests.
 *
 * Import via the `@/mocks` barrel: `import { mockDeckList, makeDeck } from "@/mocks";`
 */
import type { Card, Deck, DeckList } from "@/types";

/**
 * Build `count` placeholder cards with stable, non-empty ids.
 */
export function makeCards(count: number, idPrefix = "card"): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${idPrefix}-${i + 1}`,
  }));
}

/**
 * Factory for building a `Deck` in tests. All fields have sensible
 * defaults so callers override only what a given test cares about.
 *
 * `description` is included only when explicitly provided so the factory
 * can produce both described and description-less decks (Requirements 5.3, 5.4).
 */
export interface MakeDeckOverrides {
  id?: string;
  name?: string;
  description?: string;
  cards?: Card[];
  cardCount?: number;
}

export function makeDeck(overrides: MakeDeckOverrides = {}): Deck {
  const { id, name, description, cards, cardCount } = overrides;

  const deck: Deck = {
    id: id ?? "deck-1",
    name: name ?? "Sample Deck",
    cards: cards ?? makeCards(cardCount ?? 0),
  };

  if (description !== undefined) {
    deck.description = description;
  }

  return deck;
}

/** An empty deck list — drives the Dashboard empty state. */
export const emptyDeckList: DeckList = [];

/** A deck that carries a non-empty description (Requirement 5.3). */
export const deckWithDescription: Deck = makeDeck({
  id: "deck-with-description",
  name: "Spanish Vocabulary",
  description: "Core A1 vocabulary for everyday conversation.",
  cards: makeCards(12, "spanish"),
});

/** A deck with no description at all (Requirement 5.4). */
export const deckWithoutDescription: Deck = makeDeck({
  id: "deck-without-description",
  name: "Capital Cities",
  cards: makeCards(8, "capitals"),
});

/** A deck that contains zero cards — card count renders as 0 (Requirement 5.5). */
export const deckWithZeroCards: Deck = makeDeck({
  id: "deck-zero-cards",
  name: "Empty Deck",
  description: "A brand-new deck with nothing in it yet.",
  cards: [],
});

/**
 * A small deck list of 1-3 decks for Dashboard listing tests. It mixes
 * described and description-less decks and a zero-card deck so a single
 * fixture exercises Requirements 5.3, 5.4, and 5.5.
 */
export const mockDeckList: DeckList = [
  deckWithDescription,
  deckWithoutDescription,
  deckWithZeroCards,
];

/** A single-deck list, for the lower bound of the 1-3 listing range. */
export const singleDeckList: DeckList = [deckWithDescription];
