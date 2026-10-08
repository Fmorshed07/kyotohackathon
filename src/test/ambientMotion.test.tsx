import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAmbientMotion } from "@/hooks/useAmbientMotion";

function AmbientScene() {
  const { ref, paused, setPaused, running } = useAmbientMotion();
  return <section ref={ref} data-testid="scene" data-motion={running ? "on" : "off"}><button onClick={() => setPaused(value => !value)}>{paused ? "Resume" : "Pause"}</button></section>;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("full ambient motion", () => {
  it("starts animated despite an OS reduced-motion preference and still allows manual pause", () => {
    const media = window.matchMedia("");
    vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
    render(<AmbientScene />);
    expect(screen.getByTestId("scene")).toHaveAttribute("data-motion", "on");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByTestId("scene")).toHaveAttribute("data-motion", "off");
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByTestId("scene")).toHaveAttribute("data-motion", "on");
  });
  it("suspends hidden tabs and preserves an explicit pause after returning", () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    render(<AmbientScene />);
    visibility.mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(screen.getByTestId("scene")).toHaveAttribute("data-motion", "off");
    visibility.mockReturnValue("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(screen.getByTestId("scene")).toHaveAttribute("data-motion", "on");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    visibility.mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    visibility.mockReturnValue("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(screen.getByTestId("scene")).toHaveAttribute("data-motion", "off");
  });
  it("suspends off-screen scenes and disconnects its observer on unmount", () => {
    let intersect: ((entries: Array<{ isIntersecting: boolean }>) => void) | undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal("IntersectionObserver", vi.fn(callback => { intersect = callback; return { observe, disconnect }; }));
    const view = render(<AmbientScene />);
    expect(observe).toHaveBeenCalledWith(screen.getByTestId("scene"));
    act(() => intersect?.([{ isIntersecting: false }]));
    expect(screen.getByTestId("scene")).toHaveAttribute("data-motion", "off");
    act(() => intersect?.([{ isIntersecting: true }]));
    expect(screen.getByTestId("scene")).toHaveAttribute("data-motion", "on");
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
