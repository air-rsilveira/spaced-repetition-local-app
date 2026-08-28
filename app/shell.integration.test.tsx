import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

import AppHeader from "@/components/AppHeader";
import { NAV_ITEMS } from "@/components/NavLinks";
import { DecksProvider } from "@/contexts/DecksContext";

/**
 * Integration example test for the app shell (Requirements 1.1, 1.4, 1.9).
 *
 * Testing `app/layout.tsx` directly is awkward because it renders `<html>` and
 * `<body>`. Instead we compose the shell pieces exactly the way the layout does
 * — `<AppHeader />` followed by a `<DecksProvider>` wrapping a single `<main>`
 * region — so the real `AppHeader`, `NavLinks`, and provider are exercised.
 *
 * `NavLinks` reads the active route via `usePathname`; mock it so the shell can
 * render deterministically at "/".
 */
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

/** Mirrors the shell composition in `app/layout.tsx`. */
function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <DecksProvider>
        <main className="flex flex-1 flex-col">{children}</main>
      </DecksProvider>
    </>
  );
}

describe("app shell integration", () => {
  // Requirement 1.1: the App_Header is rendered at the top of the route.
  // Requirement 1.2: the application name is visible text.
  it("renders the AppHeader with the app name on the route (1.1)", () => {
    render(<AppShell>route content</AppShell>);

    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
    expect(within(header).getByText("Spaced Repetition")).toBeInTheDocument();
  });

  // Requirement 1.4: exactly one main content region is rendered.
  it("renders exactly one main content region (1.4)", () => {
    render(<AppShell>route content</AppShell>);

    const mains = screen.getAllByRole("main");
    expect(mains).toHaveLength(1);
    expect(mains[0]).toHaveTextContent("route content");
  });

  // Requirement 1.9: navigation destinations render as anchors with the
  // correct href, and the header persists alongside the main region.
  it("renders nav items as links with correct hrefs while the header persists (1.9)", () => {
    render(<AppShell>route content</AppShell>);

    const header = screen.getByRole("banner");
    const links = within(header).getAllByRole("link");

    expect(links).toHaveLength(NAV_ITEMS.length);

    NAV_ITEMS.forEach((item, index) => {
      const link = links[index];
      expect(link).toHaveAttribute("href", item.href);
      expect(link).toHaveTextContent(item.label);
    });

    // The header remains rendered alongside the single main region.
    expect(header).toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });
});
