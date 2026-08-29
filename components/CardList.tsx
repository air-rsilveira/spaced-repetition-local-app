import type { Card } from "@/types";
import CardItem from "@/components/CardItem";

export interface CardListProps {
  cards: Card[];
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
}

/**
 * CardList — renders a deck's cards as a responsive, centered grid.
 *
 * Server Component: it takes a `cards` array and maps each card to a
 * `CardItem`, threading the edit/delete callbacks. The empty-cards state is
 * owned by the deck page (which pairs the message with an "Add card" control),
 * so this component is only rendered when there is at least one card.
 *
 * Requirements: 1.3, 1.7
 */
export default function CardList({
  cards,
  onEdit,
  onDelete,
}: CardListProps) {
  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
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
      </div>
    </section>
  );
}
