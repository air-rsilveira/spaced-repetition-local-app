import type { Card } from "@/types";
import CardItemActions from "@/components/CardItemActions";

export interface CardItemProps {
  card: Card;
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
}

/**
 * CardItem — renders one card's summary in a CardList.
 *
 * Server Component: it takes card props and derives everything from that shape,
 * so it can be rendered on the server or with mock data in tests without
 * touching the store.
 *
 * Displays the card's `front` text and a `Box_Badge` showing the Leitner box
 * with an accessible text label (never color alone). The per-card edit/delete
 * buttons live in a `"use client"` leaf (`CardItemActions`) so `CardItem`
 * itself stays prop-driven.
 *
 * Requirements: 1.4, 3.1, 4.1
 */
export default function CardItem({
  card,
  onEdit,
  onDelete,
}: CardItemProps) {
  return (
    <article className="rounded-lg border border-aws-gray-200 bg-aws-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <p className="break-words text-base font-medium text-aws-gray-900">
            {card.front}
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-aws-gray-100 px-3 py-1">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-aws-blue text-xs font-semibold text-aws-white">
              {card.box}
            </span>
            <span className="text-sm font-medium text-aws-gray-900">
              Box {card.box}
            </span>
          </div>
        </div>
        <CardItemActions
          card={card}
          cardFront={card.front}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}
