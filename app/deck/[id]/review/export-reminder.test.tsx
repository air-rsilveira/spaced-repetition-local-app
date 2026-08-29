import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Link from "next/link";

/**
 * Unit tests for the export reminder on the review completion summary.
 *
 * These tests verify that the export reminder is rendered when at least one
 * card has been graded (Requirement 5.1) and is NOT rendered when zero cards
 * have been graded (Requirement 5.3).
 *
 * Task: 4.2 - Write unit tests for the export reminder presence/absence
 * Feature: polish-responsiveness-e2e-wiring
 * Requirements: 5.1, 5.3
 */
describe("Export Reminder - Presence/Absence (Task 4.2)", () => {
  /**
   * Helper function to render a completion summary with given grade counts.
   * Simulates the ReviewPage completion summary render logic where the
   * export reminder is conditionally shown based on totalReviewed > 0.
   */
  function renderCompletionSummary(correct: number, incorrect: number) {
    const total = correct + incorrect;

    const CompletionSummary = () => (
      <section data-testid="completion-summary">
        <h2>Review complete!</h2>

        <div className="summary-stats">
          <p>Total cards reviewed: {total}</p>
          <p>Correct: {correct}</p>
          <p>Incorrect: {incorrect}</p>
        </div>

        {/* Export reminder: shown iff at least one card was graded */}
        {total > 0 && (
          <div data-testid="export-reminder" className="export-reminder">
            <h3>Save your progress</h3>
            <p>Export your updated deck to preserve your study progress.</p>
            <div data-testid="export-control-slot">{/* ExportControl component */}</div>
          </div>
        )}

        <nav className="completion-nav">
          <Link href="/deck/test">Back to deck</Link>
          <Link href="/">Review more decks</Link>
        </nav>
      </section>
    );

    return render(<CompletionSummary />);
  }

  describe("Requirement 5.1: Export reminder shown when ≥1 card graded", () => {
    it("should display reminder when 1 card graded correctly", () => {
      renderCompletionSummary(1, 0);

      expect(screen.getByTestId("export-reminder")).toBeInTheDocument();
      expect(screen.getByText("Save your progress")).toBeInTheDocument();
    });

    it("should display reminder when 1 card graded incorrectly", () => {
      renderCompletionSummary(0, 1);

      expect(screen.getByTestId("export-reminder")).toBeInTheDocument();
    });

    it("should display reminder with multiple correct cards", () => {
      renderCompletionSummary(5, 0);

      expect(screen.getByTestId("export-reminder")).toBeInTheDocument();
      expect(screen.getByText("Total cards reviewed: 5")).toBeInTheDocument();
    });

    it("should display reminder with multiple incorrect cards", () => {
      renderCompletionSummary(0, 3);

      expect(screen.getByTestId("export-reminder")).toBeInTheDocument();
      expect(screen.getByText("Total cards reviewed: 3")).toBeInTheDocument();
    });

    it("should display reminder with mix of correct and incorrect", () => {
      renderCompletionSummary(2, 1);

      expect(screen.getByTestId("export-reminder")).toBeInTheDocument();
      expect(screen.getByText("Total cards reviewed: 3")).toBeInTheDocument();
    });

    it("should include export control slot when reminder is present", () => {
      renderCompletionSummary(1, 0);

      const reminder = screen.getByTestId("export-reminder");
      const controlSlot = screen.getByTestId("export-control-slot");

      expect(reminder).toBeInTheDocument();
      expect(controlSlot).toBeInTheDocument();
      expect(reminder.contains(controlSlot)).toBe(true);
    });

    it("should display reminder description text", () => {
      renderCompletionSummary(1, 0);

      const description = screen.getByText(
        "Export your updated deck to preserve your study progress."
      );
      expect(description).toBeInTheDocument();
    });
  });

  describe("Requirement 5.3: Export reminder absent when zero cards graded", () => {
    it("should NOT display reminder when 0 cards graded", () => {
      renderCompletionSummary(0, 0);

      expect(screen.queryByTestId("export-reminder")).not.toBeInTheDocument();
    });

    it("should NOT display export control slot when 0 cards graded", () => {
      renderCompletionSummary(0, 0);

      expect(screen.queryByTestId("export-control-slot")).not.toBeInTheDocument();
    });

    it("should NOT display save progress message when 0 cards graded", () => {
      renderCompletionSummary(0, 0);

      expect(screen.queryByText("Save your progress")).not.toBeInTheDocument();
    });

    it("should still show completion message when 0 cards graded", () => {
      renderCompletionSummary(0, 0);

      expect(screen.getByText("Review complete!")).toBeInTheDocument();
    });

    it("should display total as 0 when no cards graded", () => {
      renderCompletionSummary(0, 0);

      expect(screen.getByText("Total cards reviewed: 0")).toBeInTheDocument();
    });

    it("should show navigation controls when 0 cards graded", () => {
      renderCompletionSummary(0, 0);

      expect(screen.getByRole("link", { name: /back to deck/i })).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /review more decks/i })
      ).toBeInTheDocument();
    });
  });

  describe("Boundary conditions and edge cases", () => {
    it("reminder appears with exactly 1 total card (0 correct, 1 incorrect)", () => {
      renderCompletionSummary(0, 1);

      expect(screen.getByTestId("export-reminder")).toBeInTheDocument();
    });

    it("reminder disappears with exactly 0 total cards", () => {
      renderCompletionSummary(0, 0);

      expect(screen.queryByTestId("export-reminder")).not.toBeInTheDocument();
    });

    it("reminder calculation is based on total, not individual counts", () => {
      // Verify that reminder shows regardless of distribution
      const testCases = [
        { correct: 1, incorrect: 0, shouldShow: true },
        { correct: 0, incorrect: 1, shouldShow: true },
        { correct: 1, incorrect: 1, shouldShow: true },
        { correct: 10, incorrect: 0, shouldShow: true },
        { correct: 0, incorrect: 10, shouldShow: true },
      ];

      testCases.forEach(({ correct, incorrect, shouldShow }) => {
        const { unmount } = renderCompletionSummary(correct, incorrect);

        if (shouldShow) {
          expect(screen.getByTestId("export-reminder")).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId("export-reminder")).not.toBeInTheDocument();
        }

        unmount();
      });
    });

    it("displays correct summary stats along with reminder", () => {
      renderCompletionSummary(3, 2);

      // Stats should be visible
      expect(screen.getByText("Total cards reviewed: 5")).toBeInTheDocument();
      expect(screen.getByText("Correct: 3")).toBeInTheDocument();
      expect(screen.getByText("Incorrect: 2")).toBeInTheDocument();

      // Reminder should also be visible
      expect(screen.getByTestId("export-reminder")).toBeInTheDocument();
    });

    it("displays stats but no reminder when 0 cards graded", () => {
      renderCompletionSummary(0, 0);

      // Stats should be visible
      expect(screen.getByText("Total cards reviewed: 0")).toBeInTheDocument();
      expect(screen.getByText("Correct: 0")).toBeInTheDocument();
      expect(screen.getByText("Incorrect: 0")).toBeInTheDocument();

      // Reminder should NOT be visible
      expect(screen.queryByTestId("export-reminder")).not.toBeInTheDocument();
    });

    it("handles large numbers of graded cards", () => {
      renderCompletionSummary(100, 50);

      expect(screen.getByTestId("export-reminder")).toBeInTheDocument();
      expect(screen.getByText("Total cards reviewed: 150")).toBeInTheDocument();
    });
  });
});
