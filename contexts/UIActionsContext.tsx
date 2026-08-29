"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Landing-page actions the contextual action bar can trigger.
 *
 * - `onNewDeck` opens the create-deck overlay owned by the Dashboard.
 * - `onUploadDeck` opens the (hidden) import file picker owned by the Dashboard.
 */
export interface LandingActions {
  onNewDeck: () => void;
  onUploadDeck: () => void;
}

/**
 * Deck-page actions the contextual action bar can trigger, plus the deck's
 * display identity so the bar can render the deck name as static text.
 *
 * - `onAddCard` opens the create-card overlay owned by the deck page.
 * - `onStudyHref` is the review route the "Study" control navigates to.
 */
export interface DeckActions {
  deckId: string;
  deckName: string;
  onAddCard: () => void;
  onStudyHref: string;
}

/**
 * The currently registered actions, discriminated by `kind`. `null` means no
 * page has registered actions for the current route, so the bar renders nothing.
 */
export type UIActionsRegistration =
  | { kind: "landing"; actions: LandingActions }
  | { kind: "deck"; actions: DeckActions }
  | null;

export interface UIActionsContextValue {
  /** The current registration the contextual action bar renders from. */
  registration: UIActionsRegistration;
  /** Register the landing-page actions (replaces any prior registration). */
  registerLandingActions: (actions: LandingActions) => void;
  /** Register the deck-page actions (replaces any prior registration). */
  registerDeckActions: (actions: DeckActions) => void;
  /** Clear the registration (call on page unmount / route change). */
  clear: () => void;
}

const UIActionsContext = createContext<UIActionsContextValue | undefined>(
  undefined,
);

/**
 * UIActionsProvider — holds the intent registered by the active page so the
 * layout-level `ContextualActionBar` can dispatch it.
 *
 * Client Component: it owns React state and exposes memoized setters. Pages
 * register their actions on mount and clear them on unmount; the bar reads the
 * current `registration` and renders the matching controls. The actual overlays
 * (deck form, card form) remain owned and rendered by the pages themselves.
 */
export function UIActionsProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<UIActionsRegistration>(null);

  const registerLandingActions = useCallback((actions: LandingActions) => {
    setRegistration({ kind: "landing", actions });
  }, []);

  const registerDeckActions = useCallback((actions: DeckActions) => {
    setRegistration({ kind: "deck", actions });
  }, []);

  const clear = useCallback(() => {
    setRegistration(null);
  }, []);

  const value = useMemo<UIActionsContextValue>(
    () => ({
      registration,
      registerLandingActions,
      registerDeckActions,
      clear,
    }),
    [registration, registerLandingActions, registerDeckActions, clear],
  );

  return (
    <UIActionsContext.Provider value={value}>
      {children}
    </UIActionsContext.Provider>
  );
}

/**
 * Read the UI-actions store. Throws when used outside a `UIActionsProvider` —
 * using the hook outside its provider is a programming error, so we fail fast.
 */
export function useUIActions(): UIActionsContextValue {
  const context = useContext(UIActionsContext);
  if (context === undefined) {
    throw new Error("useUIActions must be used within a UIActionsProvider");
  }
  return context;
}
