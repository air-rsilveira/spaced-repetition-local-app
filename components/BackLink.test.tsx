import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import BackLink from "./BackLink";

describe("BackLink", () => {
  it("renders an anchor with the given href", () => {
    render(
      <BackLink href="/dashboard">Go back</BackLink>
    );

    const link = screen.getByRole("link", { name: /go back/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders children text", () => {
    render(
      <BackLink href="/">Back to Home</BackLink>
    );

    expect(screen.getByText("Back to Home")).toBeInTheDocument();
  });

  it("applies secondary variant styling by default", () => {
    render(
      <BackLink href="/">Back</BackLink>
    );

    const link = screen.getByRole("link", { name: /back/i });
    expect(link).toHaveClass("border-aws-blue", "text-aws-blue");
  });

  it("applies primary variant styling when specified", () => {
    render(
      <BackLink href="/" variant="primary">
        Next
      </BackLink>
    );

    const link = screen.getByRole("link", { name: /next/i });
    expect(link).toHaveClass("border-aws-orange", "text-aws-orange");
  });

  it("includes base and transition classes", () => {
    render(
      <BackLink href="/">Link</BackLink>
    );

    const link = screen.getByRole("link", { name: /link/i });
    expect(link).toHaveClass(
      "rounded-md",
      "border",
      "px-3",
      "py-1.5",
      "text-sm",
      "font-medium",
      "transition-colors"
    );
  });

  it("is keyboard-focusable", () => {
    render(
      <BackLink href="/test">Focusable</BackLink>
    );

    const link = screen.getByRole("link", { name: /focusable/i });
    link.focus();
    expect(link).toHaveFocus();
  });
});
