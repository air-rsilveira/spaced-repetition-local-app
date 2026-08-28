"use client";

/**
 * EmptyState — shown on the Dashboard when the Decks_Store contains no decks.
 *
 * Renders a "no decks" message plus two entry points: create-deck and
 * import-deck. The "Create deck" button opens the deck form in create mode via
 * the `onCreate` callback supplied by the Dashboard (Requirement 1.1). The
 * "Import deck" button remains a stub for a later slice — it is present and
 * labelled but does not yet initiate a flow.
 *
 * Client Component: the "Create deck" button attaches an `onClick` handler, so
 * this component needs interactivity.
 *
 * Requirements: 1.1, 6.2, 6.3
 */
interface EmptyStateProps {
  /** Opens the deck form in create mode. */
  onCreate: () => void;
}

export default function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <section
      aria-labelledby="empty-state-heading"
      className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="w-full max-w-md rounded-lg border border-aws-gray-200 bg-aws-white p-8 shadow-sm sm:p-12">
        <h2
          id="empty-state-heading"
          className="text-2xl font-semibold tracking-tight text-aws-gray-900"
        >
          No decks yet
        </h2>
        <p className="mt-3 text-base leading-7 text-aws-gray-600">
          You don&apos;t have any decks. Create a new deck or import an existing
          one to start studying.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-11 items-center justify-center rounded-md bg-aws-orange px-6 text-sm font-semibold text-aws-squid-ink transition-colors hover:bg-aws-orange-dark"
          >
            Create deck
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-md bg-aws-blue px-6 text-sm font-semibold text-aws-white transition-colors hover:bg-aws-blue-dark"
          >
            Import deck
          </button>
        </div>
      </div>
    </section>
  );
}
