"use client";

import { useEffect, useId, useRef } from "react";
import type { Deck } from "@/types";

export interface DeleteConfirmProps {
  /** The deck the user is about to delete. Its name is shown in the heading. */
  deck: Deck;
  /** Called when the user explicitly confirms deletion. The Dashboard wires this to `deleteDeck(deck.id)`. */
  onConfirm: () => void;
  /** Called when the user cancels (cancel control or Escape). The opener returns focus to the trigger. */
  onCancel: () => void;
}

/**
 * DeleteConfirm — an accessible confirmation dialog shown before a deck is
 * deleted. It renders as an `alertdialog`, names the target deck in its
 * heading, and presents exactly one destructive confirm control and one cancel
 * control. No deletion happens without an explicit confirm click.
 *
 * Focus management: on mount, focus moves into the dialog and defaults to the
 * cancel control (the safe default). Pressing Escape triggers cancel. Returning
 * focus to the trigger that opened the dialog is the opener's responsibility.
 *
 * Client Component: it manages focus and keyboard interactivity.
 *
 * Requirements: 3.1, 3.2, 3.7, 3.8
 */
export default function DeleteConfirm({
  deck,
  onConfirm,
  onCancel,
}: DeleteConfirmProps) {
  const headingId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  // On mount, move focus to the safe default (cancel).
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Escape triggers cancel.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-aws-squid-ink/60 p-4"
      onMouseDown={(event) => {
        // Clicking the backdrop (outside the dialog) cancels.
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-lg border border-aws-gray-200 bg-aws-white p-6 shadow-lg sm:p-8"
      >
        <h2
          id={headingId}
          className="text-xl font-semibold tracking-tight text-aws-gray-900"
        >
          Delete &ldquo;{deck.name}&rdquo;?
        </h2>
        <p id={descriptionId} className="mt-3 text-base leading-7 text-aws-gray-600">
          This will permanently remove the deck and its cards. This action
          cannot be undone.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-md border border-aws-gray-400 bg-aws-white px-6 text-sm font-semibold text-aws-gray-900 transition-colors hover:bg-aws-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-11 items-center justify-center rounded-md bg-aws-error px-6 text-sm font-semibold text-aws-white transition-colors hover:brightness-110"
          >
            Delete deck
          </button>
        </div>
      </div>
    </div>
  );
}
