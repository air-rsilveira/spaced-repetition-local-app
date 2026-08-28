"use client";

import type { Deck } from "@/types";

interface DeckCardActionsProps {
  deck: Deck;
  onEdit: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
}

/**
 * Per-card action controls (Edit / Delete) for a single deck.
 *
 * Client Component: it wires two buttons to callbacks that open the
 * Dashboard's edit/delete overlays. Keeping the interactivity in this tiny
 * leaf lets `DeckCard` stay a prop-driven, server-renderable component.
 *
 * The visible labels ("Edit" / "Delete") are paired with an `aria-label` that
 * includes the deck name so screen-reader users can tell which deck each
 * control targets when several cards are on screen.
 */
export default function DeckCardActions({
  deck,
  onEdit,
  onDelete,
}: DeckCardActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onEdit(deck)}
        aria-label={`Edit ${deck.name}`}
        className="rounded-md border border-aws-blue px-3 py-1.5 text-sm font-medium text-aws-blue transition-colors hover:bg-aws-blue hover:text-aws-white sm:px-4"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onDelete(deck)}
        aria-label={`Delete ${deck.name}`}
        className="rounded-md border border-aws-error px-3 py-1.5 text-sm font-medium text-aws-error transition-colors hover:bg-aws-error hover:text-aws-white sm:px-4"
      >
        Delete
      </button>
    </div>
  );
}
