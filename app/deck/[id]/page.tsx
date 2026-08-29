"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useDecks } from "@/contexts/DecksContext";
import { resolvePhase } from "@/contexts/useStorePhase";
import type { Card } from "@/types";
import CardItem from "@/components/CardItem";
import CardForm from "@/components/CardForm";
import DeleteConfirm from "@/components/DeleteConfirm";
import ExportControl from "@/components/ExportControl";
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
 * managing create/edit/delete flows and renders the decks cards via `CardList`.
 *
 * Render logic uses `resolvePhase` to gate on a single status:
 * - `loading`: store is still hydrating; render `LoadingState`
 * - `error`: deck not found; render `ErrorState` with "Back to Dashboard" action
 * - `empty`: deck found but has no cards; render empty state with "Add card" control
 * - `content`: render the deck name, navigation controls (Back to Dashboard, Start review),
 *   and `CardList`
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

  // Resolve the deck and compute phase inputs
  const deck = decks.find((d) => d.id === id);
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
        <section className="border-b border-aws-gray-200 bg-aws-squid-ink px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-aws-white sm:text-3xl">
                  {deck!.name}
                </h1>
                {deck!.description && (
                  <p className="mt-1 text-sm text-aws-gray-200">{deck!.description}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 sm:flex-shrink-0">
                <BackLink href="/">Back to Dashboard</BackLink>
                <ExportControl deck={deck!} />
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-lg border border-aws-gray-200 bg-aws-white p-8 shadow-sm sm:p-12">
            <h2 className="text-2xl font-semibold tracking-tight text-aws-gray-900">
              No cards yet
            </h2>
            <p className="mt-3 text-base leading-7 text-aws-gray-600">
              Add cards to this deck to start studying.
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
      <section className="border-b border-aws-gray-200 bg-aws-squid-ink px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-aws-white sm:text-3xl">
                {deck!.name}
              </h1>
              {deck!.description && (
                <p className="mt-1 text-sm text-aws-gray-200">{deck!.description}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 sm:flex-shrink-0">
              <BackLink href="/">Back to Dashboard</BackLink>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center justify-center rounded-md bg-aws-orange px-6 text-sm font-semibold text-aws-squid-ink transition-colors hover:bg-aws-orange-dark"
              >
                Add card
              </button>
              <Link href={`/deck/${id}/review`}>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-md bg-aws-orange px-6 text-sm font-semibold text-aws-squid-ink transition-colors hover:bg-aws-orange-dark"
                >
                  Start review
                </button>
              </Link>
              <ExportControl deck={deck!} />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deck!.cards.map((card) => (
              <li key={card.id} className="flex flex-col gap-3">
                <CardItem
                  card={card}
                  onEdit={() => openEdit(card)}
                  onDelete={() => openDelete(card)}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {renderOverlay()}
    </>
  );
}