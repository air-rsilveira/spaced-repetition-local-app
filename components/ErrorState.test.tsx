import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorState from "./ErrorState";

describe("ErrorState", () => {
  it("renders role='alert' on the wrapping element", () => {
    render(<ErrorState message="An error occurred" />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  it("renders the non-empty message text", () => {
    const message = "The deck could not be found";
    render(<ErrorState message={message} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("renders the default title when not provided", () => {
    render(<ErrorState message="Error" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders a custom title when provided", () => {
    const title = "Deck not found";
    render(<ErrorState title={title} message="The requested deck does not exist" />);
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it("renders the optional action slot when provided", () => {
    const action = <button>Back to Dashboard</button>;
    render(
      <ErrorState
        message="An error occurred"
        action={action}
      />
    );
    expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
  });

  it("does not render an action slot when not provided", () => {
    render(<ErrorState message="An error occurred" />);
    // Verify no button is rendered when no action is provided
    const buttons = screen.queryAllByRole("button");
    expect(buttons).toHaveLength(0);
  });

  it("has aria-live='assertive' for immediate announcement", () => {
    render(<ErrorState message="Error" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });

  it("renders an icon with aria-hidden for decoration", () => {
    const { container } = render(<ErrorState message="Error" />);
    const iconContainer = container.querySelector('[aria-hidden="true"]');
    expect(iconContainer).toBeInTheDocument();
    const svg = iconContainer?.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders error border accent with text (never color alone)", () => {
    const { container } = render(<ErrorState message="Error" />);
    // The error border is applied as a left border with aws-error color
    const borderDiv = container.querySelector(".border-l-4.border-l-aws-error");
    expect(borderDiv).toBeInTheDocument();
    // And the message is rendered as text content (not relying on color alone)
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("renders multiple lines of message text correctly", () => {
    const longMessage = "This is a longer error message that spans multiple lines. It explains what went wrong in more detail.";
    render(<ErrorState message={longMessage} />);
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });
});
