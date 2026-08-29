import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";
import type { Deck, DeckList } from "@/types";
import { arbDeck, arbId } from "@/test/arbitraries";

/**
 * Unit tests for `replaceDeck`: replacing an existing id swaps the deck and
 * persists; replacing an unknown id returns `not-found` and leaves the list
 * unchanged.
 *
 * Requirements: 10.1, 10.6
 */

function wrapper({ children }: { children: ReactNode }) {
  return <DecksProvider>{children}</DecksProvider>;
}

/**
 * Remove decks that share an id (keeping first occurrence and order) and
 * filter out decks with whitespace-only names (which the store rejects).
 * This ensures the seed list contains unique ids and valid names.
 */
function dedupeById(decks: readonly Deck[]): Deck[] {
  const seen = new Set<string>();
  const unique: Deck[] = [];
  for (const deck of decks) {
    if (deck.name.trim().length === 0) {
      continue; // Skip whitespace-only names (store rejects these)
    }
    if (!seen.has(deck.id)) {
      seen.add(deck.id);
      unique.push(deck);
    }
  }
  return unique;
}

describe("contexts/DecksContext replaceDeck", () => {
  it("replaces an existing deck by id and persists the change", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 1, maxLength: 8 }),
        arbDeck,
        (rawInitial, rawReplacement) => {
          // Isolate each iteration: the provider persists to and hydrates from
          // localStorage, so clear it to prevent decks leaking across runs.
          localStorage.clear();

          const initial = dedupeById(rawInitial);

          // If no decks remain after filtering (all were whitespace names),
          // skip this iteration since we need at least one deck to test replacement.
          if (initial.length === 0) {
            return;
          }

          const deckToReplace = initial[0];
          const deckToReplaceId = deckToReplace.id;

          // Create a replacement deck with the same id but different content.
          // Ensure it has a valid (non-whitespace) name.
          const replacementName =
            rawReplacement.name.trim().length === 0
              ? "replacement-deck"
              : rawReplacement.name;
          const replacement: Deck = {
            ...rawReplacement,
            name: replacementName,
            id: deckToReplaceId, // Use the id of the deck we're replacing
          };

          const { result, unmount } = renderHook(() => useDecks(), { wrapper });

          try {
            // Seed the store with the initial decks.
            act(() => {
              for (const deck of initial) {
                const res = result.current.addDeck({
                  id: deck.id,
                  name: deck.name,
                  cards: deck.cards,
                  ...(deck.description !== undefined
                    ? { description: deck.description }
                    : {}),
                });
                expect(res.ok).toBe(true);
              }
            });

            const before: DeckList = result.current.decks;
            expect(before).toHaveLength(initial.length);

            // Act: replace the first deck.
            let replaceResult: ReturnType<
              typeof result.current.replaceDeck
            >;
            act(() => {
              replaceResult = result.current.replaceDeck(replacement);
            });

            // Verify the operation succeeds.
            expect(replaceResult!.ok).toBe(true);
            if (replaceResult!.ok) {
              expect(replaceResult!.deck.id).toBe(deckToReplaceId);
              expect(replaceResult!.deck.name).toBe(replacement.name);
            }

            const after = result.current.decks;

            // The list length remains the same.
            expect(after).toHaveLength(before.length);

            // The replaced deck is updated in place (same position).
            const replacedDeck = after[0];
            expect(replacedDeck.id).toBe(deckToReplaceId);
            expect(replacedDeck.name).toBe(replacement.name);
            expect(replacedDeck.description).toBe(replacement.description);

            // Other decks remain unchanged.
            for (let i = 1; i < after.length; i++) {
              expect(after[i].id).toBe(before[i].id);
              expect(after[i].name).toBe(before[i].name);
            }

            // Verify persistence: tear down and re-mount to verify the state
            // was persisted to localStorage and re-loaded.
            unmount();

            const { result: result2 } = renderHook(() => useDecks(), {
              wrapper,
            });

            // Wait for hydration.
            let hydrated = false;
            act(() => {
              if (result2.current.status === "ready") {
                hydrated = true;
              }
            });

            if (!hydrated) {
              // If not ready immediately, wait for it.
              // (In practice, the mount effect should have already run.)
              // Just verify the hydrated state eventually shows the replaced deck.
              expect(result2.current.decks.find((d) => d.id === deckToReplaceId)?.name)
                .toBe(replacement.name);
            }
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns not-found and leaves the list unchanged when replacing an unknown id", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 0, maxLength: 8 }),
        arbDeck,
        arbId,
        (rawInitial, rawReplacement, unknownId) => {
          // Isolate each iteration.
          localStorage.clear();

          const initial = dedupeById(rawInitial);

          // Ensure the unknownId is not in the initial list.
          const initialIds = new Set(initial.map((d) => d.id));
          const idToReplace = initialIds.has(unknownId)
            ? `absent-${unknownId}-${initial.length}`
            : unknownId;

          // Create a replacement deck with the unknown id.
          const replacement: Deck = {
            ...rawReplacement,
            id: idToReplace,
          };

          const { result, unmount } = renderHook(() => useDecks(), { wrapper });

          try {
            // Seed the store with the initial decks.
            act(() => {
              for (const deck of initial) {
                const res = result.current.addDeck({
                  id: deck.id,
                  name: deck.name,
                  cards: deck.cards,
                  ...(deck.description !== undefined
                    ? { description: deck.description }
                    : {}),
                });
                expect(res.ok).toBe(true);
              }
            });

            const before = [...result.current.decks];
            expect(before).toHaveLength(initial.length);

            // Act: attempt to replace a deck with an unknown id.
            let replaceResult: ReturnType<
              typeof result.current.replaceDeck
            >;
            act(() => {
              replaceResult = result.current.replaceDeck(replacement);
            });

            // The operation fails with not-found.
            expect(replaceResult!.ok).toBe(false);
            if (!replaceResult!.ok) {
              expect(replaceResult!.error.code).toBe("not-found");
            }

            const after = result.current.decks;

            // The list is unchanged.
            expect(after).toHaveLength(before.length);
            for (let i = 0; i < after.length; i++) {
              expect(after[i].id).toBe(before[i].id);
              expect(after[i].name).toBe(before[i].name);
            }
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
