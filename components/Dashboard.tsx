"use client";

import { useDecks } from "@/contexts/DecksContext";
import DeckCard from "@/components/DeckCard";
import EmptyState from "@/components/EmptyState";

/**
 * Dashboard — the home view that lists the user's decks.
 *
 * Client Component: it consumes the decks store via `useDecks()`. Rendering is
 * driven entirely by store state, so transitions between the empty state and
 * the listing happen automatically on the next React render when the store
 * updates (Requirements 6.4, 6.5).
 *
 * Render logic:
 * - `status === "error"`: render an error indication and neither the listing
 *   nor the empty state; any previously loaded decks stay in the store
 *   (Requirement 6.6).
 * - `decks.length === 0`: render the `EmptyState` in place of the listing and
 *   no `DeckCard` (Requirements 5.6, 6.1).
 * - otherwise: render exactly one `DeckCard` per deck, in store order
 *   (Requirements 5.1, 5.7).
 */
export default function Dashboard() {
  const { decks, status, error } = useDecks();

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
    return <EmptyState />;
  }

  return (
    <section className="px-6 py-8">
      <h2 className="text-xl font-semibold tracking-tight text-aws-gray-900">
        Your decks
      </h2>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((deck) => (
          <li key={deck.id}>
            <DeckCard deck={deck} />
          </li>
        ))}
      </ul>
    </section>
  );
}
