/**
 * Property-based tests for `resolvePhase` status-gating helper.
 *
 * Feature: polish-responsiveness-e2e-wiring, Property 1
 * Validates: Requirements 2.1, 2.2, 2.3, 3.5, 4.1
 */

import fc from "fast-check";
import { describe, it, expect } from "vitest";
import { resolvePhase, type StorePhase } from "./useStorePhase";
import type { DecksStatus } from "./DecksContext";

describe("resolvePhase property tests", () => {
  /**
   * Property 1: Status gating yields exactly one phase
   *
   * For all (status, hasError, isEmpty) triples, resolvePhase returns exactly
   * one phase following fixed precedence: loading → error → empty → content.
   * The `empty` phase is reachable only when `status` is `ready`.
   * No two phases are ever simultaneously selected.
   *
   * Validates: Requirements 2.1, 2.2, 2.3, 3.5, 4.1
   */
  it("returns exactly one phase with fixed precedence", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("initial" as const, "ready" as const, "error" as const),
        fc.boolean(),
        fc.boolean(),
        (status: DecksStatus, hasError: boolean, isEmpty: boolean) => {
          const phase = resolvePhase({ status, hasError, isEmpty });

          // Assertion 1: phase must be one of the four valid phases
          expect(["loading", "error", "empty", "content"]).toContain(phase);

          // Assertion 2: phase follows fixed precedence
          // Precedence 1: loading (status === "initial")
          if (status === "initial") {
            expect(phase).toBe("loading");
          }
          // Precedence 2: error (status === "error" or hasError)
          else if (status === "error" || hasError) {
            expect(phase).toBe("error");
          }
          // Precedence 3: empty (status is "ready" but isEmpty)
          else if (isEmpty) {
            expect(phase).toBe("empty");
          }
          // Precedence 4: content (status is "ready" with content)
          else {
            expect(phase).toBe("content");
          }

          // Assertion 3: empty is reachable only when status is "ready"
          if (phase === "empty") {
            expect(status).toBe("ready");
            expect(hasError).toBe(false);
            expect(isEmpty).toBe(true);
          }

          // Assertion 4: loading is reachable only when status is "initial"
          if (phase === "loading") {
            expect(status).toBe("initial");
          }

          // Assertion 5: error implies status is "error" or hasError is true
          if (phase === "error") {
            expect(status === "error" || hasError).toBe(true);
          }

          // Assertion 6: content implies status is "ready", hasError is false,
          // and isEmpty is false
          if (phase === "content") {
            expect(status).toBe("ready");
            expect(hasError).toBe(false);
            expect(isEmpty).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Specific case: loading phase is reached only when status is "initial"
   * and does not depend on hasError or isEmpty.
   */
  it("loading phase is independent of hasError and isEmpty", () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (hasError, isEmpty) => {
        const phase = resolvePhase({
          status: "initial",
          hasError,
          isEmpty,
        });
        expect(phase).toBe("loading");
      }),
      { numRuns: 25 },
    );
  });

  /**
   * Specific case: error phase takes precedence over empty and content
   * when status is "ready" and hasError is true.
   */
  it("error phase has precedence over empty and content", () => {
    fc.assert(
      fc.property(fc.boolean(), (isEmpty) => {
        const phase = resolvePhase({
          status: "ready",
          hasError: true,
          isEmpty,
        });
        expect(phase).toBe("error");
      }),
      { numRuns: 25 },
    );
  });

  /**
   * Specific case: error phase is reached when status is "error",
   * regardless of hasError or isEmpty.
   */
  it("error status always yields error phase", () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (hasError, isEmpty) => {
        const phase = resolvePhase({
          status: "error",
          hasError,
          isEmpty,
        });
        expect(phase).toBe("error");
      }),
      { numRuns: 25 },
    );
  });

  /**
   * Specific case: empty phase is reached when status is "ready",
   * hasError is false, and isEmpty is true.
   */
  it("empty phase is reached only when ready, no error, and no content", () => {
    const phase = resolvePhase({
      status: "ready",
      hasError: false,
      isEmpty: true,
    });
    expect(phase).toBe("empty");
  });

  /**
   * Specific case: content phase is reached when status is "ready",
   * hasError is false, and isEmpty is false.
   */
  it("content phase is reached when ready, no error, and has content", () => {
    const phase = resolvePhase({
      status: "ready",
      hasError: false,
      isEmpty: false,
    });
    expect(phase).toBe("content");
  });

  /**
   * Exhaustive enumeration: all 3 × 2 × 2 = 12 input combinations
   * yield exactly one phase following the fixed precedence.
   */
  it("exhaustively tests all 12 input combinations", () => {
    const statuses: DecksStatus[] = ["initial", "ready", "error"];
    const errorFlags = [false, true];
    const emptyFlags = [false, true];

    const results: Record<string, StorePhase[]> = {
      loading: [],
      error: [],
      empty: [],
      content: [],
    };

    for (const status of statuses) {
      for (const hasError of errorFlags) {
        for (const isEmpty of emptyFlags) {
          const phase = resolvePhase({ status, hasError, isEmpty });
          results[phase].push(phase);

          // Verify precedence
          if (status === "initial") {
            expect(phase).toBe("loading");
          } else if (status === "error" || hasError) {
            expect(phase).toBe("error");
          } else if (isEmpty) {
            expect(phase).toBe("empty");
          } else {
            expect(phase).toBe("content");
          }
        }
      }
    }

    // Verify each combination produces exactly one phase (no duplication)
    expect(
      results.loading.length +
        results.error.length +
        results.empty.length +
        results.content.length,
    ).toBe(12);

    // Verify reachability of all phases
    expect(results.loading.length).toBeGreaterThan(0);
    expect(results.error.length).toBeGreaterThan(0);
    expect(results.empty.length).toBeGreaterThan(0);
    expect(results.content.length).toBeGreaterThan(0);
  });
});
