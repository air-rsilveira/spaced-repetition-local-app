/**
 * LoadingState — shared presentation component for rendering a loading indication.
 *
 * This is a Server Component (no interactivity). It renders a consistent,
 * centered loading indication used across the Dashboard, Deck_Detail_View, and
 * Review_View while the Decks_Store status is `"initial"` (the pre-hydration
 * loading phase).
 *
 * Accessibility: The region uses `role="status"` and `aria-live="polite"` so
 * the transition out of loading is announced without stealing focus
 * (Requirements 2.1, 2.2, 2.3).
 *
 * Requirements: 2.1, 2.2, 2.3
 */

interface LoadingStateProps {
  /** Optional custom label; defaults to "Loading…". */
  label?: string;
}

export default function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={label}
      className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="text-center">
        {/* Loading spinner */}
        <div className="mb-4 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-aws-gray-200 border-t-aws-orange" />
        </div>
        {/* Loading label */}
        <p className="text-base font-medium text-aws-gray-600">{label}</p>
      </div>
    </section>
  );
}
