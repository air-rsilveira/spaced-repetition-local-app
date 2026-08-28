import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import DeleteConfirm from "@/components/DeleteConfirm";
import { makeDeck } from "@/mocks";

/**
 * Example-based unit tests for the DeleteConfirm dialog.
 *
 * Covers:
 * - Displays the target deck name in the heading (Requirement 3.1)
 * - Renders as an accessible modal alertdialog (Requirement 3.2)
 * - Presents exactly one confirm and one cancel control, and never deletes
 *   without an explicit confirm click (Requirement 3.2)
 * - Cancel invokes onCancel; the cancel control receives focus on mount, which
 *   lets the opener return focus to the trigger (Requirement 3.8)
 * - Escape cancels (Requirement 3.8)
 */
describe("DeleteConfirm", () => {
  afterEach(() => {
    cleanup();
  });

  it("displays the target deck name in the heading (3.1)", () => {
    const deck = makeDeck({ id: "d1", name: "Spanish Vocabulary" });
    render(
      <DeleteConfirm deck={deck} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    const dialog = screen.getByRole("alertdialog");
    const heading = within(dialog).getByRole("heading");
    expect(heading.textContent).toContain("Spanish Vocabulary");
  });

  it("renders an accessible modal alertdialog labelled by its heading (3.2)", () => {
    const deck = makeDeck({ name: "History" });
    render(
      <DeleteConfirm deck={deck} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");

    // The dialog is labelled by its heading (aria-labelledby -> heading id).
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const heading = within(dialog).getByRole("heading");
    expect(heading.id).toBe(labelledBy);
  });

  it("presents exactly one confirm control and one cancel control (3.2)", () => {
    const deck = makeDeck({ name: "Geography" });
    render(
      <DeleteConfirm deck={deck} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    const dialog = screen.getByRole("alertdialog");
    const buttons = within(dialog).getAllByRole("button");
    // Exactly two controls: one confirm, one cancel.
    expect(buttons).toHaveLength(2);

    const cancel = within(dialog).getByRole("button", { name: /cancel/i });
    const confirm = within(dialog).getByRole("button", { name: /delete/i });
    expect(cancel).not.toBe(confirm);
  });

  it("does not fire onConfirm on render (3.2)", () => {
    const onConfirm = vi.fn();
    const deck = makeDeck({ name: "Science" });
    render(
      <DeleteConfirm deck={deck} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm only after the confirm control is clicked (3.2)", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const deck = makeDeck({ name: "Biology" });
    render(
      <DeleteConfirm deck={deck} onConfirm={onConfirm} onCancel={onCancel} />,
    );

    // No confirm before the click.
    expect(onConfirm).not.toHaveBeenCalled();

    const confirm = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(confirm);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("does not fire onConfirm when cancelling (3.2, 3.8)", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const deck = makeDeck({ name: "Chemistry" });
    render(
      <DeleteConfirm deck={deck} onConfirm={onConfirm} onCancel={onCancel} />,
    );

    const cancel = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancel);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("moves focus to the cancel control on mount so the opener can restore focus (3.8)", () => {
    const deck = makeDeck({ name: "Physics" });
    render(
      <DeleteConfirm deck={deck} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    const cancel = screen.getByRole("button", { name: /cancel/i });
    expect(cancel).toHaveFocus();
  });

  it("triggers onCancel when Escape is pressed (3.8)", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const deck = makeDeck({ name: "Astronomy" });
    render(
      <DeleteConfirm deck={deck} onConfirm={onConfirm} onCancel={onCancel} />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
