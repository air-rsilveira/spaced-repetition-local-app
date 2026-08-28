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
import type { Card, Deck } from "@/types";
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

/** A single valid card: `{ id: non-empty string }`. */
export const arbCard: fc.Arbitrary<Card> = fc.record({ id: arbId });

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
  })
  .map(({ id, name, description, cards }) => {
    const deck: Deck = { id, name, cards };
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
 * single-character name, no description, no cards) while still driving the
 * list length up to and including 10,000. This validates that a maximal deck
 * list survives a save/load round-trip without truncation or reordering.
 */
export const arbLargeDeckList: fc.Arbitrary<Deck[]> = fc
  .integer({ min: 9_990, max: 10_000 })
  .map((length) =>
    Array.from({ length }, (_unused, index): Deck => ({
      id: `deck-${index}`,
      name: "x",
      cards: [],
    })),
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
