"use client";

import { use, useState, useEffect } from "react";
import { useDecks } from "@/contexts/DecksContext";
import { getDueCards } from "@/lib/leitner";
import type { Card } from "@/types";
import Markdown from "@/components/Markdown";
import ExportControl from "@/components/ExportControl";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import BackLink from "@/components/BackLink";

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
 * Hydration Guard (Requirements 8.1, 8.2, 8.3):
 * - During initial render (before mount): renders LoadingState with deterministic
 *   empty seed, matching server output exactly
 * - After mount completes: useEffect initializes reviewState based on actual deck data
 * - This ensures server/client markup match and no hydration warning is emitted
 *
 * Render logic:
 * - `status !== "ready"`: render LoadingState (store is hydrating or errored)
 * - `status === "ready"` and reviewState === null: (transitional, after useEffect runs)
 * - `status === "ready"` and deck matches route id:
 *   - If reviewState.cards.length === 0: render "No cards due" empty state
 *   - If reviewState.completed: render completion summary
 *   - Otherwise: render active review session
 * - `status === "ready"` and no deck matches: render deck-not-found error state
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

  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  // Mount-gated effect to initialize review session (Requirements 8.1, 8.2, 8.3)
  // This runs AFTER the first render, so no state is written during render-time
  useEffect(() => {
    if (status === "ready" && reviewState === null && decks.length > 0) {
      const deck = decks.find((d) => d.id === id);
      if (deck) {
        const today = new Date();
        const dueCards = getDueCards(deck, today);

        // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount initialization
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewState excluded to prevent re-initialization
  }, [status, decks, id]);

  // Loading state — store is still hydrating (Requirement 2.3, 8.2)
  if (status !== "ready") {
    return <LoadingState label="Loading review session..." />;
  }

  const deck = decks.find((d) => d.id === id);

  // Deck not found — render error state with back action (Requirement 4.3, 1.9)
  if (!deck) {
    return (
      <ErrorState
        title="Deck not found"
        message="The deck you're looking for doesn't exist or has been deleted."
        action={<BackLink href="/">Back to Dashboard</BackLink>}
      />
    );
  }

  const today = new Date();

  // No cards due state (Requirement 3.3)
  if (reviewState && reviewState.cards.length === 0) {
    return (
      <>
        <section className="border-b border-aws-gray-200 bg-aws-squid-ink px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
          <div className="mx-auto max-w-7xl">
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
          </div>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-md text-center">
            <div className="mb-4 text-5xl">🎉</div>
            <h2 className="text-lg font-semibold text-aws-gray-900">
              No cards due today
            </h2>
            <p className="mt-2 text-sm text-aws-gray-600">
              Great job staying on top of your studies! Come back later for more cards.
            </p>
            <div className="mt-6">
              <BackLink href={`/deck/${id}`}>Back to deck</BackLink>
            </div>
          </div>
        </section>
      </>
    );
  }

  // Completion summary (Requirement 5.1, 5.2, 5.3, 1.6)
  if (reviewState && reviewState.completed) {
    const totalReviewed = reviewState.correctCount + reviewState.incorrectCount;
    const showExportReminder = totalReviewed > 0;

    return (
      <>
        <section className="border-b border-aws-gray-200 bg-aws-squid-ink px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
          <div className="mx-auto max-w-7xl">
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
          </div>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-lg bg-aws-white p-8 shadow-sm sm:p-12">
            <div className="mb-6 text-center">
              <div className="mb-4 text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-aws-success">Review complete!</h2>
              <p className="mt-2 text-sm text-aws-gray-600">
                Great work! You&apos;ve finished reviewing your cards for today.
              </p>
            </div>

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

            {showExportReminder && (
              <div className="mb-6 rounded-lg bg-aws-gray-100 p-4">
                <p className="mb-3 text-sm font-medium text-aws-gray-900">
                  Save your progress:
                </p>
                <ExportControl deck={deck} />
              </div>
            )}

            <div className="space-y-3 flex flex-col">
              <BackLink href={`/deck/${id}`} variant="secondary">
                Back to deck
              </BackLink>
              <BackLink href="/" variant="primary">
                Back to Dashboard
              </BackLink>
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
        // Clear any previous error
        setGradeError(null);
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
        // Handle error (Requirement 4.4): set gradeError and render in-view ErrorState
        // Do NOT advance currentCardIndex or change counts
        setGradeError("Failed to save your progress. Please try again.");
      }
    };

    const handleGradeIncorrect = () => {
      // Update the card via DecksContext gradeCardIncorrect (Requirement 7)
      const result = gradeCardIncorrect(id, currentCard.id, today);

      if (result.ok) {
        // Clear any previous error
        setGradeError(null);
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
        // Handle error (Requirement 4.4): set gradeError and render in-view ErrorState
        // Do NOT advance currentCardIndex or change counts
        setGradeError("Failed to save your progress. Please try again.");
      }
    };

    return (
      <>
        <section className="border-b border-aws-gray-200 bg-aws-squid-ink px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-semibold tracking-tight text-aws-white sm:text-3xl">
                  {deck.name}
                </h1>
                {deck.description && (
                  <p className="mt-1 text-sm text-aws-gray-200">{deck.description}</p>
                )}
              </div>
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
          </div>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            {gradeError && (
              <div className="mb-6">
                <ErrorState
                  title="Failed to save"
                  message={gradeError}
                />
              </div>
            )}

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

  return <LoadingState label="Loading review session..." />;
}
