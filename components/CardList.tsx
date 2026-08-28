import type { Card } from "@/types";
import CardItem from "@/components/CardItem";

export interface CardListProps {
  cards: Card[];
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
}

/**
 * CardList — renders a deck's cards.
 *
 * Server Component: it takes a `cards` array and derives everything from that
 * shape. Maps each card to a `CardItem` and renders an empty-cards state when
 * the deck has no cards. Threads the edit/delete callbacks to each `CardItem`.
 *
 * Requirements: 1.3, 1.7
 */
export default function CardList({
  cards,
  onEdit,
  onDelete,
}: CardListProps) {
  if (cards.length === 0) {
    return (
      <section
        aria-labelledby="empty-cards-heading"
        className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
      >
        <div className="w-full max-w-md rounded-lg border border-aws-gray-200 bg-aws-white p-8 shadow-sm sm:p-12">
          <h2
            id="empty-cards-heading"
            className="text-2xl font-semibold tracking-tight text-aws-gray-900"
          >
            No cards yet
          </h2>
          <p className="mt-3 text-base leading-7 text-aws-gray-600">
            This deck is empty. Click &quot;Add card&quot; to create your first study card.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-8">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <li key={card.id} className="flex flex-col gap-3">
            <CardItem
              card={card}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
