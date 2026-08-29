"use client";

import { use, useEffect, useState } from "react";
import { useDecks } from "@/contexts/DecksContext";
import { useUIActions } from "@/contexts/UIActionsContext";
import { resolvePhase } from "@/contexts/useStorePhase";
import type { Card } from "@/types";
import CardList from "@/components/CardList";
import CardForm from "@/components/CardForm";
import DeleteConfirm from "@/components/DeleteConfirm";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import BackLink from "@/components/BackLink";

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
 * The deck name, "Add card", and "Study" controls live in the contextual action
 * bar (registered via `useUIActions`), not in a page-body header.
 *
 * Render logic uses `resolvePhase` to gate on a single status:
 * - `loading`: store is still hydrating; render `LoadingState`
 * - `error`: deck not found; render `ErrorState` with "Back to Dashboard" action
 * - `empty`: deck found but has no cards; render empty state with "Add card" control
 * - `content`: render the deck's cards via `CardList` (deck name and actions
 *   are provided by the contextual action bar)
 *
 * The overlay renders `CardForm` for create/edit and `DeleteConfirm` for
 * delete. Confirming delete calls `deleteCard(deck.id, card.id)` then closes
 * the overlay, while cancelling leaves the list unchanged.
 *
 * Requirements: 1.3, 1.4, 1.9, 2.2, 2.5, 3.2, 4.2
 */
export default function DeckDetailPage({
  params,
}: {
  params: Promise<DeckDetailPageParams>;
}) {
  const { id } = use(params);
  const { decks, status, deleteCard } = useDecks();
  const { registerDeckActions, clear } = useUIActions();
  const [overlay, setOverlay] = useState<CardOverlay>({ kind: "closed" });

  // Resolve the deck up front so the contextual action bar registration and the
  // render branches below share a single source of truth.
  const deck = decks.find((d) => d.id === id);

  const openCreate = () => setOverlay({ kind: "create" });
  const openEdit = (card: Card) => setOverlay({ kind: "edit", card });
  const openDelete = (card: Card) => setOverlay({ kind: "delete", card });
  const closeOverlay = () => setOverlay({ kind: "closed" });

  // Register the deck-page actions for the contextual action bar: the deck
  // name (static text), "Add card" (opens the create-card overlay this page
  // owns), and "Study" (navigates to the review route). Clear when the deck is
  // absent (loading / not found) and on unmount / route change.
  const deckName = deck?.name;
  useEffect(() => {
    if (deckName === undefined) {
      clear();
      return;
    }
    registerDeckActions({
      deckId: id,
      deckName,
      onAddCard: () => setOverlay({ kind: "create" }),
      onStudyHref: `/deck/${id}/review`,
    });
    return () => clear();
  }, [id, deckName, registerDeckActions, clear]);

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

  // Compute phase inputs (deck resolved above).
  const hasError = status === "ready" && !deck;
  const isEmpty = !!(status === "ready" && deck && deck.cards.length === 0);
  const phase = resolvePhase({ status, hasError, isEmpty });

  // Render based on phase (Requirements 2.2, 4.2)
  if (phase === "loading") {
    return <LoadingState label="Loading deck…" />;
  }

  if (phase === "error") {
    return (
      <ErrorState
        title="Deck not found"
        message="The deck was not found or has been deleted."
        action={<BackLink href="/">Back to Dashboard</BackLink>}
      />
    );
  }

  if (phase === "empty") {
    return (
      <>
        {/* Deck name + Add card / Study live in the contextual action bar. */}
        <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-lg border border-aws-gray-200 bg-aws-white p-8 text-center shadow-sm sm:p-12">
            <h2 className="text-2xl font-semibold tracking-tight text-aws-gray-900">
              No cards yet
            </h2>
            <p className="mt-3 text-base leading-7 text-aws-gray-600">
              Add your first card to start studying this deck.
            </p>
            <div className="mt-8">
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center justify-center rounded-md bg-aws-orange px-6 text-sm font-semibold text-aws-squid-ink transition-colors hover:bg-aws-orange-dark"
              >
                Add card
              </button>
            </div>
          </div>
        </section>

        {renderOverlay()}
      </>
    );
  }

  // phase === "content"
  return (
    <>
      {/* Deck name + Add card / Study live in the contextual action bar. */}
      <CardList cards={deck!.cards} onEdit={openEdit} onDelete={openDelete} />

      {renderOverlay()}
    </>
  );
}