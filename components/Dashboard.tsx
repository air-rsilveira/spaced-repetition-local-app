"use client";

import { useState } from "react";
import Link from "next/link";

import { useDecks } from "@/contexts/DecksContext";
import DeckCard from "@/components/DeckCard";
import DeckCardActions from "@/components/DeckCardActions";
import DeckForm from "@/components/DeckForm";
import DeleteConfirm from "@/components/DeleteConfirm";
import EmptyState from "@/components/EmptyState";
import type { Deck } from "@/types";

/**
 * Which overlay (if any) is currently open, and — for edit/delete — the deck it
 * targets. Lifting this state to the Dashboard keeps `DeckCard` free of overlay
 * concerns and lets the header button, the empty-state "Create deck" button,
 * and each card's controls open the same form/dialog.
 */
type DashboardOverlay =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; deck: Deck }
  | { kind: "delete"; deck: Deck };

/**
 * Dashboard — the home view that lists the user's decks and owns the
 * create/edit/delete overlay state.
 *
 * Client Component: it consumes the decks store via `useDecks()` and holds the
 * local `DashboardOverlay` UI state. Rendering is driven by store state, so
 * transitions between the empty state and the listing happen automatically on
 * the next React render when the store updates.
 *
 * Render logic:
 * - `status === "error"`: render an error indication and neither the listing
 *   nor the empty state; any previously loaded decks stay in the store.
 * - `decks.length === 0`: render the `EmptyState` in place of the listing,
 *   wired to open the create form (Requirement 1.1).
 * - otherwise: render exactly one `DeckCard` per deck, in store order, each
 *   paired with `DeckCardActions` to open the edit/delete overlays
 *   (Requirements 1.6, 2.6, 3.4).
 *
 * The overlay renders `DeckForm` for create/edit and `DeleteConfirm` for
 * delete; confirming delete calls `deleteDeck(deck.id)` then closes, while
 * cancelling leaves the list unchanged (Requirements 1.1, 2.1, 3.1, 3.7).
 */
export default function Dashboard() {
  const { decks, status, error, deleteDeck } = useDecks();
  const [overlay, setOverlay] = useState<DashboardOverlay>({ kind: "closed" });

  const openCreate = () => setOverlay({ kind: "create" });
  const openEdit = (deck: Deck) => setOverlay({ kind: "edit", deck });
  const openDelete = (deck: Deck) => setOverlay({ kind: "delete", deck });
  const closeOverlay = () => setOverlay({ kind: "closed" });

  const handleConfirmDelete = () => {
    if (overlay.kind !== "delete") {
      return;
    }
    deleteDeck(overlay.deck.id);
    closeOverlay();
  };

  const renderOverlay = () => {
    switch (overlay.kind) {
      case "create":
        return <DeckForm mode={{ kind: "create" }} onClose={closeOverlay} />;
      case "edit":
        return (
          <DeckForm
            mode={{ kind: "edit", deck: overlay.deck }}
            onClose={closeOverlay}
          />
        );
      case "delete":
        return (
          <DeleteConfirm
            deck={overlay.deck}
            onConfirm={handleConfirmDelete}
            onCancel={closeOverlay}
          />
        );
      case "closed":
      default:
        return null;
    }
  };

  if (status === "error") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div
          role="alert"
          className="w-full max-w-md rounded-lg border border-aws-error bg-aws-white p-8 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-aws-gray-900">
            Couldn&apos;t load your decks
          </h2>
          <p className="mt-2 text-sm text-aws-gray-600">
            {error?.message ??
              "Something went wrong while loading your decks. Please try again."}
          </p>
        </div>
      </section>
    );
  }

  if (decks.length === 0) {
    return (
      <>
        <EmptyState onCreate={openCreate} />
        {renderOverlay()}
      </>
    );
  }

  return (
    <>
      <section className="px-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-aws-gray-900">
            Your decks
          </h2>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center rounded-md bg-aws-orange px-6 text-sm font-semibold text-aws-squid-ink transition-colors hover:bg-aws-orange-dark"
          >
            New deck
          </button>
        </div>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <li key={deck.id} className="flex flex-col gap-3">
              <Link href={`/deck/${deck.id}`}>
                <DeckCard deck={deck} />
              </Link>
              <DeckCardActions
                deck={deck}
                onEdit={openEdit}
                onDelete={openDelete}
              />
            </li>
          ))}
        </ul>
      </section>
      {renderOverlay()}
    </>
  );
}
