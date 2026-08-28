import NavLinks from "@/components/NavLinks";

/**
 * Persistent application chrome rendered at the top of every route.
 *
 * This is a Server Component (no `"use client"`); it renders the client
 * `NavLinks` component for the interactive, route-aware primary navigation.
 *
 * Styling follows the AWS palette: an `aws-squid-ink` dark surface with
 * `aws-white` text for a 4.5:1+ contrast ratio. The header is `sticky top-0`
 * so it stays visible while scrolling on both mobile and desktop. The layout
 * is mobile-first (a single vertical column) and switches to a horizontal row
 * at the `md:` breakpoint for the desktop treatment.
 */
export default function AppHeader() {
  return (
    <header className="sticky top-0 z-10 bg-aws-squid-ink text-aws-white">
      <div className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6">
        <span className="text-lg font-bold text-aws-white">
          Spaced Repetition
        </span>
        <NavLinks />
      </div>
    </header>
  );
}
