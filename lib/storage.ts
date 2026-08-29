import { deckListSchema, type DeckList } from "@/types";

/**
 * Single persistence seam over `window.localStorage` for the deck list.
 *
 * This module is the only place that touches `localStorage`. It never throws
 * to its callers: reads and writes return discriminated results so the store
 * can branch deterministically and surface errors without crashing a render.
 * All access is guarded for SSR (`typeof window === "undefined"`).
 */

export const DECKS_STORAGE_KEY = "walking-skeleton:decks";

export type LoadResult =
  | { ok: true; decks: DeckList }
  | { ok: false; reason: "empty" | "invalid" };

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "quota" | "serialize" };

/**
 * Detect a quota-exceeded error across browsers. Modern browsers throw a
 * `DOMException` named `QuotaExceededError`; some legacy engines use the
 * numeric code `22` (or `1014` in Firefox).
 */
function isQuotaExceededError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014
    );
  }

  if (error && typeof error === "object" && "name" in error) {
    return (error as { name?: unknown }).name === "QuotaExceededError";
  }

  return false;
}

/**
 * Read and validate the persisted deck list.
 *
 * - `{ ok: true, decks }` when the key exists and parses+validates.
 * - `{ ok: false, reason: "empty" }` when the key is missing (or SSR).
 * - `{ ok: false, reason: "invalid" }` when JSON parsing or schema
 *   validation fails.
 *
 * Never throws.
 */
export function loadDecks(): LoadResult {
  if (typeof window === "undefined") {
    return { ok: false, reason: "empty" };
  }

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(DECKS_STORAGE_KEY);
  } catch {
    // Storage unavailable (e.g. disabled/blocked). Treat as no data.
    return { ok: false, reason: "empty" };
  }

  if (raw === null) {
    return { ok: false, reason: "empty" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const result = deckListSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, decks: result.data };
}

/**
 * Serialize and write the deck list.
 *
 * - `{ ok: false, reason: "serialize" }` when serialization fails.
 * - `{ ok: false, reason: "quota" }` on `QuotaExceededError`.
 * - `{ ok: false, reason: "unavailable" }` on any other write/availability
 *   failure (including SSR).
 * - `{ ok: true }` otherwise.
 *
 * Never throws.
 */
export function saveDecks(decks: DeckList): SaveResult {
  if (typeof window === "undefined") {
    return { ok: false, reason: "unavailable" };
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(decks);
  } catch {
    return { ok: false, reason: "serialize" };
  }

  try {
    window.localStorage.setItem(DECKS_STORAGE_KEY, serialized);
    return { ok: true };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return { ok: false, reason: "quota" };
    }
    return { ok: false, reason: "unavailable" };
  }
}
