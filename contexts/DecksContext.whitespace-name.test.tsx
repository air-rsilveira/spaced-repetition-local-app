import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { act, cleanup, renderHook } from "@testing-library/react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";

/**
 * Whitespace-only names for Property 2: strings composed solely of whitespace
 * characters (space, tab, newline, carriage return), including the empty
 * string. Every value in this space must be rejected by `addDeck`.
 */
const arbWhitespaceName: fc.Arbitrary<string> = fc.string({
  unit: fc.constantFrom(" ", "\t", "\n", "\r"),
  minLength: 0,
  maxLength: 10,
});

describe("Decks store rejects whitespace-only names", () => {
  // Feature: walking-skeleton, Property 2: Empty or whitespace-only names are rejected
  // Validates: Requirements 2.5
  it("returns a name-required error and leaves the deck list unchanged", () => {
    fc.assert(
      fc.property(arbWhitespaceName, (name) => {
        const { result } = renderHook(() => useDecks(), {
          wrapper: DecksProvider,
        });

        try {
          // Provider seeds an empty list; localStorage is cleared per test.
          const before = result.current.decks;
          expect(before).toEqual([]);

          let outcome!: ReturnType<typeof result.current.addDeck>;
          act(() => {
            outcome = result.current.addDeck({ name });
          });

          // The operation is rejected with the name-required error.
          expect(outcome.ok).toBe(false);
          if (outcome.ok) {
            throw new Error("expected addDeck to reject a whitespace-only name");
          }
          expect(outcome.error.code).toBe("name-required");

          // The exposed deck list is left unchanged.
          expect(result.current.decks).toEqual(before);
          expect(result.current.decks).toHaveLength(0);
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });
});
