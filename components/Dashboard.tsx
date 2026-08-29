"use client";

import { useState } from "react";
import Link from "next/link";

import { useDecks } from "@/contexts/DecksContext";
import { resolvePhase } from "@/contexts/useStorePhase";
import DeckCard from "@/components/DeckCard";
import DeckCardActions from "@/components/DeckCardActions";
import DeckForm from "@/components/DeckForm";
import DeleteConfirm from "@/components/DeleteConfirm";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import ImportControl from "@/components/ImportControl";
import { getDueCards } from "@/lib/leitner";
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
 * transitions between states happen automatically on the next React render when
 * the store updates.
 *
 * Render logic uses `resolvePhase()` to determine the current presentation phase:
 * - `"loading"` (status === "initial"): render `LoadingState` with a loading indicator
 * - `"error"` (status === "error" or hasError): render `ErrorState` with error message
 * - `"empty"` (status === "ready" and decks.length === 0): render `EmptyState` in place
 *   of the listing, wired to open the create form (Requirement 1.1)
 * - `"content"` (status === "ready" with decks): render exactly one `DeckCard` per deck,
 *   in store order, each paired with `DeckCardActions` to open the edit/delete overlays
 *   (Requirements 1.6, 2.6, 3.4)
 *
 * The overlay renders `DeckForm` for create/edit and `DeleteConfirm` for delete;
 * confirming delete calls `deleteDeck(deck.id)` then closes, while cancelling leaves
 * the list unchanged (Requirements 1.1, 2.1, 3.1, 3.7).
 *
 * Requirements: 2.1, 2.4, 3.5, 4.1
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

  const phase = resolvePhase({
    status,
    hasError: status === "error",
    isEmpty: decks.length === 0,
  });

  // Render loading state
  if (phase === "loading") {
    return <LoadingState />;
  }

  // Render error state
  if (phase === "error") {
    return (
      <ErrorState
        message={
          error?.message ??
          "Something went wrong while loading your decks. Please try again."
        }
      />
    );
  }

  // Render empty state
  if (phase === "empty") {
    return (
      <>
        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <h2 className="text-xl font-semibold tracking-tight text-aws-gray-900 mb-4">
                Import a deck
              </h2>
              <div className="max-w-sm">
                <ImportControl />
              </div>
            </div>
          </div>
        </section>
        <EmptyState onCreate={openCreate} />
        {renderOverlay()}
      </>
    );
  }

  // Render content (listing view)
  return (
    <>
      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h3 className="text-sm font-semibold tracking-tight text-aws-gray-600 mb-3">
              Import a deck
            </h3>
            <div className="max-w-sm">
              <ImportControl />
            </div>
          </div>

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
            {decks.map((deck) => {
              const today = new Date();
              const dueCount = getDueCards(deck, today).length;
              return (
                <li key={deck.id} className="flex flex-col gap-3">
                  <Link href={`/deck/${deck.id}`}>
                    <DeckCard deck={deck} dueCount={dueCount} />
                  </Link>
                  <DeckCardActions
                    deck={deck}
                    onEdit={openEdit}
                    onDelete={openDelete}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      {renderOverlay()}
    </>
  );
}
