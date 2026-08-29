import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { cleanup, render } from "@testing-library/react";

import DeckCard from "@/components/DeckCard";
import { arbDeck } from "@/test/arbitraries";

describe("DeckCard due count badge", () => {
  // Requirement 9, Acceptance Criteria 2: THE System SHALL display the due count as a badge on each deck card
  it("renders a badge with the correct due count when dueCount > 0", () => {
    fc.assert(
      fc.property(arbDeck, fc.integer({ min: 1, max: 100 }), (deck, dueCount) => {
        const { getByTestId } = render(
          <DeckCard deck={deck} dueCount={dueCount} />,
        );

        try {
          // Badge should be present when dueCount > 0
          const badge = getByTestId("due-count-badge");
          expect(badge).toBeTruthy();

          // Badge text should contain the exact count and "due" label
          expect(badge.textContent).toBe(`${dueCount} due`);

          // Badge should be rendered with aws-orange background
          expect(badge).toHaveClass("bg-aws-orange");

          // Badge should be rendered with aws-squid-ink text for contrast
          expect(badge).toHaveClass("text-aws-squid-ink");
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });

  // Requirement 9, Acceptance Criteria 2: THE System SHALL display the due count as a badge on each deck card
  // When dueCount = 0, no badge should be shown
  it("does not render a badge when dueCount is 0", () => {
    fc.assert(
      fc.property(arbDeck, (deck) => {
        const { queryByTestId, container } = render(
          <DeckCard deck={deck} dueCount={0} />,
        );

        try {
          // Badge should not be present when dueCount = 0
          const badge = queryByTestId("due-count-badge");
          expect(badge).toBeNull();

          // Card count should still be displayed
          const rendered = container.textContent ?? "";
          const count = deck.cards.length;
          const unit = count === 1 ? "card" : "cards";
          expect(rendered).toContain(`${count} ${unit}`);
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });

  // Requirement 9, Acceptance Criteria 2: THE System SHALL display the due count as a badge on each deck card
  // Badge should be positioned near the card count (right-aligned in a flex container)
  it("renders the badge in the correct location near the card count", () => {
    fc.assert(
      fc.property(arbDeck, fc.integer({ min: 1, max: 100 }), (deck, dueCount) => {
        const { getByTestId, container } = render(
          <DeckCard deck={deck} dueCount={dueCount} />,
        );

        try {
          // Get the flex container that holds the count and badge
          const flexContainer = container.querySelector("div.flex.items-center.justify-between");
          expect(flexContainer).toBeTruthy();

          // Card count paragraph should be the first element in the flex container
          const countParagraph = flexContainer?.querySelector("p");
          expect(countParagraph).toBeTruthy();
          const count = deck.cards.length;
          const unit = count === 1 ? "card" : "cards";
          expect(countParagraph?.textContent).toBe(`${count} ${unit}`);

          // Badge should be a child of the flex container when visible
          const badge = getByTestId("due-count-badge");
          expect(badge.parentElement).toBe(flexContainer);
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });
});
