import { describe, expect, it, vi } from "vitest";
import { render, renderHook, waitFor, type RenderHookOptions } from "@testing-library/react";
import type { ReactNode } from "react";

import { DecksProvider, useDecks } from "@/contexts/DecksContext";
import { DECKS_STORAGE_KEY } from "@/lib/storage";
import { mockDeckList } from "@/mocks";

/**
 * Example (non-property) tests for the Decks store's observable behavior and
 * hydration guard. These complement the property-based suites with concrete,
 * named scenarios:
 *
 *  - 2.2 Empty list is exposed on the provider's first render.
 *  - 2.8 `useDecks` throws when used outside a `DecksProvider`.
 *  - 4.3 No React hydration-mismatch warning is emitted on the first render.
 *  - 4.4 With seeded localStorage, the exposed list updates to the persisted
 *        data after the mount effect runs (status becomes "ready").
 *
 * `localStorage` is cleared before/after every test and spies are restored by
 * the global setup (`vitest.setup.ts`), so each test starts from a clean slate.
 */

function wrapper({ children }: { children: ReactNode }) {
  return <DecksProvider>{children}</DecksProvider>;
}

const wrappedOptions: RenderHookOptions<unknown> = { wrapper };

describe("Decks store behavior and hydration", () => {
  // Requirement 2.2: empty list pre-hydration.
  it("exposes an empty deck list on the provider's first render (2.2)", () => {
    // No seeded data: the deterministic seed is the empty list.
    const { result } = renderHook(() => useDecks(), wrappedOptions);

    expect(result.current.decks).toEqual([]);
  });

  // Requirement 2.8: using the hook outside its provider is a programming
  // error and must throw a descriptive error.
  it("throws when useDecks is called outside a DecksProvider (2.8)", () => {
    // React logs the thrown render error to console.error; silence that noise
    // so the expected throw does not pollute the test output.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      expect(() => renderHook(() => useDecks())).toThrow(
        "useDecks must be used within a DecksProvider",
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  // Requirement 4.3: the first render must not emit a hydration-mismatch
  // warning. The deterministic empty seed keeps the first client render
  // identical to the server render.
  it("emits no hydration-mismatch warning on first render (4.3)", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <DecksProvider>
        <div>child</div>
      </DecksProvider>,
    );

    // Assert that no console.error call looks like a React hydration warning.
    const hydrationWarnings = errorSpy.mock.calls.filter((args) =>
      args.some(
        (arg) =>
          typeof arg === "string" &&
          (arg.includes("hydrat") ||
            arg.includes("did not match") ||
            arg.includes("server rendered HTML")),
      ),
    );

    expect(hydrationWarnings).toEqual([]);
  });

  // Requirement 4.4: after the mount effect reads seeded localStorage, the
  // exposed list reflects the persisted data and status becomes "ready".
  it("updates the exposed list to persisted data after mount (4.4)", async () => {
    // Seed valid persisted data before the provider mounts.
    window.localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(mockDeckList));

    const { result } = renderHook(() => useDecks(), wrappedOptions);

    // The mount effect asynchronously reconciles state to the persisted data.
    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(result.current.decks).toEqual(mockDeckList);
    expect(result.current.error).toBeNull();
  });
});
