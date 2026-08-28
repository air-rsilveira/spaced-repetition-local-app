import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { cleanup, render } from "@testing-library/react";

import DeckCard from "@/components/DeckCard";
import { arbDeck } from "@/test/arbitraries";

/**
 * A deck arbitrary whose description varies across the meaningful cases:
 *  - absent (undefined),
 *  - empty string,
 *  - whitespace-only strings, and
 *  - regular non-empty text.
 *
 * DeckCard treats a description as present only when `deck.description?.trim()`
 * is non-empty, so whitespace-only descriptions are expected to render no
 * description region (Requirement 5.4). Building on `arbDeck` keeps the id,
 * name and cards realistic while local variation drives the description.
 */
const arbDeckWithVariedDescription = fc
  .tuple(
    arbDeck,
    fc.oneof(
      fc.constant<string | undefined>(undefined),
      fc.constant(""),
      // Whitespace-only strings (spaces, tabs, newlines) — treated as absent.
      fc
        .array(fc.constantFrom(" ", "\t", "\n"), { minLength: 1, maxLength: 5 })
        .map((parts) => parts.join("")),
      // Non-empty text that survives trimming (has at least one non-space char).
      fc
        .string({ minLength: 1, maxLength: 500 })
        .filter((s) => s.trim().length > 0),
    ),
  )
  .map(([deck, description]) => {
    const next = { ...deck };
    if (description === undefined) {
      delete next.description;
    } else {
      next.description = description;
    }
    return next;
  });

describe("DeckCard conditional description", () => {
  // Feature: walking-skeleton, Property 12: DeckCard renders description conditionally
  it("renders the description text exactly when it is present and non-empty, always rendering name and count", () => {
    fc.assert(
      fc.property(arbDeckWithVariedDescription, (deck) => {
        try {
          const { container } = render(<DeckCard deck={deck} />);

          // A description is "present" only after trimming to non-empty.
          const trimmed = deck.description?.trim();
          const hasDescription = trimmed !== undefined && trimmed.length > 0;

          // The card renders exactly one <article> with the expected regions.
          // We read text off the concrete elements rather than via text
          // queries so that whitespace-only names/descriptions (which RTL
          // would normalize away) are compared faithfully.
          const paragraphs = Array.from(container.querySelectorAll("p"));

          // Name is always rendered as the heading text (verbatim).
          const heading = container.querySelector("h3");
          expect(heading).not.toBeNull();
          expect(heading?.textContent).toBe(deck.name);

          // Card count is always the last paragraph, rendered verbatim.
          const count = deck.cards.length;
          const countLabel = `${count} ${count === 1 ? "card" : "cards"}`;
          const countParagraph = paragraphs[paragraphs.length - 1];
          expect(countParagraph?.textContent).toBe(countLabel);

          if (hasDescription) {
            // Exactly two paragraphs: the description and the count. The
            // description paragraph renders the raw (untrimmed) text verbatim.
            expect(paragraphs).toHaveLength(2);
            expect(paragraphs[0]?.textContent).toBe(deck.description);
          } else {
            // No description region: only the count paragraph is present.
            expect(paragraphs).toHaveLength(1);
          }
        } finally {
          // Each fast-check run renders fresh; unmount to avoid duplicates.
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });
});
