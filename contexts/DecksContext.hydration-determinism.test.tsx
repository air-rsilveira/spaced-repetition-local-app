import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { cleanup, render } from "@testing-library/react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";
import { DECKS_STORAGE_KEY } from "@/lib/storage";
import { arbDeckList } from "@/test/arbitraries";
import type { DeckList, DecksStatus } from "@/contexts/DecksContext";

/**
 * Property 9 verifies the hydration guard: even when `localStorage` is seeded
 * with a valid non-empty deck list, the value the store exposes on its very
 * first render (before the mount effect runs) must be the deterministic empty
 * list with status `"initial"`. This proves the provider does not read
 * `localStorage` during render.
 *
 * React Testing Library flushes effects during `render`, so we cannot inspect
 * the value after `render` to see the pre-effect state. Instead a probe child
 * records `useDecks()` into a caller-supplied capture object on its FIRST
 * render only — that first render happens synchronously before any effect
 * flushes. The capture object is passed via props (not a module-scoped
 * variable) so no outside-declared binding is reassigned during render.
 */

interface Capture {
  captured: boolean;
  decks: DeckList | null;
  status: DecksStatus | null;
}

function Probe({ capture }: { capture: Capture }) {
  const { decks, status } = useDecks();
  // Record only the first render; subsequent re-renders (post-effect) are
  // ignored so the capture reflects the pre-hydration value. Writing to the
  // caller-supplied capture object during render is deliberate here: this test
  // exists specifically to observe the render-phase (pre-effect) value that the
  // hydration guard exposes, which cannot be seen after effects flush.
  if (!capture.captured) {
    /* eslint-disable react-hooks/immutability -- intentional render-phase capture of the pre-hydration value under test */
    capture.captured = true;
    capture.decks = decks;
    capture.status = status;
    /* eslint-enable react-hooks/immutability */
  }
  return null;
}

describe("Decks store hydration is deterministic", () => {
  // Feature: walking-skeleton, Property 9: Hydration determinism of the initial deck list
  // Validates: Requirements 4.1, 4.2
  it("exposes the empty deterministic list on first render even with seeded localStorage", () => {
    fc.assert(
      fc.property(arbDeckList, (seededDecks) => {
        // Seed localStorage with a valid deck list before rendering.
        window.localStorage.setItem(
          DECKS_STORAGE_KEY,
          JSON.stringify(seededDecks),
        );

        const capture: Capture = {
          captured: false,
          decks: null,
          status: null,
        };

        try {
          render(
            <DecksProvider>
              <Probe capture={capture} />
            </DecksProvider>,
          );

          // The probe must have captured a first render.
          expect(capture.captured).toBe(true);

          // The pre-effect value is the deterministic empty list, regardless
          // of what was seeded into localStorage (no read during render).
          expect(capture.decks).toEqual([]);
          expect(capture.status).toBe("initial");
        } finally {
          cleanup();
          window.localStorage.clear();
        }
      }),
      { numRuns: 100 },
    );
  });
});
