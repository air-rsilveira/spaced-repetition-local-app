"use client";

import { useId, useState, type FormEvent } from "react";

import { useDecks } from "@/contexts/DecksContext";
import type { DeckFormField } from "@/contexts/DecksContext";
import { deckFormSchema } from "@/types";
import type { Deck } from "@/types";

/**
 * Discriminates the form's two modes:
 * - `create` starts empty and calls `addDeck` on submit.
 * - `edit` pre-fills from `mode.deck` and calls `updateDeck` on submit.
 */
export type DeckFormMode =
  | { kind: "create" }
  | { kind: "edit"; deck: Deck };

export interface DeckFormProps {
  mode: DeckFormMode;
  /** Close the overlay; called on cancel and on a successful submit. */
  onClose: () => void;
}

/** Per-field validation messages, keyed by the offending form field. */
type FieldErrors = Partial<Record<DeckFormField, string>>;

/**
 * DeckForm — controlled create/edit form rendered inside a modal.
 *
 * Client Component: it owns local field state, validates with `deckFormSchema`
 * on submit, retains user input on failure, and maps Zod issues (and any store
 * `validation` error) to inline messages beside the offending field.
 *
 * Accessibility: the modal is `role="dialog"` with `aria-modal="true"` and is
 * labelled by its heading. Each input has an associated `<label>` and, when it
 * has an error, an `aria-describedby` link to error text rendered with
 * `role="alert"`.
 *
 * Requirements: 1.1, 1.2, 2.1, 2.2, 2.8, 4.3, 4.4, 4.5, 4.6, 6.4
 */
export default function DeckForm({ mode, onClose }: DeckFormProps) {
  const { addDeck, updateDeck } = useDecks();

  const initialName = mode.kind === "edit" ? mode.deck.name : "";
  const initialDescription =
    mode.kind === "edit" ? (mode.deck.description ?? "") : "";

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Stable, unique ids so labels/inputs/error text associate correctly even if
  // multiple forms mount (React 19 `useId`).
  const headingId = useId();
  const nameId = useId();
  const nameErrorId = useId();
  const descriptionId = useId();
  const descriptionErrorId = useId();
  const formErrorId = useId();

  const isEdit = mode.kind === "edit";
  const heading = isEdit ? "Edit deck" : "Create deck";
  const submitLabel = isEdit ? "Save changes" : "Create deck";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Client-side validation for UX. On failure, retain values and do not call
    // the store (Requirements 4.3, 4.4, 4.5, 4.6).
    const parsed = deckFormSchema.safeParse({ name, description });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "name" || field === "description") {
          nextErrors[field] ??= issue.message;
        }
      }
      setErrors(nextErrors);
      setFormError(null);
      return;
    }

    // Submit to the store. It re-validates for integrity and may still return a
    // validation / not-found / persistence error to surface (Requirements 1.2,
    // 2.2, 2.8).
    const result =
      mode.kind === "edit"
        ? updateDeck({
            id: mode.deck.id,
            name: parsed.data.name,
            description: parsed.data.description,
          })
        : addDeck({
            name: parsed.data.name,
            description: parsed.data.description,
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

    // not-found / persistence / duplicate-id / other: surface a form-level msg.
    setErrors({});
    setFormError(result.error.message);
  }

  const nameError = errors.name;
  const descriptionError = errors.description;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-0 z-20 flex items-end justify-center bg-aws-anchor/60 p-4 sm:items-center"
    >
      <div className="w-full max-w-lg rounded-lg border border-aws-gray-200 bg-aws-white p-6 shadow-lg sm:p-8">
        <h2
          id={headingId}
          className="text-xl font-semibold tracking-tight text-aws-gray-900 sm:text-2xl"
        >
          {heading}
        </h2>

        <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={nameId}
              className="text-sm font-medium text-aws-gray-900"
            >
              Name
            </label>
            <input
              id={nameId}
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? nameErrorId : undefined}
              autoFocus
              className="h-11 rounded-md border border-aws-gray-400 bg-aws-white px-3 text-base text-aws-gray-900 outline-none focus:border-aws-blue focus:ring-2 focus:ring-aws-blue"
            />
            {nameError && (
              <p
                id={nameErrorId}
                role="alert"
                className="text-sm font-medium text-aws-error"
              >
                {nameError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={descriptionId}
              className="text-sm font-medium text-aws-gray-900"
            >
              Description{" "}
              <span className="font-normal text-aws-gray-600">(optional)</span>
            </label>
            <textarea
              id={descriptionId}
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={descriptionError ? true : undefined}
              aria-describedby={descriptionError ? descriptionErrorId : undefined}
              rows={3}
              className="rounded-md border border-aws-gray-400 bg-aws-white px-3 py-2 text-base text-aws-gray-900 outline-none focus:border-aws-blue focus:ring-2 focus:ring-aws-blue"
            />
            {descriptionError && (
              <p
                id={descriptionErrorId}
                role="alert"
                className="text-sm font-medium text-aws-error"
              >
                {descriptionError}
              </p>
            )}
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
