import { describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { cleanup, render, screen } from "@testing-library/react";

import NavLinks, { NAV_ITEMS } from "@/components/NavLinks";
import { arbPathname } from "@/test/arbitraries";

// Mock the router hook so the property can drive the pathname directly.
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";

const mockUsePathname = vi.mocked(usePathname);

describe("active navigation destination", () => {
  // Feature: walking-skeleton, Property 13: Active navigation destination reflects the current route
  it("marks a destination active iff its href matches the pathname, none active otherwise", () => {
    fc.assert(
      fc.property(arbPathname, (pathname) => {
        mockUsePathname.mockReturnValue(pathname);

        try {
          render(<NavLinks />);

          const links = screen.getAllByRole("link");
          // One rendered link per navigation destination.
          expect(links).toHaveLength(NAV_ITEMS.length);

          links.forEach((link, index) => {
            const item = NAV_ITEMS[index];
            const shouldBeActive = item.href === pathname;

            if (shouldBeActive) {
              // Active: aria-current="page" plus a non-color affordance
              // (bottom border color + bold weight).
              expect(link).toHaveAttribute("aria-current", "page");
              expect(link.className).toContain("border-aws-orange");
              expect(link.className).toContain("font-bold");
            } else {
              // Inactive: no aria-current and no active affordance.
              expect(link).not.toHaveAttribute("aria-current");
              expect(link.className).toContain("border-transparent");
              expect(link.className).toContain("font-normal");
            }
          });

          // When the pathname matches no destination, nothing is active.
          const matchesADestination = NAV_ITEMS.some(
            (item) => item.href === pathname,
          );
          const activeLinks = links.filter(
            (link) => link.getAttribute("aria-current") === "page",
          );
          expect(activeLinks).toHaveLength(matchesADestination ? 1 : 0);
        } finally {
          // Each fast-check run renders fresh; unmount to avoid duplicates.
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });
});
