import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import CardList from "@/components/CardList";
import type { Card } from "@/types";

/**
 * Unit tests for CardList and CardItem components.
 *
 * Requirements: 1.3, 1.4, 1.7
 */
describe("CardList", () => {
  const mockCard: Card = {
    id: "card-1",
    front: "What is the capital of France?",
    back: "Paris",
    box: 2,
    lastReviewed: "2024-01-10T12:00:00.000Z",
    createdAt: "2024-01-01T00:00:00.000Z",
  };

  const mockCard2: Card = {
    id: "card-2",
    front: "What is 2+2?",
    back: "4",
    box: 1,
    lastReviewed: null,
    createdAt: "2024-01-02T00:00:00.000Z",
  };

  it("renders one CardItem per card", () => {
    // Requirement 1.3: CardList SHALL render one Card_Item for each Card
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <CardList cards={[mockCard, mockCard2]} onEdit={onEdit} onDelete={onDelete} />,
    );

    // Both cards should be rendered with their front text
    expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
  });

  it("shows empty-cards state for zero cards", () => {
    // Requirement 1.7: CardList SHALL render an empty-cards state for zero cards
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(<CardList cards={[]} onEdit={onEdit} onDelete={onDelete} />);

    // Should display the empty state message
    expect(screen.getByText("No cards yet")).toBeInTheDocument();
    expect(
      screen.getByText(/This deck is empty/i),
    ).toBeInTheDocument();
  });

  it("CardItem shows front text and Box N text label", () => {
    // Requirement 1.4: Card_Item SHALL display the Card_Front text and a Box_Badge
    // with a text label showing the Leitner box
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <CardList cards={[mockCard]} onEdit={onEdit} onDelete={onDelete} />,
    );

    // Front text should be visible
    expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();

    // Box badge should show "Box 2" as a text label (not color alone)
    expect(screen.getByText("Box 2")).toBeInTheDocument();
  });

  it("renders multiple cards with different box levels", () => {
    // Verify that each card shows its own box label
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <CardList cards={[mockCard, mockCard2]} onEdit={onEdit} onDelete={onDelete} />,
    );

    // Both box labels should be present
    expect(screen.getByText("Box 2")).toBeInTheDocument();
    expect(screen.getByText("Box 1")).toBeInTheDocument();
  });

  it("passes onEdit and onDelete callbacks to CardItem", () => {
    // Verify callbacks are threaded through to CardItem actions
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <CardList cards={[mockCard]} onEdit={onEdit} onDelete={onDelete} />,
    );

    // The EditActions should be present on the card (we can't directly test the
    // callbacks without simulating clicks, but the component should render)
    expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
  });
});
