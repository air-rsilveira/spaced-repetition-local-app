"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useDecks } from "@/contexts/DecksContext";
import { getDueCards } from "@/lib/leitner";
import type { Card } from "@/types";
import Markdown from "@/components/Markdown";

interface ReviewPageParams {
  id: string;
}

interface ReviewState {
  currentCardIndex: number;
  cards: Card[];
  revealed: boolean;
  completed: boolean;
  correctCount: number;
  incorrectCount: number;
}

/**
 * ReviewPage — the review session interface for a single deck.
 *
 * Client Component: it consumes the decks store via `useDecks()` and reads the
 * route id via `use(params)`. It displays the deck name in the header and
 * manages the review session state including card display, grading, and completion.
 *
 * Render logic:
 * - `status !== "ready"`: render a loading state (the store is still hydrating).
 * - `status === "ready"` and a deck matches the route id: render the deck name
 *   and review session content.
 * - `status === "ready"` and no deck matches: render a deck-missing state.
 * - When all cards reviewed: render completion summary (Requirement 8.2)
 *
 * Requirements: 1.1, 1.2, 1.3, 2, 3, 4, 5, 6, 7, 8
 */
export default function ReviewPage({
  params,
}: {
  params: Promise<ReviewPageParams>;
}) {
  const { id } = use(params);
  const { decks, status, gradeCardCorrect, gradeCardIncorrect } = useDecks();

  // Initialize review state
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);

  // Initialize review session when deck loads
  if (status === "ready" && reviewState === null && decks.length > 0) {
    const deck = decks.find((d) => d.id === id);
    if (deck) {
      const today = new Date();
      const dueCards = getDueCards(deck, today);

      if (dueCards.length === 0) {
        // No cards due — show "No cards due" message
        setReviewState({
          currentCardIndex: 0,
          cards: [],
          revealed: false,
          completed: false,
          correctCount: 0,
          incorrectCount: 0,
        });
      } else {
        // Initialize with first due card
        setReviewState({
          currentCardIndex: 0,
          cards: dueCards,
          revealed: false,
          completed: false,
          correctCount: 0,
          incorrectCount: 0,
        });
      }
    }
  }

  // Loading state — store is still hydrating (Requirement 1.2 via 1.5 pattern)
  if (status !== "ready") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-aws-gray-900">Loading deck...</h2>
        </div>
      </section>
    );
  }

  const deck = decks.find((d) => d.id === id);

  // Deck not found — render missing state (Requirement 1.2)
  if (!deck) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div
          role="alert"
          className="w-full max-w-md rounded-lg border border-aws-error bg-aws-white p-8 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-aws-gray-900">
            Deck not found
          </h2>
          <p className="mt-2 text-sm text-aws-gray-600">
            The deck you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
        </div>
      </section>
    );
  }

  const today = new Date();

  // No cards due state (Requirement 2.3)
  if (reviewState && reviewState.cards.length === 0) {
    return (
      <>
        <section className="border-b border-aws-gray-200 bg-aws-squid-ink px-6 py-6 sm:py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-aws-white sm:text-3xl">
                {deck.name}
              </h1>
              {deck.description && (
                <p className="mt-1 text-sm text-aws-gray-200">{deck.description}</p>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-md text-center">
            <div className="mb-4 text-5xl">🎉</div>
            <h2 className="text-lg font-semibold text-aws-gray-900">
              No cards due today
            </h2>
            <p className="mt-2 text-sm text-aws-gray-600">
              Great job staying on top of your studies! Come back later for more cards.
            </p>
            <Link
              href={`/deck/${id}`}
              className="mt-6 inline-block rounded-md bg-aws-blue px-4 py-2 text-sm font-medium text-aws-white hover:bg-aws-blue-dark transition-colors"
            >
              Back to deck
            </Link>
          </div>
        </section>
      </>
    );
  }

  // Completion summary (Requirement 8.2)
  if (reviewState && reviewState.completed) {
    const totalReviewed = reviewState.correctCount + reviewState.incorrectCount;

    return (
      <>
        <section className="border-b border-aws-gray-200 bg-aws-squid-ink px-6 py-6 sm:py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-aws-white sm:text-3xl">
                {deck.name}
              </h1>
              {deck.description && (
                <p className="mt-1 text-sm text-aws-gray-200">{deck.description}</p>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-md rounded-lg bg-aws-white p-8 shadow-sm">
            {/* Congratulatory message */}
            <div className="mb-6 text-center">
              <div className="mb-4 text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-aws-success">Review complete!</h2>
              <p className="mt-2 text-sm text-aws-gray-600">
                Great work! You&apos;ve finished reviewing your cards for today.
              </p>
            </div>

            {/* Summary stats */}
            <div className="mb-6 space-y-4 rounded-lg bg-aws-gray-100 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-aws-gray-900">
                  Total cards reviewed:
                </span>
                <span className="text-lg font-semibold text-aws-gray-900">
                  {totalReviewed}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-aws-gray-900">
                  Correct:
                </span>
                <span className="text-lg font-semibold text-aws-success">
                  {reviewState.correctCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-aws-gray-900">
                  Incorrect:
                </span>
                <span className="text-lg font-semibold text-aws-error">
                  {reviewState.incorrectCount}
                </span>
              </div>
            </div>

            {/* Navigation options */}
            <div className="space-y-3">
              <Link
                href={`/deck/${id}`}
                className="block w-full rounded-md bg-aws-blue px-4 py-2 text-center text-sm font-medium text-aws-white hover:bg-aws-blue-dark transition-colors"
              >
                Back to deck
              </Link>
              <Link
                href="/"
                className="block w-full rounded-md bg-aws-orange px-4 py-2 text-center text-sm font-medium text-aws-squid-ink hover:bg-aws-orange-dark transition-colors"
              >
                Review more decks
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  // Active review session
  if (reviewState && reviewState.cards.length > 0 && !reviewState.completed) {
    const currentCard = reviewState.cards[reviewState.currentCardIndex];
    const progress = reviewState.currentCardIndex + 1;
    const total = reviewState.cards.length;

    const handleGradeCorrect = () => {
      // Update the card via DecksContext gradeCardCorrect (Requirement 7)
      const result = gradeCardCorrect(id, currentCard.id, today);

      if (result.ok) {
        // Move to next card or mark as completed
        if (reviewState.currentCardIndex < reviewState.cards.length - 1) {
          setReviewState({
            ...reviewState,
            currentCardIndex: reviewState.currentCardIndex + 1,
            revealed: false,
            correctCount: reviewState.correctCount + 1,
          });
        } else {
          setReviewState({
            ...reviewState,
            completed: true,
            correctCount: reviewState.correctCount + 1,
          });
        }
      } else {
        // Handle error (Requirement 7.3)
        console.error("Failed to grade card:", result.error);
        alert("Failed to save your progress. Please try again.");
      }
    };

    const handleGradeIncorrect = () => {
      // Update the card via DecksContext gradeCardIncorrect (Requirement 7)
      const result = gradeCardIncorrect(id, currentCard.id, today);

      if (result.ok) {
        // Move to next card or mark as completed
        if (reviewState.currentCardIndex < reviewState.cards.length - 1) {
          setReviewState({
            ...reviewState,
            currentCardIndex: reviewState.currentCardIndex + 1,
            revealed: false,
            incorrectCount: reviewState.incorrectCount + 1,
          });
        } else {
          setReviewState({
            ...reviewState,
            completed: true,
            incorrectCount: reviewState.incorrectCount + 1,
          });
        }
      } else {
        // Handle error (Requirement 7.3)
        console.error("Failed to grade card:", result.error);
        alert("Failed to save your progress. Please try again.");
      }
    };

    return (
      <>
        <section className="border-b border-aws-gray-200 bg-aws-squid-ink px-6 py-6 sm:py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold tracking-tight text-aws-white sm:text-3xl">
                {deck.name}
              </h1>
              {deck.description && (
                <p className="mt-1 text-sm text-aws-gray-200">{deck.description}</p>
              )}
            </div>
            {/* Progress indicator (Requirement 8.1) */}
            <div className="text-right">
              <div className="text-sm font-medium text-aws-gray-200">
                {progress} of {total}
              </div>
              <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-aws-gray-600">
                <div
                  className="h-full bg-aws-orange transition-all duration-300"
                  style={{ width: `${(progress / total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-md">
            {/* Card display (Requirements 3.1-3.4) */}
            <div className="mb-8">
              <button
                onClick={() => setReviewState({ ...reviewState, revealed: !reviewState.revealed })}
                className="w-full rounded-lg border-2 border-aws-gray-200 bg-aws-white p-8 text-center transition-all hover:border-aws-orange hover:shadow-md active:scale-95"
              >
                <div className="mb-4 min-h-12">
                  {!reviewState.revealed ? (
                    <div>
                      <p className="text-xs font-medium text-aws-gray-600 uppercase tracking-wide">
                        Question
                      </p>
                      <div className="prose prose-sm mt-2 max-w-none text-aws-gray-900">
                        <Markdown>{currentCard.front}</Markdown>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="prose prose-sm max-w-none text-aws-gray-900">
                        <Markdown>{currentCard.front}</Markdown>
                      </div>
                      <div className="my-4 border-t border-aws-gray-200" />
                      <p className="text-xs font-medium text-aws-gray-600 uppercase tracking-wide">
                        Answer
                      </p>
                      <div className="prose prose-sm mt-2 max-w-none text-aws-gray-900">
                        <Markdown>{currentCard.back}</Markdown>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-aws-gray-500">
                  {reviewState.revealed ? "Tap to hide" : "Tap to reveal answer"}
                </p>
              </button>
            </div>

            {/* Grading buttons (Requirements 4.1-4.4) */}
            {reviewState.revealed && (
              <div className="flex gap-4">
                <button
                  onClick={handleGradeIncorrect}
                  className="flex-1 rounded-md bg-aws-error px-4 py-3 text-sm font-medium text-aws-white hover:opacity-90 transition-opacity active:scale-95"
                >
                  Incorrect
                </button>
                <button
                  onClick={handleGradeCorrect}
                  className="flex-1 rounded-md bg-aws-success px-4 py-3 text-sm font-medium text-aws-white hover:opacity-90 transition-opacity active:scale-95"
                >
                  Correct
                </button>
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  // Fallback state (should not normally reach here)
  return (
    <>
      <section className="border-b border-aws-gray-200 bg-aws-squid-ink px-6 py-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-aws-white sm:text-3xl">
              {deck.name}
            </h1>
            {deck.description && (
              <p className="mt-1 text-sm text-aws-gray-200">{deck.description}</p>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-aws-gray-900">Loading review session...</h2>
        </div>
      </section>
    </>
  );
}
