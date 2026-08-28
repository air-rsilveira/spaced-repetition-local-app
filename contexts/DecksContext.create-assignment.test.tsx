import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";
import type { Deck } from "@/types";
import { arbDeck, arbDeckFormInput } from "@/test/arbitraries";

/**
 * Property 1 test for the Decks store (`addDeck`).
 *
 * For any prior deck list and any valid form input, `addDeck` appends exactly
 * one deck whose id is a non-empty string distinct from every existing id,
 * whose createdAt parses as a valid ISO 8601 timestamp, and whose cards is an
 * empty array; the trimmed name and description match the input.
 *
 * The store rejects duplicate ids, so the seeded list must carry distinct ids.
 * `arbDeck` does not guarantee uniqueness across a list, so we dedupe the seed
 * by id and drop decks whose name is whitespace-only (which the store rejects).
 * The new deck is added without a supplied id so the store generates one via
 * `crypto.randomUUID()`.
 */

function wrapper({ children }: { children: ReactNode }) {
  return <DecksProvider>{children}</DecksProvider>;
}

/** Keep the first occurrence of each id and drop blank-named decks. */
function dedupeById(decks: readonly Deck[]): Deck[] {
  const seen = new Set<string>();
  const unique: Deck[] = [];
  for (const deck of decks) {
    if (deck.name.trim().length === 0) {
      continue;
    }
    if (!seen.has(deck.id)) {
      seen.add(deck.id);
      unique.push(deck);
    }
  }
  return unique;
}

describe("contexts/DecksContext addDeck create assignment", () => {
  // Feature: deck-crud, Property 1 - Creating a valid deck assigns a unique id, a valid createdAt, and empty cards
  // Validates: Requirements 1.2, 1.3, 1.4, 1.5
  it("assigns a unique id, valid ISO 8601 createdAt, and empty cards, with trimmed name/description matching the input", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 0, maxLength: 8 }),
        arbDeckFormInput,
        (rawInitial, formInput) => {
          // Isolate each iteration: the provider persists to and hydrates from
          // localStorage, so clear it to prevent decks leaking across runs.
          localStorage.clear();

          const initial = dedupeById(rawInitial);

          const { result, unmount } = renderHook(() => useDecks(), {
            wrapper,
          });

          try {
            // Seed the store with the prior deck list; each has a distinct id
            // so every add succeeds.
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

            const before = result.current.decks;
            const existingIds = before.map((deck) => deck.id);

            // Act: add one more deck from valid form input (no supplied id, so
            // the store generates one).
            let addResult: ReturnType<typeof result.current.addDeck>;
            act(() => {
              addResult = result.current.addDeck({
                name: formInput.name,
                ...(formInput.description !== undefined
                  ? { description: formInput.description }
                  : {}),
              });
            });

            expect(addResult!.ok).toBe(true);
            if (!addResult!.ok) {
              return;
            }

            const created = addResult!.deck;
            const after = result.current.decks;

            // Exactly one deck was appended.
            expect(after).toHaveLength(before.length + 1);
            expect(after[after.length - 1]).toEqual(created);

            // id is a non-empty string distinct from every existing id.
            expect(typeof created.id).toBe("string");
            expect(created.id.length).toBeGreaterThan(0);
            expect(existingIds).not.toContain(created.id);

            // createdAt parses as a valid ISO 8601 timestamp.
            expect(typeof created.createdAt).toBe("string");
            expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false);

            // cards is initialized to an empty array.
            expect(created.cards).toEqual([]);

            // The trimmed name matches the input.
            expect(created.name).toBe(formInput.name.trim());

            // The description matches the trimmed input, or is absent when the
            // trimmed input is empty/absent.
            const expectedDescription = formInput.description?.trim();
            if (expectedDescription) {
              expect(created.description).toBe(expectedDescription);
            } else {
              expect(created.description).toBeUndefined();
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
