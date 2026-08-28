/**
 * Shared fast-check arbitraries (generators) for property-based tests.
 *
 * These are deliberately bounded well within the schema's hard limits
 * (name 1-100, description 0-500, cards 0-1000, deck-list 0-10,000) so the
 * suite stays fast while still exercising the meaningful input ranges.
 *
 * Reused across property tests (e.g. schema round-trip 8.x, store 5.x,
 * persistence round-trip). Import via the `@/test/arbitraries` alias.
 */
import fc from "fast-check";
import type { Card, Deck, DeckFormInput } from "@/types";
import { NAV_ITEMS } from "@/components/NavLinks";

/** A non-empty id string (satisfies `z.string().min(1)`). */
export const arbId: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.length >= 1);

/** A valid deck name: 1-100 characters. */
export const arbDeckName: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 100,
});

/**
 * An optional description. Sometimes absent (undefined), sometimes present
 * with 0-500 characters (including the empty string), matching the schema's
 * `.max(500).optional()`.
 */
export const arbDescription: fc.Arbitrary<string | undefined> = fc.option(
  fc.string({ maxLength: 500 }),
  { nil: undefined },
);

/**
 * A valid `createdAt`: an ISO 8601 timestamp string that parses as a real date
 * and stays within the schema's 1-30 character bound. Built by mapping a
 * bounded `fc.date()` through `.toISOString()` (which yields 24-char strings
 * such as `2023-05-01T12:34:56.789Z`). The date range is clamped to valid
 * millisecond values so `toISOString()` never throws on an invalid date.
 */
export const arbCreatedAt: fc.Arbitrary<string> = fc
  .date({
    min: new Date("1970-01-01T00:00:00.000Z"),
    max: new Date("2100-12-31T23:59:59.999Z"),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString());

/**
 * A valid card front: 1-5000 characters, non-empty after trimming.
 * Built from a bounded core to ensure min length 1 after trimming.
 */
export const arbCardFront: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 5000 })
  .filter((s) => s.trim().length >= 1 && s.trim().length <= 5000);

/**
 * A valid card back: 1-5000 characters, non-empty after trimming.
 * Built from a bounded core to ensure min length 1 after trimming.
 */
export const arbCardBack: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 5000 })
  .filter((s) => s.trim().length >= 1 && s.trim().length <= 5000);

/**
 * A valid leitner box number: an integer from 1 to 8 (representing a standard
 * 8-box spaced repetition system). Matches the `box` field constraint in the
 * card schema.
 */
export const arbBox: fc.Arbitrary<number> = fc.integer({ min: 1, max: 8 });

/**
 * A valid or null `lastReviewed`: either `null` (never reviewed) or a valid
 * ISO timestamp. Matches the `lastReviewed` field in the card schema which is
 * nullable (`.nullable()`).
 */
export const arbLastReviewed: fc.Arbitrary<string | null> = fc.option(
  arbCreatedAt,
  { nil: null },
);

/** A single valid card: `{ id, front, back, box, lastReviewed, createdAt }`. */
export const arbCard: fc.Arbitrary<Card> = fc.record({
  id: arbId,
  front: arbCardFront,
  back: arbCardBack,
  box: arbBox,
  lastReviewed: arbLastReviewed,
  createdAt: arbCreatedAt,
});

/**
 * A bounded list of cards. The schema allows up to 1000; we cap at 20 for
 * speed while still covering the empty case and typical sizes.
 */
export const arbCards: fc.Arbitrary<Card[]> = fc.array(arbCard, {
  minLength: 0,
  maxLength: 20,
});

/**
 * A valid `Deck` with bounded id/name/description/cards. When the generated
 * description is undefined the property is omitted entirely so the value
 * matches the inferred `Deck` shape (optional, not `| undefined` present).
 */
export const arbDeck: fc.Arbitrary<Deck> = fc
  .record({
    id: arbId,
    name: arbDeckName,
    description: arbDescription,
    cards: arbCards,
    createdAt: arbCreatedAt,
  })
  .map(({ id, name, description, cards, createdAt }) => {
    const deck: Deck = { id, name, cards, createdAt };
    if (description !== undefined) {
      deck.description = description;
    }
    return deck;
  });

/** A bounded list of valid decks (0-10 for speed). */
export const arbDeckList: fc.Arbitrary<Deck[]> = fc.array(arbDeck, {
  minLength: 0,
  maxLength: 10,
});

/**
 * A large deck list arbitrary that exercises sizes near the schema's 10,000
 * deck-list upper bound (Requirement 3.7) for the persistence round-trip.
 *
 * Generating tens of thousands of fully-random decks per run would make the
 * property suite slow, so this keeps each deck minimal (a bare id, a
 * single-character name, no description, no cards, a fixed valid `createdAt`)
 * while still driving the list length up to and including 10,000. This
 * validates that a maximal deck list survives a save/load round-trip without
 * truncation or reordering.
 */
export const arbLargeDeckList: fc.Arbitrary<Deck[]> = fc
  .integer({ min: 9_990, max: 10_000 })
  .map((length) =>
    Array.from({ length }, (_unused, index): Deck => ({
      id: `deck-${index}`,
      name: "x",
      cards: [],
      createdAt: "2024-01-01T00:00:00.000Z",
    })),
  );

/**
 * A valid `DeckFormInput`: a name of 1-100 characters and an optional
 * description of at most 500 characters. Used by the store validation and
 * create/update property tests (Property 1, Property 2, Property 5).
 *
 * The generated name is guaranteed to be non-empty *after* trimming so it
 * satisfies `deckFormSchema` (which trims then requires min length 1). We build
 * it from a bounded core plus a padding character so the trimmed length stays
 * within 1-100.
 */
export const arbDeckFormInput: fc.Arbitrary<DeckFormInput> = fc
  .record({
    name: fc
      .string({ minLength: 1, maxLength: 100 })
      // Ensure at least one non-whitespace char so the trimmed name is valid.
      .filter((s) => s.trim().length >= 1 && s.trim().length <= 100),
    description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  })
  .map(({ name, description }) => {
    const input: DeckFormInput = { name };
    if (description !== undefined) {
      input.description = description;
    }
    return input;
  });

/**
 * A valid `CardFormInput`: front and back text fields, each 1-5000 characters
 * and valid after trimming. Used for card creation and edit property tests
 * (Requirements 7.2, 7.7).
 */
export const arbCardFormInput: fc.Arbitrary<
  { front: string; back: string }
> = fc.record({
  front: arbCardFront,
  back: arbCardBack,
});

/**
 * An invalid name that is empty or whitespace-only. After trimming these
 * collapse to the empty string, so `deckFormSchema` rejects them with the
 * "Name is required" message (Requirements 1.8, 2.9, 4.3).
 */
export const arbWhitespaceName: fc.Arbitrary<string> = fc.oneof(
  fc.constant(""),
  // Whitespace-only strings (spaces, tabs, newlines) of length 1-20.
  fc
    .array(fc.constantFrom(" ", "\t", "\n", "\r", "\f", "\v"), {
      minLength: 1,
      maxLength: 20,
    })
    .map((chars) => chars.join("")),
);

/**
 * An invalid name that exceeds 100 characters (after trimming). Built from a
 * non-whitespace base so the failure is the length bound, not the trim/min
 * rule (Requirements 4.4).
 */
export const arbOverlongName: fc.Arbitrary<string> = fc
  .integer({ min: 101, max: 300 })
  .map((length) => "a".repeat(length));

/**
 * An invalid description that exceeds 500 characters, triggering the
 * "Description exceeds 500 characters" rejection (Requirements 4.5).
 */
export const arbOverlongDescription: fc.Arbitrary<string> = fc
  .integer({ min: 501, max: 800 })
  .map((length) => "a".repeat(length));

/**
 * An invalid `createdAt` for Property 6's rejection branch: empty,
 * whitespace-only, or a non-ISO string that `Date.parse` cannot parse
 * (Requirements 6.2, 6.3). Values that could incidentally parse as a date are
 * filtered out so every sample is genuinely rejected by the schema.
 */
export const arbInvalidCreatedAt: fc.Arbitrary<string> = fc
  .oneof(
    fc.constant(""),
    fc
      .array(fc.constantFrom(" ", "\t", "\n"), { minLength: 1, maxLength: 10 })
      .map((chars) => chars.join("")),
    fc.string({ maxLength: 30 }),
  )
  .filter((s) => Number.isNaN(Date.parse(s)));

/**
 * An invalid deck id for Property 6's rejection branch: empty or longer than
 * the 100-character bound (Requirements 6.5, 6.6).
 */
export const arbInvalidId: fc.Arbitrary<string> = fc.oneof(
  fc.constant(""),
  fc.integer({ min: 101, max: 300 }).map((length) => "a".repeat(length)),
);

/**
 * A pathname arbitrary for the active-navigation property (Property 13).
 *
 * It mixes two kinds of values so the property covers both branches of the
 * active-state rule:
 *  - exact `NAV_ITEMS` hrefs, so a destination should be marked active; and
 *  - arbitrary paths that are guaranteed not to equal any nav href, so no
 *    destination should be marked active.
 *
 * Non-matching paths are always prefixed with `/` (a realistic pathname) and
 * filtered to exclude any current nav href.
 */
const NAV_HREFS: readonly string[] = NAV_ITEMS.map((item) => item.href);

const arbNavHref: fc.Arbitrary<string> = fc.constantFrom(...NAV_HREFS);

const arbNonMatchingPath: fc.Arbitrary<string> = fc
  .string({ maxLength: 40 })
  .map((segment) => `/${segment}`)
  .filter((path) => !NAV_HREFS.includes(path));

export const arbPathname: fc.Arbitrary<string> = fc.oneof(
  arbNavHref,
  arbNonMatchingPath,
);

/**
 * Garbage contents for the persisted deck-list key, for Property 6.
 *
 * Covers the three failure shapes that `loadDecks` must survive without
 * throwing:
 *  - arbitrary strings, most of which are not valid JSON at all;
 *  - JSON that parses fine but is structurally invalid against
 *    `deckListSchema` (wrong top-level type, or an array of objects missing
 *    required fields / violating constraints).
 *
 * Note: an arbitrary string *could* incidentally be valid JSON that also
 * satisfies the schema (e.g. the literal string "[]"). Property 6 tests must
 * therefore assert on the observed shape rather than assuming every sample is
 * unparseable — see the test for how the "invalid" indication is checked only
 * when the stored data was actually present-but-invalid.
 */
export const arbGarbageStorage: fc.Arbitrary<string> = fc.oneof(
  // Free-form strings: overwhelmingly non-JSON text.
  fc.string({ maxLength: 200 }),
  // Structurally-invalid JSON: valid JSON whose shape fails the schema.
  fc
    .oneof(
      // Top-level is not an array of decks.
      fc.constant<unknown>(null),
      fc.boolean(),
      fc.integer(),
      fc.double({ noNaN: true }),
      fc.string({ maxLength: 50 }),
      fc.record({ nope: fc.string() }),
      // An array, but of the wrong element shape.
      fc.array(fc.integer(), { maxLength: 5 }),
      fc.array(fc.string(), { maxLength: 5 }),
      // An array of objects that look deck-ish but violate constraints:
      // empty id, empty name, or missing required fields.
      fc.array(
        fc.record({
          id: fc.constant(""),
          name: fc.constant(""),
        }),
        { minLength: 1, maxLength: 3 },
      ),
      fc.array(fc.record({ name: fc.string() }), { minLength: 1, maxLength: 3 }),
    )
    .map((value) => JSON.stringify(value)),
);

/**
 * An invalid card front/back that is empty or whitespace-only. After trimming
 * these collapse to the empty string, so `cardFormSchema` rejects them with
 * the "Front is required" or "Back is required" message (Requirements 7.2, 7.7).
 */
export const arbEmptyOrWhitespace: fc.Arbitrary<string> = fc.oneof(
  fc.constant(""),
  // Whitespace-only strings (spaces, tabs, newlines) of length 1-20.
  fc
    .array(fc.constantFrom(" ", "\t", "\n", "\r", "\f", "\v"), {
      minLength: 1,
      maxLength: 20,
    })
    .map((chars) => chars.join("")),
);

/**
 * An invalid card front/back that exceeds 5000 characters, triggering the
 * "Front exceeds 5000 characters" or "Back exceeds 5000 characters"
 * rejection (Requirements 7.2, 7.7).
 */
export const arbOverlongText: fc.Arbitrary<string> = fc
  .integer({ min: 5001, max: 8000 })
  .map((length) => "a".repeat(length));
