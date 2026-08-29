/**
 * Status-gating helper for determining the presentation phase based on store state.
 *
 * This pure helper maps the store's loading/error/ready status and content
 * availability into a presentation phase (loading, error, empty, or content)
 * used throughout the UI to render appropriate states.
 *
 * Follows fixed precedence: loading → error → empty → content
 */

import type { DecksStatus } from "./DecksContext";

/**
 * Presentation phase determined by the store status and content availability.
 *
 * - `"loading"`: Store is initializing (status === "initial")
 * - `"error"`: Store encountered an error or caller flagged an error
 * - `"empty"`: Store is ready but has no content to display
 * - `"content"`: Store is ready and has content to display
 */
export type StorePhase = "loading" | "error" | "empty" | "content";

/**
 * Input descriptor for phase resolution.
 *
 * @param status - Store status: "initial" | "ready" | "error"
 * @param hasError - Whether an error is present or should be treated as present
 * @param isEmpty - Whether content is empty (decks list is zero-length, etc.)
 */
export interface PhaseInput {
  status: DecksStatus;
  hasError: boolean;
  isEmpty: boolean;
}

/**
 * Resolves a store state into a presentation phase following fixed precedence.
 *
 * Precedence: loading → error → empty → content
 *
 * @param input - Store status, error flag, and emptiness flag
 * @returns The resolved presentation phase
 *
 * @example
 * // Loading state (store initializing)
 * resolvePhase({ status: "initial", hasError: false, isEmpty: false })
 * // → "loading"
 *
 * @example
 * // Error state (precedence before empty/content)
 * resolvePhase({ status: "ready", hasError: true, isEmpty: false })
 * // → "error"
 *
 * @example
 * // Empty state (ready but no content)
 * resolvePhase({ status: "ready", hasError: false, isEmpty: true })
 * // → "empty"
 *
 * @example
 * // Content state (ready with content)
 * resolvePhase({ status: "ready", hasError: false, isEmpty: false })
 * // → "content"
 */
export function resolvePhase({ status, hasError, isEmpty }: PhaseInput): StorePhase {
  // Precedence 1: loading (status === "initial")
  if (status === "initial") return "loading";

  // Precedence 2: error (status === "error" or caller flagged hasError)
  if (status === "error" || hasError) return "error";

  // Precedence 3: empty (status is "ready" but no content)
  if (isEmpty) return "empty";

  // Precedence 4: content (status is "ready" with content)
  return "content";
}
