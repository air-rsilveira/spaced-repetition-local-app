"use client";

/**
 * EmptyState — shown on the Dashboard when the Decks_Store contains no decks.
 *
 * Renders a "no decks" message and a "Create deck" entry point. The button
 * opens the deck form in create mode via the `onCreate` callback supplied by
 * the Dashboard (Requirement 1.1).
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
      className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8 text-center"
    >
      <div className="w-full max-w-md rounded-lg border border-aws-gray-200 bg-aws-white p-8 shadow-sm sm:p-12">
        <h2
          id="empty-state-heading"
          className="text-2xl font-semibold tracking-tight text-aws-gray-900"
        >
          No decks yet
        </h2>
        <p className="mt-3 text-base leading-7 text-aws-gray-600">
          Your memory&rsquo;s workout starts here. Create your first deck, or
          upload one you already have, and let spaced repetition do the heavy
          lifting.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-11 items-center justify-center rounded-md bg-aws-orange px-6 text-sm font-semibold text-aws-squid-ink transition-colors hover:bg-aws-orange-dark"
          >
            Create deck
          </button>
        </div>
      </div>
    </section>
  );
}
