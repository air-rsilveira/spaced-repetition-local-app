/**
 * ErrorState — renders an accessible alert for failure states.
 *
 * Displays a human-readable error message paired with the aws-error accent
 * (never color alone per accessibility requirements). Supports an optional title
 * (defaults to "Something went wrong") and an optional action slot for recovery
 * controls (e.g. a "Back to Dashboard" link from a not-found state).
 *
 * Server Component: renders a read-only alert region. Interactivity (if needed)
 * is supplied via the `action` prop.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.6, 7.4, 1.9
 */

export interface ErrorStateProps {
  /** Non-empty human-readable error message. Rendered as text (never color alone). */
  message: string;
  /** Optional heading; defaults to "Something went wrong". */
  title?: string;
  /** Optional slot for a recovery/navigation control (e.g. BackLink). */
  action?: React.ReactNode;
}

export default function ErrorState({
  message,
  title = "Something went wrong",
  action,
}: ErrorStateProps) {
  return (
    <section
      role="alert"
      aria-live="assertive"
      className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8 text-center"
    >
      <div className="w-full max-w-md rounded-lg border-l-4 border-l-aws-error bg-aws-white p-6 shadow-sm sm:p-8">
        {/* Error icon or visual indicator paired with text heading */}
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-aws-error text-aws-white"
            aria-hidden="true"
          >
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <h2 className="text-lg font-semibold tracking-tight text-aws-gray-900">
              {title}
            </h2>
          </div>
        </div>

        {/* Error message — non-empty text content paired with error accent, never color alone */}
        <p className="mt-3 text-base leading-7 text-aws-gray-600">{message}</p>

        {/* Optional action slot for recovery controls */}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </section>
  );
}
