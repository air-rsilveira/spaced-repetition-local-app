"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useUIActions } from "@/contexts/UIActionsContext";

/** Matches a deck detail route (`/deck/:id`) but not nested routes like review. */
const DECK_ROUTE = /^\/deck\/[^/]+$/;

const primaryButton =
  "inline-flex h-11 items-center justify-center rounded-md bg-aws-orange px-6 text-sm font-semibold text-aws-squid-ink transition-colors hover:bg-aws-orange-dark";

const secondaryButton =
  "inline-flex h-11 items-center justify-center rounded-md border border-aws-white/40 px-6 text-sm font-semibold text-aws-white transition-colors hover:border-aws-white hover:bg-aws-white/10";

/**
 * ContextualActionBar — the route-aware action bar rendered by the layout,
 * directly below the persistent `AppHeader`.
 *
 * Client Component: it reads the current route via `usePathname()` and the
 * page-registered intent via `useUIActions()`. Rendering is purely a function
 * of the route and the current registration:
 *
 * - Landing (`/`): "New deck" (primary) and "Upload deck".
 * - Deck (`/deck/:id`): the deck name as static text on the left; "Add card"
 *   and "Study" on the right.
 * - Any other route (or a route/registration mismatch): renders nothing.
 *
 * Styling follows the AWS palette on an `aws-squid-ink` sub-bar beneath the
 * header, reserving `aws-orange` for the primary call-to-action with dark text
 * for contrast. The layout is mobile-first: controls stack on small screens and
 * lay out in a row from the `sm:` breakpoint up.
 */
export default function ContextualActionBar() {
  const pathname = usePathname();
  const { registration } = useUIActions();

  const isLanding = pathname === "/";
  const isDeck = DECK_ROUTE.test(pathname ?? "");

  // Landing route with landing actions registered.
  if (isLanding && registration?.kind === "landing") {
    const { onNewDeck, onUploadDeck } = registration.actions;
    return (
      <div className="border-b border-aws-anchor bg-aws-squid-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 lg:px-8">
          <button type="button" onClick={onUploadDeck} className={secondaryButton}>
            Upload deck
          </button>
          <button type="button" onClick={onNewDeck} className={primaryButton}>
            New deck
          </button>
        </div>
      </div>
    );
  }

  // Deck route with deck actions registered.
  if (isDeck && registration?.kind === "deck") {
    const { deckName, onAddCard, onStudyHref } = registration.actions;
    return (
      <div className="border-b border-aws-anchor bg-aws-squid-ink">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
          <h1 className="truncate text-lg font-semibold tracking-tight text-aws-white sm:text-xl">
            {deckName}
          </h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Link href="/" className={secondaryButton}>
              Dashboard
            </Link>
            <button type="button" onClick={onAddCard} className={secondaryButton}>
              Add card
            </button>
            <Link href={onStudyHref} className={primaryButton}>
              Study
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Unmatched route (or route/registration mismatch): render nothing.
  return null;
}
