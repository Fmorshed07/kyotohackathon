import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SiteHeader from "@/components/SiteHeader";

vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => ({ sessionUser: null, signOut: vi.fn() }) }));
vi.mock("@/components/GoogleTranslate", () => ({ default: () => <span>Language</span> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("shared header tablet navigation", () => {
  it("uses the roomy desktop breakpoint on the event collection and closes on desktop resize", () => {
    let resize: (() => void) | undefined;
    const media = { ...window.matchMedia("(min-width: 1161px)"), matches: false, addEventListener: vi.fn((_type: string, listener: () => void) => { resize = listener; }), removeEventListener: vi.fn() };
    const matchMedia = vi.spyOn(window, "matchMedia").mockReturnValue(media);
    render(<MemoryRouter initialEntries={["/work"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><SiteHeader /></MemoryRouter>);
    const trigger = screen.getByRole("button", { name: "Open navigation menu" });
    fireEvent.click(trigger);
    expect(matchMedia).toHaveBeenCalledWith("(min-width: 1161px)");
    expect(screen.getByRole("dialog", { name: "Navigation menu" })).toBeVisible();
    expect(document.body.style.overflow).toBe("hidden");
    act(() => { media.matches = true; resize?.(); });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(trigger).toHaveFocus();
  });
  it("keeps all destinations and escape dismissal available in the tablet menu", () => {
    render(<MemoryRouter initialEntries={["/work"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><SiteHeader /></MemoryRouter>);
    const trigger = screen.getByRole("button", { name: "Open navigation menu" });
    fireEvent.click(trigger);
    const menu = within(screen.getByRole("dialog", { name: "Navigation menu" }));
    expect(menu.getByRole("button", { name: "Our work" })).toBeVisible();
    expect(menu.getByRole("button", { name: "Hackathons" })).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
