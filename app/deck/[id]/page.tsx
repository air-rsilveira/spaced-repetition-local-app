"use client";

import { use, useState } from "react";
import { useDecks } from "@/contexts/DecksContext";
import type { Card } from "@/types";
import CardList from "@/components/CardList";
import CardForm from "@/components/CardForm";
import DeleteConfirm from "@/components/DeleteConfirm";

type CardOverlay =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; card: Card }
  | { kind: "delete"; card: Card };

interface DeckDetailPageParams {
  id: string;
}

/**
 * DeckDetailPage — the detail view for a single deck.
 *
 * Client Component: it consumes the decks store via `useDecks()` and reads the
 * route id via `use(params)`. It holds the local `CardOverlay` UI state for
 * managing create/edit/delete flows and renders the deck's cards via `CardList`.
 *
 * Render logic:
 * - `status !== "ready"`: render a loading state (the store is still hydrating).
 * - `status === "ready"` and a deck matches the route id: render the deck name,
 *   an "Add card" button, and the `CardList`.
 * - `status === "ready"` and no deck matches: render a deck-missing state.
 *
 * The overlay renders `CardForm` for create/edit and `DeleteConfirm` for
 * delete. Confirming delete calls `deleteCard(deck.id, card.id)` then closes
 * the overlay, while cancelling leaves the list unchanged.
 *
 * Requirements: 1.1, 1.2, 1.5, 1.6, 2.1, 3.1, 4.1, 4.2, 4.3, 4.7
 */
export default function DeckDetailPage({
  params,
}: {
  params: Promise<DeckDetailPageParams>;
}) {
  const { id } = use(params);
  const { decks, status, deleteCard } = useDecks();
  const [overlay, setOverlay] = useState<CardOverlay>({ kind: "closed" });

  const openCreate = () => setOverlay({ kind: "create" });
  const openEdit = (card: Card) => setOverlay({ kind: "edit", card });
  const openDelete = (card: Card) => setOverlay({ kind: "delete", card });
  const closeOverlay = () => setOverlay({ kind: "closed" });

  const handleConfirmDelete = () => {
    if (overlay.kind !== "delete" || !deck) {
      return;
    }
    deleteCard(deck.id, overlay.card.id);
    closeOverlay();
  };

  const renderOverlay = () => {
    if (!deck) {
      return null;
    }

    switch (overlay.kind) {
      case "create":
        return (
          <CardForm mode={{ kind: "create" }} deckId={deck.id} onClose={closeOverlay} />
        );
      case "edit":
        return (
          <CardForm
            mode={{ kind: "edit", card: overlay.card }}
            deckId={deck.id}
            onClose={closeOverlay}
          />
        );
      case "delete":
        return (
          <DeleteConfirm
            deck={deck}
            onConfirm={handleConfirmDelete}
            onCancel={closeOverlay}
          />
        );
      case "closed":
      default:
        return null;
    }
  };

  // Loading state — store is still hydrating (Requirement 1.5)
  if (status !== "ready") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-aws-gray-900">Loading deck...</h2>
        </div>
      </section>
    );
  }

  const deck = decks.find((d) => d.id === id);

  // Deck not found — render missing state (Requirement 1.6)
  if (!deck) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div
          role="alert"
          className="w-full max-w-md rounded-lg border border-aws-error bg-aws-white p-8 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-aws-gray-900">
            Deck not found
          </h2>
          <p className="mt-2 text-sm text-aws-gray-600">
            The deck you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
        </div>
      </section>
    );
  }

  // Deck found — render with CardList (Requirements 1.2, 1.3)
  return (
    <>
      <section className="border-b border-aws-gray-200 bg-aws-squid-ink px-6 py-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-aws-white sm:text-3xl">
              {deck.name}
            </h1>
            {deck.description && (
              <p className="mt-1 text-sm text-aws-gray-200">{deck.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center rounded-md bg-aws-orange px-6 text-sm font-semibold text-aws-squid-ink transition-colors hover:bg-aws-orange-dark sm:flex-shrink-0"
          >
            Add card
          </button>
        </div>
      </section>

      <CardList
        cards={deck.cards}
        onEdit={openEdit}
        onDelete={openDelete}
      />

      {renderOverlay()}
    </>
  );
}
