import type { Deck } from "@/types";

interface DeckCardProps {
  deck: Deck;
}

/**
 * Renders a single deck's summary on the Dashboard.
 *
 * Server Component: it takes a `deck` prop and derives everything it needs
 * from that shape, so it can be rendered on the server or with a mock deck
 * in tests without touching the store.
 */
export default function DeckCard({ deck }: DeckCardProps) {
  const description = deck.description?.trim();
  const hasDescription = description !== undefined && description.length > 0;

  return (
    <article className="rounded-lg border border-aws-gray-200 bg-aws-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-aws-gray-900">{deck.name}</h3>
      {hasDescription && (
        <p className="mt-1 text-sm text-aws-gray-600">{deck.description}</p>
      )}
      <p className="mt-2 text-sm text-aws-gray-600">
        {deck.cards.length} {deck.cards.length === 1 ? "card" : "cards"}
      </p>
    </article>
  );
}
