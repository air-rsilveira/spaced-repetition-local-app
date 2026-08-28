import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import Markdown from "@/components/Markdown";

/**
 * Unit tests for the Markdown component.
 *
 * Requirements: 5.3, 5.4, 5.5
 */
describe("Markdown", () => {
  it("renders **bold** as a <strong> element", () => {
    // Requirement 5.3, 5.4: GitHub Flavored Markdown emphasis such as **bold**
    // produces a <strong> element
    render(<Markdown>**bold text**</Markdown>);

    const strongElement = screen.getByText("bold text");
    expect(strongElement.tagName).toBe("STRONG");
  });

  it("renders empty string as an empty preview without error", () => {
    // Requirement 5.5: An empty string renders an empty preview without error
    const { container } = render(<Markdown>{""}</Markdown>);

    // The container should exist and be rendered without throwing
    expect(container).toBeDefined();

    // The rendered output should be essentially empty (only whitespace/container)
    const proseDiv = container.querySelector(".prose");
    expect(proseDiv).toBeDefined();
    // The prose div should be empty or only contain whitespace
    expect(proseDiv?.textContent?.trim()).toBe("");
  });

  it("renders multiple markdown elements correctly", () => {
    // Additional test: verify other markdown elements work too
    render(<Markdown>**bold** and *italic*</Markdown>);

    const strongElement = screen.getByText("bold");
    expect(strongElement.tagName).toBe("STRONG");

    const emElement = screen.getByText("italic");
    expect(emElement.tagName).toBe("EM");
  });

  it("renders plain text without extra markup", () => {
    // Verify plain text is rendered correctly
    const { container } = render(<Markdown>plain text</Markdown>);

    const textContent = container.textContent;
    expect(textContent).toContain("plain text");
  });
});
