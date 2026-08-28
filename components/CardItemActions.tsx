"use client";

import type { Card } from "@/types";

interface CardItemActionsProps {
  card: Card;
  cardFront: string;
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
}

/**
 * CardItemActions — per-card action controls (Edit / Delete) for a single card.
 *
 * Client Component: it wires two buttons to callbacks that open the deck
 * detail page's edit/delete overlays. Keeping the interactivity in this tiny
 * leaf lets `CardItem` stay a prop-driven, server-renderable component.
 *
 * The visible labels ("Edit" / "Delete") are paired with an `aria-label` that
 * includes the card front so screen-reader users can tell which card each
 * control targets when several cards are on screen.
 *
 * The delete button is styled with `bg-aws-error` and `border-aws-error` to
 * indicate destructive action, with a visible text label (never color alone).
 *
 * Requirements: 1.4, 3.1, 4.1
 */
export default function CardItemActions({
  card,
  cardFront,
  onEdit,
  onDelete,
}: CardItemActionsProps) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => onEdit(card)}
        aria-label={`Edit card: ${cardFront}`}
        className="rounded-md border border-aws-blue px-3 py-1.5 text-sm font-medium text-aws-blue transition-colors hover:bg-aws-blue hover:text-aws-white sm:px-4"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onDelete(card)}
        aria-label={`Delete card: ${cardFront}`}
        className="rounded-md border border-aws-error px-3 py-1.5 text-sm font-medium text-aws-error transition-colors hover:bg-aws-error hover:text-aws-white sm:px-4"
      >
        Delete
      </button>
    </div>
  );
}
