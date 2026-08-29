import { describe, expect, it, vi } from "vitest";
import fc from "fast-check";

import { saveDecks } from "@/lib/storage";
import { arbDeckList } from "@/test/arbitraries";

describe("persistence write-failure resilience", () => {
  // Feature: walking-skeleton, Property 7: Write failures retain in-memory state and surface an error
  it("returns a failure result and leaves the input deck list unchanged when the write fails", () => {
    fc.assert(
      fc.property(
        arbDeckList,
        // Choose which kind of write failure to simulate on this run.
        fc.constantFrom("quota" as const, "unavailable" as const),
        (decks, failureKind) => {
          // Snapshot the input before the save so we can prove it is untouched.
          const snapshot = structuredClone(decks);

          const thrown =
            failureKind === "quota"
              ? new DOMException("quota exceeded", "QuotaExceededError")
              : new Error("storage unavailable");

          const spy = vi
            .spyOn(Storage.prototype, "setItem")
            .mockImplementation(() => {
              throw thrown;
            });

          try {
            const result = saveDecks(decks);

            // The save reports failure (never throws to the caller)...
            expect(result.ok).toBe(false);
            if (!result.ok) {
              // ...and maps the thrown error to the expected reason.
              expect(result.reason).toBe(
                failureKind === "quota" ? "quota" : "unavailable",
              );
            }

            // The in-memory list handed to saveDecks is retained unchanged.
            expect(decks).toEqual(snapshot);
          } finally {
            spy.mockRestore();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
