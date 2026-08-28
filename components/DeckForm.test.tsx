import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import DeckForm from "@/components/DeckForm";
import type { DeckFormMode } from "@/components/DeckForm";
import { DecksProvider } from "@/contexts/DecksContext";
import { makeDeck } from "@/mocks";

/**
 * Example-based unit tests for `DeckForm`.
 *
 * The form reads `addDeck`/`updateDeck` from `useDecks`, so every render is
 * wrapped in the real `DecksProvider`. Tests focus on concrete UI behavior and
 * accessibility rather than universal properties (those live in the store's
 * property tests).
 *
 * Validates: Requirements 1.1, 2.1, 4.3, 4.4, 4.5, 4.6
 */

/** Render `DeckForm` inside the real provider. */
function renderForm(mode: DeckFormMode, onClose: () => void = vi.fn()): void {
  render(
    <DecksProvider>
      <DeckForm mode={mode} onClose={onClose} />
    </DecksProvider>,
  );
}

/** The primary submit button is labelled "Create deck" / "Save changes". */
function submit(name: RegExp): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("DeckForm — create mode (Requirement 1.1)", () => {
  it("opens with empty name and description inputs", () => {
    renderForm({ kind: "create" });

    expect(screen.getByLabelText(/name/i)).toHaveValue("");
    expect(screen.getByLabelText(/description/i)).toHaveValue("");
  });
});

describe("DeckForm — edit mode (Requirement 2.1)", () => {
  it("pre-fills the inputs from mode.deck's name and description", () => {
    const deck = makeDeck({
      id: "deck-edit",
      name: "French Verbs",
      description: "Irregular conjugations.",
    });

    renderForm({ kind: "edit", deck });

    expect(screen.getByLabelText(/name/i)).toHaveValue("French Verbs");
    expect(screen.getByLabelText(/description/i)).toHaveValue(
      "Irregular conjugations.",
    );
  });

  it("pre-fills the description as empty when the deck has none", () => {
    const deck = makeDeck({ id: "deck-no-desc", name: "Capitals" });

    renderForm({ kind: "edit", deck });

    expect(screen.getByLabelText(/name/i)).toHaveValue("Capitals");
    expect(screen.getByLabelText(/description/i)).toHaveValue("");
  });
});

describe("DeckForm — validation failures retain input and stay open", () => {
  // Requirements 4.3, 4.6
  it("shows a required-name message next to the name field and retains input on empty name", () => {
    const onClose = vi.fn();
    renderForm({ kind: "create" }, onClose);

    // Leave name empty, type only a description.
    const description = screen.getByLabelText(/description/i);
    fireEvent.change(description, { target: { value: "some notes" } });

    submit(/create deck/i);

    // Field-specific message appears via role="alert".
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/name is required/i);

    // The message is associated with the name input via aria-describedby.
    const nameInput = screen.getByLabelText(/name/i);
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveAttribute("aria-describedby", alert.id);

    // Input is retained and the overlay did not close.
    expect(description).toHaveValue("some notes");
    expect(onClose).not.toHaveBeenCalled();
  });

  // Requirement 4.4
  it("shows a name-exceeds message and retains input when the name is longer than 100 chars", () => {
    const onClose = vi.fn();
    renderForm({ kind: "create" }, onClose);

    const overlongName = "a".repeat(101);
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: overlongName } });

    submit(/create deck/i);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /name exceeds 100 characters/i,
    );
    // Input is retained; overlay stays open.
    expect(nameInput).toHaveValue(overlongName);
    expect(onClose).not.toHaveBeenCalled();
  });

  // Requirement 4.5
  it("shows a description-exceeds message and retains input when the description is longer than 500 chars", () => {
    const onClose = vi.fn();
    renderForm({ kind: "create" }, onClose);

    const overlongDescription = "d".repeat(501);
    const nameInput = screen.getByLabelText(/name/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    // Provide a valid name so only the description is invalid.
    fireEvent.change(nameInput, { target: { value: "Valid name" } });
    fireEvent.change(descriptionInput, {
      target: { value: overlongDescription },
    });

    submit(/create deck/i);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/description exceeds 500 characters/i);
    expect(descriptionInput).toHaveAttribute("aria-describedby", alert.id);

    // Both inputs retain their values; overlay stays open.
    expect(nameInput).toHaveValue("Valid name");
    expect(descriptionInput).toHaveValue(overlongDescription);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("DeckForm — accessibility (Requirement 4.6)", () => {
  it("renders labelled inputs and a modal dialog with aria-modal", () => {
    renderForm({ kind: "create" });

    // Labelled inputs are reachable by their accessible name.
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();

    // The modal is a dialog and is marked modal.
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });
});
