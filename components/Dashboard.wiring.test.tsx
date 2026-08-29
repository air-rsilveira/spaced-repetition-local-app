import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import Dashboard from "@/components/Dashboard";
import { DecksProvider } from "@/contexts/DecksContext";
import { DECKS_STORAGE_KEY } from "@/lib/storage";
import { makeDeck, singleDeckList } from "@/mocks";
import type { DeckList } from "@/types";

/**
 * Dashboard wiring — example-based unit tests for the create/edit/delete flows.
 *
 * Unlike the render-branch tests (which mock `useDecks`), these render the
 * Dashboard inside the REAL `DecksProvider` so the store actually mutates and
 * the Dashboard re-renders from store state. `localStorage` is jsdom-backed and
 * cleared per test by the global setup (`vitest.setup.ts`); seeding it before
 * mount lets the hydration effect populate the listing.
 *
 * Interactions use `fireEvent` (the repo does not depend on
 * `@testing-library/user-event`).
 *
 * Requirements: 1.1, 1.6, 2.6, 3.4, 3.7
 */

afterEach(() => {
  cleanup();
});

/** Seed persisted decks so the provider hydrates to a populated listing. */
function seedDecks(decks: DeckList) {
  window.localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks));
}

function renderDashboard() {
  return render(
    <DecksProvider>
      <Dashboard />
    </DecksProvider>,
  );
}

describe("Dashboard wiring — create entry points open the form (1.1)", () => {
  it("opens the DeckForm in create mode when the header 'New deck' button is clicked", async () => {
    // Seed a deck so the header listing (with the "New deck" button) renders.
    seedDecks(singleDeckList);
    renderDashboard();

    // Wait for hydration to swap in the listing (loading phase completes).
    const newDeckButton = await screen.findByRole("button", {
      name: /new deck/i,
    });

    // No dialog before the entry point is activated.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(newDeckButton);

    // The form opens as a modal dialog in create mode (empty Name field).
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: /create deck/i }),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/name/i)).toHaveValue("");
  });

  it("opens the DeckForm in create mode from the EmptyState 'Create deck' button", async () => {
    // Empty store (cleared localStorage) so the EmptyState renders after hydration.
    renderDashboard();

    // The empty state is shown once the store transitions from "initial" to ready.
    const createButton = await screen.findByRole("button", {
      name: /create deck/i,
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(createButton);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: /create deck/i }),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/name/i)).toHaveValue("");
  });
});

describe("Dashboard wiring — created deck renders as a DeckCard (1.6)", () => {
  it("renders a newly created deck as an article in the listing after submit", async () => {
    // Start empty: create the very first deck through the form.
    renderDashboard();

    const createButton = await screen.findByRole("button", {
      name: /create deck/i,
    });
    fireEvent.click(createButton);

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/name/i), {
      target: { value: "French Verbs" },
    });
    fireEvent.change(within(dialog).getByLabelText(/description/i), {
      target: { value: "Common irregular verbs" },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: /create deck/i }));

    // The form closes and the new deck renders as a DeckCard (article + h3).
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { level: 3, name: "French Verbs" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Common irregular verbs")).toBeInTheDocument();
  });
});

describe("Dashboard wiring — edited deck shows updated name/description (2.6)", () => {
  it("shows the updated name and description after editing a deck", async () => {
    seedDecks([
      makeDeck({
        id: "edit-me",
        name: "Old Name",
        description: "Old description",
      }),
    ]);
    renderDashboard();

    // Wait for the seeded deck to appear, then open its edit form.
    const editButton = await screen.findByRole("button", {
      name: /edit old name/i,
    });
    fireEvent.click(editButton);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: /edit deck/i }),
    ).toBeInTheDocument();
    // Edit mode pre-fills the existing values.
    expect(within(dialog).getByLabelText(/name/i)).toHaveValue("Old Name");

    fireEvent.change(within(dialog).getByLabelText(/name/i), {
      target: { value: "New Name" },
    });
    fireEvent.change(within(dialog).getByLabelText(/description/i), {
      target: { value: "New description" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /save changes/i }),
    );

    // The listing reflects the updated values; the old ones are gone.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { level: 3, name: "New Name" }),
    ).toBeInTheDocument();
    expect(screen.getByText("New description")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: "Old Name" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Old description")).not.toBeInTheDocument();
  });
});

describe("Dashboard wiring — deleted deck no longer renders (3.4)", () => {
  it("removes the deck from the listing after confirming deletion", async () => {
    seedDecks([
      makeDeck({ id: "keep", name: "Keep Me" }),
      makeDeck({ id: "remove", name: "Remove Me" }),
    ]);
    renderDashboard();

    // Both decks render after hydration.
    await screen.findByRole("heading", { level: 3, name: "Remove Me" });
    expect(screen.getAllByRole("article")).toHaveLength(2);

    // Open the delete confirmation for "Remove Me".
    fireEvent.click(screen.getByRole("button", { name: /delete remove me/i }));

    const confirm = screen.getByRole("alertdialog");
    expect(
      within(confirm).getByRole("heading", { name: /remove me/i }),
    ).toBeInTheDocument();

    // Confirm the deletion.
    fireEvent.click(within(confirm).getByRole("button", { name: /delete deck/i }));

    // The confirmed deck is gone; the other remains.
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { level: 3, name: "Remove Me" }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { level: 3, name: "Keep Me" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
});

describe("Dashboard wiring — cancelling delete leaves the listing unchanged (3.7)", () => {
  it("keeps the deck in the listing when the delete confirmation is cancelled", async () => {
    seedDecks([
      makeDeck({ id: "keep", name: "Keep Me" }),
      makeDeck({ id: "spare", name: "Spare Me" }),
    ]);
    renderDashboard();

    await screen.findByRole("heading", { level: 3, name: "Spare Me" });
    expect(screen.getAllByRole("article")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /delete spare me/i }));

    const confirm = screen.getByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: /^cancel$/i }));

    // The dialog closes and both decks remain in the listing unchanged.
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { level: 3, name: "Spare Me" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Keep Me" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
});
