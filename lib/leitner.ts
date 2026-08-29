import type { Card, Deck } from "@/types";

/**
 * Leitner spaced repetition system implementation.
 *
 * Pure functions for calculating review intervals, checking if cards are due,
 * filtering due cards, and promoting/resetting cards based on grading.
 */

/**
 * Get the review interval (in days) for a Leitner box.
 *
 * Box 1 → 1 day, Box 2 → 2 days, Box 3 → 4 days, Box 4 → 8 days, Box 5 → 16 days
 */
export function getInterval(box: number): number {
  if (box < 1 || box > 5) {
    throw new Error("Box must be between 1 and 5");
  }
  const intervals = [1, 2, 4, 8, 16];
  return intervals[box - 1];
}

/**
 * Check if a card is due for review on a given date.
 *
 * New cards (lastReviewed = null) are always due.
 * Cards with a lastReviewed date are due when the current date is >= lastReviewed + interval.
 */
export function isDue(card: Card, today: Date): boolean {
  if (card.lastReviewed === null) {
    return true;
  }

  const lastReviewedDate = new Date(card.lastReviewed);
  const intervalDays = getInterval(card.box);

  // Calculate due date by adding interval days to lastReviewed
  const dueDate = new Date(lastReviewedDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + intervalDays);

  // Reset time to midnight for date-only comparison (in UTC)
  dueDate.setUTCHours(0, 0, 0, 0);
  const todayMidnight = new Date(today);
  todayMidnight.setUTCHours(0, 0, 0, 0);

  return todayMidnight >= dueDate;
}

/**
 * Get all cards from a deck that are due for review on a given date.
 *
 * Returns a new array containing only the due cards. The original deck is not modified.
 */
export function getDueCards(deck: Deck, today: Date): Card[] {
  return deck.cards.filter((card) => isDue(card, today));
}

/**
 * Promote a card to the next box after a correct answer.
 *
 * Increments the box number by 1, capped at 5. Sets lastReviewed to today.
 * Returns a new card object without modifying the original.
 */
export function promoteCard(card: Card, today: Date): Card {
  const newBox = Math.min(card.box + 1, 5);
  return {
    ...card,
    box: newBox,
    lastReviewed: today.toISOString(),
  };
}

/**
 * Reset a card to box 1 after an incorrect answer.
 *
 * Sets the box to 1 and lastReviewed to today.
 * Returns a new card object without modifying the original.
 */
export function resetCard(card: Card, today: Date): Card {
  return {
    ...card,
    box: 1,
    lastReviewed: today.toISOString(),
  };
}
