"use client";

import { useId, useState, type FormEvent } from "react";

import { useDecks } from "@/contexts/DecksContext";
import type { CardFormField } from "@/contexts/DecksContext";
import { cardFormSchema } from "@/types";
import type { Card } from "@/types";
import Markdown from "@/components/Markdown";

/**
 * Discriminates the form's two modes:
 * - `create` starts empty and calls `addCard` on submit.
 * - `edit` pre-fills from `mode.card` and calls `updateCard` on submit.
 */
export type CardFormMode =
  | { kind: "create" }
  | { kind: "edit"; card: Card };

export interface CardFormProps {
  /** The deck the card belongs to; used for addCard/updateCard. */
  deckId: string;
  mode: CardFormMode;
  /** Close the overlay; called on cancel and on a successful submit. */
  onClose: () => void;
}

/** Per-field validation messages, keyed by the offending form field. */
type FieldErrors = Partial<Record<CardFormField, string>>;

/**
 * CardForm — controlled create/edit form rendered inside a modal.
 *
 * Client Component: it owns local field state, validates with `cardFormSchema`
 * on submit, retains user input on failure, and maps Zod issues (and any store
 * `validation` error) to inline messages beside the offending field.
 *
 * Renders a live `Markdown_Preview` region that shows the current `front` and
 * `back` through the `Markdown` component as the user types, updating without
 * a page reload. Empty fields render an empty preview.
 *
 * Accessibility: the modal is `role="dialog"` with `aria-modal="true"` and is
 * labelled by its heading. Each input has an associated `<label>` and, when it
 * has an error, an `aria-describedby` link to error text rendered with
 * `role="alert"`.
 *
 * Requirements: 2.1, 2.2, 3.1, 3.2, 5.1, 5.2, 5.5, 6.3, 6.4, 6.5, 6.6, 7.8
 */
export default function CardForm({
  deckId,
  mode,
  onClose,
}: CardFormProps) {
  const { addCard, updateCard } = useDecks();

  const initialFront = mode.kind === "edit" ? mode.card.front : "";
  const initialBack = mode.kind === "edit" ? mode.card.back : "";

  const [front, setFront] = useState(initialFront);
  const [back, setBack] = useState(initialBack);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Stable, unique ids so labels/inputs/error text associate correctly
  const headingId = useId();
  const frontId = useId();
  const frontErrorId = useId();
  const backId = useId();
  const backErrorId = useId();
  const previewId = useId();
  const formErrorId = useId();

  const isEdit = mode.kind === "edit";
  const heading = isEdit ? "Edit card" : "Create card";
  const submitLabel = isEdit ? "Save changes" : "Create card";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Client-side validation for UX. On failure, retain values and do not call
    // the store (Requirements 6.3, 6.4, 6.5, 6.6).
    const parsed = cardFormSchema.safeParse({ front, back });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "front" || field === "back") {
          nextErrors[field] ??= issue.message;
        }
      }
      setErrors(nextErrors);
      setFormError(null);
      return;
    }

    // Submit to the store. It re-validates for integrity and may still return a
    // validation / not-found / persistence error to surface (Requirements 2.2,
    // 3.2, 6.7, 6.8).
    const result =
      mode.kind === "edit"
        ? updateCard({
            deckId,
            cardId: mode.card.id,
            front: parsed.data.front,
            back: parsed.data.back,
          })
        : addCard({
            deckId,
            front: parsed.data.front,
            back: parsed.data.back,
          });

    if (result.ok) {
      onClose();
      return;
    }

    if (result.error.code === "validation") {
      setErrors(result.error.fields);
      setFormError(null);
      return;
    }

    // not-found / persistence / other: surface a form-level message.
    setErrors({});
    setFormError(result.error.message);
  }

  const frontError = errors.front;
  const backError = errors.back;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-0 z-20 flex items-end justify-center bg-aws-anchor/60 p-4 sm:items-center"
    >
      <div className="w-full max-w-2xl rounded-lg border border-aws-gray-200 bg-aws-white p-6 shadow-lg sm:p-8">
        <h2
          id={headingId}
          className="text-xl font-semibold tracking-tight text-aws-gray-900 sm:text-2xl"
        >
          {heading}
        </h2>

        <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={frontId}
              className="text-sm font-medium text-aws-gray-900"
            >
              Front
            </label>
            <textarea
              id={frontId}
              name="front"
              value={front}
              onChange={(event) => setFront(event.target.value)}
              aria-invalid={frontError ? true : undefined}
              aria-describedby={frontError ? frontErrorId : undefined}
              autoFocus
              rows={3}
              className="rounded-md border border-aws-gray-400 bg-aws-white px-3 py-2 text-base text-aws-gray-900 outline-none focus:border-aws-blue focus:ring-2 focus:ring-aws-blue"
            />
            {frontError && (
              <p
                id={frontErrorId}
                role="alert"
                className="text-sm font-medium text-aws-error"
              >
                {frontError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={backId}
              className="text-sm font-medium text-aws-gray-900"
            >
              Back
            </label>
            <textarea
              id={backId}
              name="back"
              value={back}
              onChange={(event) => setBack(event.target.value)}
              aria-invalid={backError ? true : undefined}
              aria-describedby={backError ? backErrorId : undefined}
              rows={3}
              className="rounded-md border border-aws-gray-400 bg-aws-white px-3 py-2 text-base text-aws-gray-900 outline-none focus:border-aws-blue focus:ring-2 focus:ring-aws-blue"
            />
            {backError && (
              <p
                id={backErrorId}
                role="alert"
                className="text-sm font-medium text-aws-error"
              >
                {backError}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-aws-gray-200 bg-aws-gray-100 p-4">
            <h3 className="text-sm font-medium text-aws-gray-900">Preview</h3>
            <div
              id={previewId}
              className="mt-3 space-y-3 text-sm text-aws-gray-900"
            >
              {front && (
                <div>
                  <p className="mb-1 text-xs font-medium text-aws-gray-600 uppercase">
                    Front
                  </p>
                  <Markdown>{front}</Markdown>
                </div>
              )}
              {back && (
                <div>
                  <p className="mb-1 text-xs font-medium text-aws-gray-600 uppercase">
                    Back
                  </p>
                  <Markdown>{back}</Markdown>
                </div>
              )}
              {!front && !back && (
                <p className="text-aws-gray-600">
                  Your preview will appear here as you type...
                </p>
              )}
            </div>
          </div>

          {formError && (
            <p
              id={formErrorId}
              role="alert"
              className="text-sm font-medium text-aws-error"
            >
              {formError}
            </p>
          )}

          <div className="mt-2 flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-md bg-aws-orange px-6 text-sm font-semibold text-aws-squid-ink transition-colors hover:bg-aws-orange-dark"
            >
              {submitLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-md border border-aws-gray-400 bg-aws-white px-6 text-sm font-semibold text-aws-blue transition-colors hover:bg-aws-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
