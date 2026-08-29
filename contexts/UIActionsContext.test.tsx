import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import {
  UIActionsProvider,
  useUIActions,
  type DeckActions,
  type LandingActions,
} from "@/contexts/UIActionsContext";

describe("UIActionsContext", () => {
  it("throws when useUIActions is used outside a UIActionsProvider", () => {
    // Silence the expected React error boundary console output.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => renderHook(() => useUIActions())).toThrow(
      "useUIActions must be used within a UIActionsProvider",
    );

    consoleError.mockRestore();
  });

  it("starts with a null registration", () => {
    const { result } = renderHook(() => useUIActions(), {
      wrapper: UIActionsProvider,
    });

    expect(result.current.registration).toBeNull();
  });

  it("registers landing actions and exposes them", () => {
    const { result } = renderHook(() => useUIActions(), {
      wrapper: UIActionsProvider,
    });

    const landing: LandingActions = {
      onNewDeck: vi.fn(),
      onUploadDeck: vi.fn(),
    };

    act(() => {
      result.current.registerLandingActions(landing);
    });

    expect(result.current.registration).toEqual({
      kind: "landing",
      actions: landing,
    });
  });

  it("registers deck actions, replacing a prior registration", () => {
    const { result } = renderHook(() => useUIActions(), {
      wrapper: UIActionsProvider,
    });

    act(() => {
      result.current.registerLandingActions({
        onNewDeck: vi.fn(),
        onUploadDeck: vi.fn(),
      });
    });

    const deck: DeckActions = {
      deckId: "deck-1",
      deckName: "Capitals",
      onAddCard: vi.fn(),
      onStudyHref: "/deck/deck-1/review",
    };

    act(() => {
      result.current.registerDeckActions(deck);
    });

    expect(result.current.registration).toEqual({ kind: "deck", actions: deck });
  });

  it("clears the registration back to null", () => {
    const { result } = renderHook(() => useUIActions(), {
      wrapper: UIActionsProvider,
    });

    act(() => {
      result.current.registerLandingActions({
        onNewDeck: vi.fn(),
        onUploadDeck: vi.fn(),
      });
    });

    expect(result.current.registration).not.toBeNull();

    act(() => {
      result.current.clear();
    });

    expect(result.current.registration).toBeNull();
  });
});
