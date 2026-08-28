"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { loadDecks, saveDecks } from "@/lib/storage";
import type { Card, Deck, DeckList } from "@/types";

// Re-export DeckList so the store's public types are available from this module.
export type { DeckList } from "@/types";

/**
 * Client-side single source of truth for the in-memory deck list.
 *
 * The provider seeds a deterministic empty list on the server and on the first
 * client render (no `localStorage` read during render), then applies persisted
 * data strictly inside a mount effect so hydration stays byte-identical. All
 * persistence is delegated to `@/lib/storage`, which never throws; the provider
 * translates its discriminated results into surfaced `DecksError`s.
 */

export type DecksStatus = "initial" | "ready" | "error";

export interface AddDeckInput {
  name: string;
  description?: string;
  cards?: Card[];
  /** Optional; generated via `crypto.randomUUID()` when absent. */
  id?: string;
}

export type DecksError =
  | { code: "name-required"; message: string }
  | { code: "duplicate-id"; message: string }
  | { code: "persistence"; message: string }
  | { code: "invalid-data"; message: string };

export type AddDeckResult =
  | { ok: true; deck: Deck }
  | { ok: false; error: DecksError };

export interface DecksContextValue {
  /** Deterministic `[]` until the mount effect runs. */
  decks: DeckList;
  /** `"initial"` pre-hydration; `"ready"` after load; `"error"` on read failure. */
  status: DecksStatus;
  /** Last surfaced error, or `null`. */
  error: DecksError | null;
  addDeck: (input: AddDeckInput) => AddDeckResult;
}

const DecksContext = createContext<DecksContextValue | undefined>(undefined);

interface DecksProviderProps {
  children: ReactNode;
}

export function DecksProvider({ children }: DecksProviderProps) {
  // Deterministic empty seed: identical on the server and the first client
  // render. No localStorage read happens during render.
  const [decks, setDecks] = useState<DeckList>([]);
  const [status, setStatus] = useState<DecksStatus>("initial");
  const [error, setError] = useState<DecksError | null>(null);

  // Gates the persistence effect until after the initial load completes, so the
  // empty seed never clobbers persisted data on the first `[decks]` run.
  const loadedRef = useRef(false);

  // Hydration effect: run once on mount, read persisted data, and reconcile.
  // The setState calls here are intentional: this is the hydration guard that
  // synchronizes React state with the external localStorage system strictly
  // after the first client mount, so the server and first client render stay
  // byte-identical (Requirements 4.1-4.5).
  useEffect(() => {
    const result = loadDecks();

    if (result.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard: apply persisted data after mount
      setDecks(result.decks);
      setStatus("ready");
    } else if (result.reason === "empty") {
      setDecks([]);
      setStatus("ready");
    } else {
      // "invalid": keep the empty list, become ready, and surface the error
      // without throwing so the render never crashes.
      setDecks([]);
      setStatus("ready");
      setError({
        code: "invalid-data",
        message: "Stored deck data is invalid and could not be loaded.",
      });
    }

    loadedRef.current = true;
  }, []);

  // Persistence effect: write on every deck-list change, gated until after the
  // initial load. On failure, keep the in-memory list and surface an error.
  useEffect(() => {
    if (!loadedRef.current) {
      return;
    }

    const result = saveDecks(decks);
    if (!result.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- surface a persistence failure after syncing to localStorage
      setError({
        code: "persistence",
        message: "Failed to save decks; your changes may not persist.",
      });
    }
  }, [decks]);

  const addDeck = useCallback(
    (input: AddDeckInput): AddDeckResult => {
      const name = input.name.trim();
      if (name.length === 0) {
        const nameError: DecksError = {
          code: "name-required",
          message: "Deck name is required.",
        };
        setError(nameError);
        return { ok: false, error: nameError };
      }

      const id = input.id ?? crypto.randomUUID();
      if (decks.some((deck) => deck.id === id)) {
        const duplicateError: DecksError = {
          code: "duplicate-id",
          message: `A deck with id "${id}" already exists.`,
        };
        setError(duplicateError);
        return { ok: false, error: duplicateError };
      }

      const description = input.description?.trim();
      const deck: Deck = {
        id,
        name,
        cards: input.cards ?? [],
        ...(description ? { description } : {}),
      };

      setError(null);
      setDecks((prev) => [...prev, deck]);

      return { ok: true, deck };
    },
    [decks],
  );

  const value: DecksContextValue = { decks, status, error, addDeck };

  return (
    <DecksContext.Provider value={value}>{children}</DecksContext.Provider>
  );
}

/**
 * Read the decks store. Throws when used outside a `DecksProvider` — using the
 * hook outside its provider is a programming error, so we fail fast.
 */
export function useDecks(): DecksContextValue {
  const context = useContext(DecksContext);
  if (context === undefined) {
    throw new Error("useDecks must be used within a DecksProvider");
  }
  return context;
}
