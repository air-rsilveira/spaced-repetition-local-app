import type { Deck } from "@/types";

interface DeckCardProps {
  deck: Deck;
  dueCount: number;
}

/**
 * Renders a single deck's summary on the Dashboard.
 *
 * Server Component: it takes a `deck` prop and derives everything it needs
 * from that shape, so it can be rendered on the server or with a mock deck
 * in tests without touching the store.
 */
export default function DeckCard({ deck, dueCount }: DeckCardProps) {
  const description = deck.description?.trim();
  const hasDescription = description !== undefined && description.length > 0;
  const showDueBadge = dueCount > 0;

  return (
    <article className="rounded-lg border border-aws-gray-200 bg-aws-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-aws-gray-900">{deck.name}</h3>
      {hasDescription && (
        <p className="mt-1 text-sm text-aws-gray-600">{deck.description}</p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm text-aws-gray-600">
          {deck.cards.length} {deck.cards.length === 1 ? "card" : "cards"}
        </p>
        {showDueBadge && (
          <span
            className="inline-flex items-center rounded-full bg-aws-orange px-2.5 py-0.5 text-xs font-medium text-aws-squid-ink"
            data-testid="due-count-badge"
          >
            {dueCount} due
          </span>
        )}
      </div>
    </article>
  );
}
