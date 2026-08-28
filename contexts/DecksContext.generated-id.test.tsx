import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { act, renderHook } from "@testing-library/react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";

/**
 * A non-blank deck name (1-100 chars with at least one non-whitespace
 * character). Defined locally to avoid concurrent edits to the shared
 * arbitraries module. The store trims names and rejects blank ones, so this
 * property — which is only concerned with id generation — supplies names that
 * always pass validation.
 */
const arbNonBlankName: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((name) => name.trim().length > 0);

/**
 * Property 3 — generated-id uniqueness.
 *
 * When `addDeck` is called WITHOUT an `id`, the store must generate a fresh id
 * (via `crypto.randomUUID()`) that is distinct from every existing deck id, so
 * that every deck in the resulting list keeps a unique identifier.
 */
describe("DecksContext generated-id uniqueness", () => {
  // Feature: walking-skeleton, Property 3: Generated identifiers are unique within the list
  it("generates ids distinct from all existing ids and keeps all ids unique", () => {
    fc.assert(
      fc.property(
        // A batch of 1-10 deck names to add, each without a supplied id so the
        // store must generate one.
        fc.array(arbNonBlankName, { minLength: 1, maxLength: 10 }),
        (names) => {
          // Each iteration starts from a clean store: the persistence effect
          // writes to localStorage, and a fresh provider would otherwise
          // hydrate from the previous iteration's data.
          localStorage.clear();

          const { result, unmount } = renderHook(() => useDecks(), {
            wrapper: DecksProvider,
          });

          try {
            for (const name of names) {
              // Snapshot the ids that exist before this add.
              const priorIds = result.current.decks.map((deck) => deck.id);

              let generatedId: string | undefined;
              act(() => {
                const outcome = result.current.addDeck({ name });
                expect(outcome.ok).toBe(true);
                if (outcome.ok) {
                  generatedId = outcome.deck.id;
                }
              });

              // The newly generated id must differ from every prior id.
              expect(priorIds).not.toContain(generatedId);
            }

            // After all adds, every id in the resulting list is distinct.
            const ids = result.current.decks.map((deck) => deck.id);
            expect(new Set(ids).size).toBe(ids.length);
            // Sanity: we added exactly as many decks as names supplied.
            expect(ids.length).toBe(names.length);
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
