import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";
import ContextualActionBar from "@/components/ContextualActionBar";
import {
  UIActionsProvider,
  useUIActions,
  type DeckActions,
  type LandingActions,
} from "@/contexts/UIActionsContext";

const mockUsePathname = vi.mocked(usePathname);

/** Registers landing actions on mount so the bar can render them. */
function RegisterLanding({ actions }: { actions: LandingActions }) {
  const { registerLandingActions } = useUIActions();
  useEffect(() => {
    registerLandingActions(actions);
  }, [registerLandingActions, actions]);
  return null;
}

/** Registers deck actions on mount so the bar can render them. */
function RegisterDeck({ actions }: { actions: DeckActions }) {
  const { registerDeckActions } = useUIActions();
  useEffect(() => {
    registerDeckActions(actions);
  }, [registerDeckActions, actions]);
  return null;
}

function renderBar(children: ReactNode) {
  return render(<UIActionsProvider>{children}</UIActionsProvider>);
}

describe("ContextualActionBar", () => {
  beforeEach(() => {
    cleanup();
    mockUsePathname.mockReset();
  });

  it("renders New deck and Upload deck on the landing route and fires callbacks", async () => {
    const user = userEvent.setup();
    mockUsePathname.mockReturnValue("/");
    const onNewDeck = vi.fn();
    const onUploadDeck = vi.fn();

    renderBar(
      <>
        <RegisterLanding actions={{ onNewDeck, onUploadDeck }} />
        <ContextualActionBar />
      </>,
    );

    const newDeck = await screen.findByRole("button", { name: "New deck" });
    const uploadDeck = screen.getByRole("button", { name: "Upload deck" });

    await user.click(newDeck);
    await user.click(uploadDeck);

    expect(onNewDeck).toHaveBeenCalledTimes(1);
    expect(onUploadDeck).toHaveBeenCalledTimes(1);
  });

  it("renders the deck name, Add card, and Study on a deck route", async () => {
    const user = userEvent.setup();
    mockUsePathname.mockReturnValue("/deck/deck-1");
    const onAddCard = vi.fn();

    renderBar(
      <>
        <RegisterDeck
          actions={{
            deckId: "deck-1",
            deckName: "Capitals",
            onAddCard,
            onStudyHref: "/deck/deck-1/review",
          }}
        />
        <ContextualActionBar />
      </>,
    );

    expect(await screen.findByText("Capitals")).toBeInTheDocument();

    // Renamed from "Start review".
    expect(screen.queryByText("Start review")).not.toBeInTheDocument();

    const study = screen.getByRole("link", { name: "Study" });
    expect(study).toHaveAttribute("href", "/deck/deck-1/review");

    // A "Dashboard" link back to the home route is present in the bar.
    const dashboard = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboard).toHaveAttribute("href", "/");

    await user.click(screen.getByRole("button", { name: "Add card" }));
    expect(onAddCard).toHaveBeenCalledTimes(1);
  });

  it("renders nothing on an unmatched route (e.g. review)", () => {
    mockUsePathname.mockReturnValue("/deck/deck-1/review");

    const { container } = renderBar(
      <>
        <RegisterDeck
          actions={{
            deckId: "deck-1",
            deckName: "Capitals",
            onAddCard: vi.fn(),
            onStudyHref: "/deck/deck-1/review",
          }}
        />
        <ContextualActionBar />
      </>,
    );

    // No landing or deck controls render on the review route.
    expect(screen.queryByRole("button", { name: "New deck" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add card" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Study" })).toBeNull();
    // The bar itself contributes no chrome.
    expect(container.querySelector("h1")).toBeNull();
  });

  it("renders nothing when no actions are registered", () => {
    mockUsePathname.mockReturnValue("/");

    renderBar(<ContextualActionBar />);

    expect(screen.queryByRole("button", { name: "New deck" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Upload deck" })).toBeNull();
  });

  // Integration: navigating landing -> deck -> review swaps then clears the
  // bar's actions. A single page component registers/clears based on the
  // current route, mirroring how the real pages behave on navigation.
  it("swaps landing -> deck actions and clears them on the review route", () => {
    function RoutePage() {
      const pathname = usePathname();
      const { registerLandingActions, registerDeckActions, clear } =
        useUIActions();
      useEffect(() => {
        if (pathname === "/") {
          registerLandingActions({
            onNewDeck: vi.fn(),
            onUploadDeck: vi.fn(),
          });
        } else if (/^\/deck\/[^/]+$/.test(pathname ?? "")) {
          registerDeckActions({
            deckId: "deck-1",
            deckName: "Capitals",
            onAddCard: vi.fn(),
            onStudyHref: "/deck/deck-1/review",
          });
        } else {
          clear();
        }
        return () => clear();
      }, [pathname, registerLandingActions, registerDeckActions, clear]);
      return null;
    }

    // Landing.
    mockUsePathname.mockReturnValue("/");
    const { rerender } = render(
      <UIActionsProvider>
        <RoutePage />
        <ContextualActionBar />
      </UIActionsProvider>,
    );
    expect(screen.getByRole("button", { name: "New deck" })).toBeInTheDocument();

    // Navigate to the deck page: deck actions replace landing actions.
    mockUsePathname.mockReturnValue("/deck/deck-1");
    rerender(
      <UIActionsProvider>
        <RoutePage />
        <ContextualActionBar />
      </UIActionsProvider>,
    );
    expect(screen.queryByRole("button", { name: "New deck" })).toBeNull();
    expect(screen.getByText("Capitals")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Study" })).toBeInTheDocument();

    // Navigate to the review route: the bar clears (no deck/landing controls).
    mockUsePathname.mockReturnValue("/deck/deck-1/review");
    rerender(
      <UIActionsProvider>
        <RoutePage />
        <ContextualActionBar />
      </UIActionsProvider>,
    );
    expect(screen.queryByText("Capitals")).toBeNull();
    expect(screen.queryByRole("link", { name: "Study" })).toBeNull();
    expect(screen.queryByRole("button", { name: "New deck" })).toBeNull();
  });
});
