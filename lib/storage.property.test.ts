import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DECKS_STORAGE_KEY, loadDecks } from "@/lib/storage";
import { deckListSchema } from "@/types";
import { arbGarbageStorage } from "@/test/arbitraries";

describe("lib/storage loadDecks resilience", () => {
  // Feature: walking-skeleton, Property 6: Invalid or missing persisted data loads as empty without throwing
  it("never throws and yields empty for missing, non-JSON, or schema-invalid stored data", () => {
    fc.assert(
      fc.property(
        // `undefined` models the missing key; a string models present data.
        fc.option(arbGarbageStorage, { nil: undefined }),
        (stored) => {
          // Arrange: seed (or clear) the persisted key.
          localStorage.clear();
          if (stored !== undefined) {
            localStorage.setItem(DECKS_STORAGE_KEY, stored);
          }

          // Act: loading must never throw.
          let result: ReturnType<typeof loadDecks>;
          expect(() => {
            result = loadDecks();
          }).not.toThrow();

          // Determine whether the stored data was, in fact, valid deck data.
          // An arbitrary string could incidentally be JSON that satisfies the
          // schema (e.g. "[]"), so classify by actually parsing it the same
          // way loadDecks does rather than assuming every sample is garbage.
          let storedIsValidDeckList = false;
          if (stored !== undefined) {
            try {
              storedIsValidDeckList = deckListSchema.safeParse(
                JSON.parse(stored),
              ).success;
            } catch {
              storedIsValidDeckList = false;
            }
          }

          if (storedIsValidDeckList) {
            // Incidentally-valid data: loadDecks succeeds. Not the focus of
            // this property, but it must still not throw (asserted above).
            expect(result!.ok).toBe(true);
            return;
          }

          // For missing or unparseable/invalid data, loadDecks yields empty:
          // a failure result whose reason is "empty" or "invalid" (never a
          // populated deck list).
          expect(result!.ok).toBe(false);
          if (result!.ok === false) {
            expect(["empty", "invalid"]).toContain(result!.reason);

            if (stored === undefined) {
              // Missing key -> empty.
              expect(result!.reason).toBe("empty");
            } else {
              // Data was present but unparseable/invalid -> invalid indication.
              expect(result!.reason).toBe("invalid");
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
