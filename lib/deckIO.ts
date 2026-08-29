import { deckSchema, type Deck } from "@/types";

/**
 * Result type for parsing operations.
 * Discriminated union that distinguishes success from failure.
 */
export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Serializes a Deck to a human-readable JSON string.
 *
 * @param deck The Deck to serialize
 * @returns JSON string with 2-space indentation
 */
export function serializeDeck(deck: Deck): string {
  return JSON.stringify(deck, null, 2);
}

/**
 * Parses and validates a JSON string to a Deck.
 *
 * Distinguishes between parse errors (unparseable JSON) and validation errors
 * (JSON that doesn't match the Deck schema). Returns a discriminated union
 * result type to avoid throwing.
 *
 * @param jsonString The JSON string to parse
 * @returns Success result with the validated Deck, or failure result with error message
 */
export function parseDeck(jsonString: string): ParseResult<Deck> {
  // Attempt to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      ok: false,
      error: "The file is not valid JSON. Please check the file and try again.",
    };
  }

  // Validate against deckSchema
  const result = deckSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error:
        "The file does not match the expected deck format. Please export a deck and try again.",
    };
  }

  return {
    ok: true,
    data: result.data,
  };
}
