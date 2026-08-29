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
import { promoteCard, resetCard } from "@/lib/leitner";
import { deckFormSchema, cardFormSchema } from "@/types";
import type { Card, Deck, DeckList } from "@/types";
import type { z } from "zod";

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

/** Fields that a `validation` error can flag on the deck form. */
export type DeckFormField = "name" | "description";

/** Fields that a `validation` error can flag on the card form. */
export type CardFormField = "front" | "back";

/** Union of all form field types (deck + card). */
export type FormField = DeckFormField | CardFormField;

export type DecksError =
  | { code: "name-required"; message: string }
  | { code: "duplicate-id"; message: string }
  | { code: "persistence"; message: string }
  | { code: "invalid-data"; message: string }
  | {
      code: "validation";
      message: string;
      fields: Partial<Record<FormField, string>>;
    }
  | { code: "not-found"; message: string };

export type AddDeckResult =
  | { ok: true; deck: Deck }
  | { ok: false; error: DecksError };

export interface UpdateDeckInput {
  id: string;
  name: string;
  description?: string;
}

export type UpdateDeckResult =
  | { ok: true; deck: Deck }
  | { ok: false; error: DecksError };

export type DeleteDeckResult =
  | { ok: true; id: string }
  | { ok: false; error: DecksError };

export interface AddCardInput {
  deckId: string;
  front: string;
  back: string;
}

export interface UpdateCardInput {
  deckId: string;
  cardId: string;
  front: string;
  back: string;
}

export type AddCardResult =
  | { ok: true; card: Card }
  | { ok: false; error: DecksError };

export type UpdateCardResult =
  | { ok: true; card: Card }
  | { ok: false; error: DecksError };

export type DeleteCardResult =
  | { ok: true; deckId: string; cardId: string }
  | { ok: false; error: DecksError };

export interface DecksContextValue {
  /** Deterministic `[]` until the mount effect runs. */
  decks: DeckList;
  /** `"initial"` pre-hydration; `"ready"` after load; `"error"` on read failure. */
  status: DecksStatus;
  /** Last surfaced error, or `null`. */
  error: DecksError | null;
  addDeck: (input: AddDeckInput) => AddDeckResult;
  updateDeck: (input: UpdateDeckInput) => UpdateDeckResult;
  deleteDeck: (id: string) => DeleteDeckResult;
  addCard: (input: AddCardInput) => AddCardResult;
  updateCard: (input: UpdateCardInput) => UpdateCardResult;
  deleteCard: (deckId: string, cardId: string) => DeleteCardResult;
  gradeCardCorrect: (deckId: string, cardId: string, today: Date) => UpdateCardResult;
  gradeCardIncorrect: (deckId: string, cardId: string, today: Date) => UpdateCardResult;
}

/**
 * Map a Zod validation failure to a `{ code: "validation", fields }` error,
 * collecting a per-field message keyed by the offending field so forms can
 * render each message inline (Requirements 4.7, 4.8, 6.7, 6.8).
 * Supports validation errors from both deck forms and card forms.
 */
function toValidationError(
  error: z.ZodError<
    { name: string; description?: string } | { front: string; back: string }
  >,
): Extract<DecksError, { code: "validation" }> {
  const fields: Partial<Record<FormField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      field === "name" ||
      field === "description" ||
      field === "front" ||
      field === "back"
    ) {
      // Keep the first message per field.
      fields[field] ??= issue.message;
    }
  }
  return {
    code: "validation",
    message: "Input is invalid.",
    fields,
  };
}

const DecksContext = createContext<DecksContextValue | undefined>(undefined);

interface DecksProviderProps {
  children: ReactNode;
  initialDecks?: DeckList;
}

export function DecksProvider({ children, initialDecks }: DecksProviderProps) {
  // Deterministic empty seed: identical on the server and the first client
  // render. No localStorage read happens during render.
  const [decks, setDecks] = useState<DeckList>(initialDecks ?? []);
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
      const parsed = deckFormSchema.safeParse({
        name: input.name,
        description: input.description,
      });
      if (!parsed.success) {
        const error = toValidationError(parsed.error);
        setError(error);
        return { ok: false, error }; // list unchanged (Requirements 1.8, 4.7, 4.8)
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

      const description = parsed.data.description?.trim();
      const deck: Deck = {
        id,
        name: parsed.data.name, // already trimmed by schema
        cards: input.cards ?? [],
        createdAt: new Date().toISOString(),
        ...(description ? { description } : {}),
      };

      setError(null);
      setDecks((prev) => [...prev, deck]);

      return { ok: true, deck };
    },
    [decks],
  );

  const updateDeck = useCallback(
    (input: UpdateDeckInput): UpdateDeckResult => {
      const parsed = deckFormSchema.safeParse({
        name: input.name,
        description: input.description,
      });
      if (!parsed.success) {
        const error = toValidationError(parsed.error);
        setError(error);
        return { ok: false, error };
      }

      const index = decks.findIndex((deck) => deck.id === input.id);
      if (index === -1) {
        const error: DecksError = {
          code: "not-found",
          message: `No deck with id "${input.id}".`,
        };
        setError(error);
        return { ok: false, error }; // list unchanged (Requirement 2.8)
      }

      const description = parsed.data.description?.trim();
      const existing = decks[index];
      const updated: Deck = {
        ...existing, // preserves id, createdAt, cards
        name: parsed.data.name, // already trimmed by schema
        ...(description ? { description } : { description: undefined }),
      };

      setError(null);
      setDecks((prev) =>
        prev.map((deck) => (deck.id === input.id ? updated : deck)),
      );
      return { ok: true, deck: updated };
    },
    [decks],
  );

  const deleteDeck = useCallback(
    (id: string): DeleteDeckResult => {
      if (!decks.some((deck) => deck.id === id)) {
        const error: DecksError = {
          code: "not-found",
          message: `No deck with id "${id}".`,
        };
        return { ok: false, error }; // no removal, list unchanged (Requirement 3.9)
      }
      setError(null);
      setDecks((prev) => prev.filter((deck) => deck.id !== id));
      return { ok: true, id };
    },
    [decks],
  );

  const addCard = useCallback(
    (input: AddCardInput): AddCardResult => {
      const parsed = cardFormSchema.safeParse({
        front: input.front,
        back: input.back,
      });
      if (!parsed.success) {
        const error = toValidationError(parsed.error);
        setError(error);
        return { ok: false, error };
      }

      const deckIndex = decks.findIndex((deck) => deck.id === input.deckId);
      if (deckIndex === -1) {
        const error: DecksError = {
          code: "not-found",
          message: `No deck with id "${input.deckId}".`,
        };
        setError(error);
        return { ok: false, error };
      }

      const cardId = crypto.randomUUID();
      const card: Card = {
        id: cardId,
        front: parsed.data.front,
        back: parsed.data.back,
        box: 1,
        lastReviewed: null,
        createdAt: new Date().toISOString(),
      };

      setError(null);
      setDecks((prev) => {
        const updated = [...prev];
        updated[deckIndex] = {
          ...updated[deckIndex],
          cards: [...updated[deckIndex].cards, card],
        };
        return updated;
      });

      return { ok: true, card };
    },
    [decks],
  );

  const updateCard = useCallback(
    (input: UpdateCardInput): UpdateCardResult => {
      const parsed = cardFormSchema.safeParse({
        front: input.front,
        back: input.back,
      });
      if (!parsed.success) {
        const error = toValidationError(parsed.error);
        setError(error);
        return { ok: false, error };
      }

      const deckIndex = decks.findIndex((deck) => deck.id === input.deckId);
      if (deckIndex === -1) {
        const error: DecksError = {
          code: "not-found",
          message: `No deck with id "${input.deckId}".`,
        };
        setError(error);
        return { ok: false, error };
      }

      const deck = decks[deckIndex];
      const cardIndex = deck.cards.findIndex((card) => card.id === input.cardId);
      if (cardIndex === -1) {
        const error: DecksError = {
          code: "not-found",
          message: `No card with id "${input.cardId}".`,
        };
        setError(error);
        return { ok: false, error };
      }

      const existing = deck.cards[cardIndex];
      const updated: Card = {
        ...existing,
        front: parsed.data.front,
        back: parsed.data.back,
      };

      setError(null);
      setDecks((prev) => {
        const newDecks = [...prev];
        newDecks[deckIndex] = {
          ...newDecks[deckIndex],
          cards: newDecks[deckIndex].cards.map((card) =>
            card.id === input.cardId ? updated : card,
          ),
        };
        return newDecks;
      });

      return { ok: true, card: updated };
    },
    [decks],
  );

  const deleteCard = useCallback(
    (deckId: string, cardId: string): DeleteCardResult => {
      const deckIndex = decks.findIndex((deck) => deck.id === deckId);
      if (deckIndex === -1) {
        const error: DecksError = {
          code: "not-found",
          message: `No deck with id "${deckId}".`,
        };
        return { ok: false, error };
      }

      const deck = decks[deckIndex];
      if (!deck.cards.some((card) => card.id === cardId)) {
        const error: DecksError = {
          code: "not-found",
          message: `No card with id "${cardId}".`,
        };
        return { ok: false, error };
      }

      setError(null);
      setDecks((prev) => {
        const newDecks = [...prev];
        newDecks[deckIndex] = {
          ...newDecks[deckIndex],
          cards: newDecks[deckIndex].cards.filter((card) => card.id !== cardId),
        };
        return newDecks;
      });

      return { ok: true, deckId, cardId };
    },
    [decks],
  );

  const gradeCardCorrect = useCallback(
    (deckId: string, cardId: string, today: Date): UpdateCardResult => {
      const deckIndex = decks.findIndex((deck) => deck.id === deckId);
      if (deckIndex === -1) {
        const error: DecksError = {
          code: "not-found",
          message: `No deck with id "${deckId}".`,
        };
        setError(error);
        return { ok: false, error };
      }

      const deck = decks[deckIndex];
      const cardIndex = deck.cards.findIndex((card) => card.id === cardId);
      if (cardIndex === -1) {
        const error: DecksError = {
          code: "not-found",
          message: `No card with id "${cardId}".`,
        };
        setError(error);
        return { ok: false, error };
      }

      const existing = deck.cards[cardIndex];
      const promoted = promoteCard(existing, today);

      const updated: Card = {
        ...promoted,
      };

      setError(null);
      setDecks((prev) => {
        const newDecks = [...prev];
        newDecks[deckIndex] = {
          ...newDecks[deckIndex],
          cards: newDecks[deckIndex].cards.map((card) =>
            card.id === cardId ? updated : card,
          ),
        };
        return newDecks;
      });

      return { ok: true, card: updated };
    },
    [decks],
  );

  const gradeCardIncorrect = useCallback(
    (deckId: string, cardId: string, today: Date): UpdateCardResult => {
      const deckIndex = decks.findIndex((deck) => deck.id === deckId);
      if (deckIndex === -1) {
        const error: DecksError = {
          code: "not-found",
          message: `No deck with id "${deckId}".`,
        };
        setError(error);
        return { ok: false, error };
      }

      const deck = decks[deckIndex];
      const cardIndex = deck.cards.findIndex((card) => card.id === cardId);
      if (cardIndex === -1) {
        const error: DecksError = {
          code: "not-found",
          message: `No card with id "${cardId}".`,
        };
        setError(error);
        return { ok: false, error };
      }

      const existing = deck.cards[cardIndex];
      const reset = resetCard(existing, today);

      const updated: Card = {
        ...reset,
      };

      setError(null);
      setDecks((prev) => {
        const newDecks = [...prev];
        newDecks[deckIndex] = {
          ...newDecks[deckIndex],
          cards: newDecks[deckIndex].cards.map((card) =>
            card.id === cardId ? updated : card,
          ),
        };
        return newDecks;
      });

      return { ok: true, card: updated };
    },
    [decks],
  );

  const value: DecksContextValue = {
    decks,
    status,
    error,
    addDeck,
    updateDeck,
    deleteDeck,
    addCard,
    updateCard,
    deleteCard,
    gradeCardCorrect,
    gradeCardIncorrect,
  };

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
