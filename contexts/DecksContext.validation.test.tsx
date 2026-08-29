// Feature: deck-crud, Property 5 - Invalid input is rejected, leaves the list unchanged, and identifies each invalid field
// Validates: Requirements 1.8, 2.9, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
import { act, renderHook } from "@testing-library/react";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  DecksProvider,
  useDecks,
  type AddDeckInput,
} from "@/contexts/DecksContext";
import type { Deck, DeckList } from "@/types";
import {
  arbDeck,
  arbOverlongDescription,
  arbOverlongName,
  arbWhitespaceName,
} from "@/test/arbitraries";

/**
 * Property 5: Invalid input is rejected, leaves the list unchanged, and
 * identifies each invalid field.
 *
 * For any deck list and any invalid form input — a name that is empty,
 * whitespace-only, or longer than 100 characters, and/or a description longer
 * than 500 characters — both `addDeck` and `updateDeck` reject the change,
 * leave the deck list unchanged, and return a validation error whose fields
 * identify each invalid field (`name` and/or `description`).
 *
 * Validates: Requirements 1.8, 2.9, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

/**
 * Remove decks that share an id (keeping first occurrence and order) and drop
 * decks whose name is whitespace-only, since the store rejects those with a
 * `name-required` error and they are not valid seed adds for this property.
 */
function dedupeSeed(decks: readonly Deck[]): Deck[] {
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

/**
 * An invalid form input plus the set of fields we expect the rejection to
 * flag. Each shape targets a distinct branch of the schema:
 *  - whitespace/empty name → `name` invalid
 *  - overlong name (>100)  → `name` invalid
 *  - overlong description  → `description` invalid
 *  - overlong name AND description → both invalid
 */
interface InvalidInput {
  name: string;
  description?: string;
  expectedFields: ReadonlyArray<"name" | "description">;
}

const arbInvalidInput: fc.Arbitrary<InvalidInput> = fc.oneof(
  // Empty / whitespace-only name (optionally with a valid description).
  arbWhitespaceName.map((name) => ({
    name,
    expectedFields: ["name"] as const,
  })),
  // Overlong name (>100 chars).
  arbOverlongName.map((name) => ({
    name,
    expectedFields: ["name"] as const,
  })),
  // Overlong description (>500 chars) with an otherwise valid name.
  arbOverlongDescription.map((description) => ({
    name: "valid name",
    description,
    expectedFields: ["description"] as const,
  })),
  // Both name and description invalid.
  fc
    .tuple(arbOverlongName, arbOverlongDescription)
    .map(([name, description]) => ({
      name,
      description,
      expectedFields: ["name", "description"] as const,
    })),
);

function seedStore(
  result: { current: ReturnType<typeof useDecks> },
  seed: readonly Deck[],
): void {
  act(() => {
    for (const deck of seed) {
      const input: AddDeckInput = {
        id: deck.id,
        name: deck.name,
        cards: deck.cards,
        ...(deck.description !== undefined
          ? { description: deck.description }
          : {}),
      };
      const res = result.current.addDeck(input);
      expect(res.ok).toBe(true);
    }
  });
}

describe("DecksContext — Property 5: invalid input is rejected and identifies each field", () => {
  it("rejects invalid input for addDeck and updateDeck, leaves the list unchanged, and flags every invalid field", () => {
    fc.assert(
      fc.property(
        fc.array(arbDeck, { minLength: 1, maxLength: 6 }),
        arbInvalidInput,
        (rawSeed, invalid) => {
          // Isolate each run: the provider persists to and hydrates from
          // localStorage, so a deck seeded in a prior run would otherwise leak.
          localStorage.clear();

          const seed = dedupeSeed(rawSeed);
          // Property is about non-empty lists so `updateDeck` has a real target.
          fc.pre(seed.length >= 1);

          const { result, unmount } = renderHook(() => useDecks(), {
            wrapper: DecksProvider,
          });

          try {
            seedStore(result, seed);

            const before: DeckList = result.current.decks;
            expect(before).toHaveLength(seed.length);
            const snapshot = structuredClone(before);
            const targetId = before[0].id;

            const expectedFields = new Set(invalid.expectedFields);
            const invalidDescription = invalid.description;

            // --- addDeck rejection ---
            let addResult: ReturnType<typeof result.current.addDeck>;
            act(() => {
              addResult = result.current.addDeck({
                name: invalid.name,
                ...(invalidDescription !== undefined
                  ? { description: invalidDescription }
                  : {}),
              });
            });

            // The change is rejected.
            expect(addResult!.ok).toBe(false);
            if (addResult!.ok === false) {
              const { error } = addResult!;
              expect(error.code).toBe("validation");
              if (error.code === "validation") {
                // Every expected invalid field is flagged with a message.
                for (const field of expectedFields) {
                  expect(error.fields[field]).toBeTruthy();
                }
                // No unexpected field is flagged.
                for (const field of Object.keys(error.fields)) {
                  expect(expectedFields.has(field as "name" | "description")).toBe(
                    true,
                  );
                }
              }
            }
            // The list is unchanged after the rejected add.
            expect(result.current.decks).toEqual(snapshot);

            // --- updateDeck rejection ---
            let updateResult: ReturnType<typeof result.current.updateDeck>;
            act(() => {
              updateResult = result.current.updateDeck({
                id: targetId,
                name: invalid.name,
                ...(invalidDescription !== undefined
                  ? { description: invalidDescription }
                  : {}),
              });
            });

            expect(updateResult!.ok).toBe(false);
            if (updateResult!.ok === false) {
              const { error } = updateResult!;
              expect(error.code).toBe("validation");
              if (error.code === "validation") {
                for (const field of expectedFields) {
                  expect(error.fields[field]).toBeTruthy();
                }
                for (const field of Object.keys(error.fields)) {
                  expect(expectedFields.has(field as "name" | "description")).toBe(
                    true,
                  );
                }
              }
            }
            // The list is unchanged after the rejected update.
            expect(result.current.decks).toEqual(snapshot);
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
