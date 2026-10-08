import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HeroSection from "@/components/sections/HeroSection";

vi.mock("@/components/ScrollEarth", () => ({ default: () => null }));

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;

function flushFrame() {
  act(() => {
    const pending = Array.from(frames.values());
    frames.clear();
    pending.forEach(callback => callback(16.67));
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  frames = new Map();
  nextFrame = 0;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
  vi.stubGlobal("scrollY", 0);
  vi.stubGlobal("scrollX", 0);
  vi.spyOn(window, "scrollTo").mockImplementation((options: ScrollToOptions | number) => {
    if (typeof options === "object") vi.stubGlobal("scrollY", options?.top ?? 0);
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({
    top: -window.scrollY, bottom: 2340 - window.scrollY, height: 2340, left: 0, right: 1440, width: 1440, x: 0, y: -window.scrollY, toJSON: () => ({}),
  }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (frame: number) => frames.delete(frame));
  document.documentElement.style.overflowAnchor = "auto";
  document.body.style.overflowAnchor = "auto";
  document.documentElement.style.scrollBehavior = "smooth";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.documentElement.style.overflowAnchor = "";
  document.body.style.overflowAnchor = "";
  document.documentElement.style.scrollBehavior = "";
});

function renderHero() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><HeroSection /></MemoryRouter>);
}

describe("full-motion viewport", () => {
  it("pauses and resumes without jumping or changing the page geometry", () => {
    const { container } = renderHero();
    const toggle = screen.getByRole("button", { name: "Pause background animation" });
    toggle.focus();
    vi.stubGlobal("scrollY", 352);
    fireEvent.click(toggle);
    expect(container.querySelector("section")).toHaveAttribute("data-reduced", "false");
    expect(container.querySelector("section")).toHaveAttribute("data-motion", "off");
    fireEvent.click(screen.getByRole("button", { name: "Resume background animation" }));
    expect(container.querySelector("section")).toHaveAttribute("data-motion", "on");
    flushFrame();
    expect(window.scrollY).toBe(352);
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(toggle).toHaveFocus();
    expect(document.documentElement.style.overflowAnchor).toBe("auto");
    expect(document.body.style.overflowAnchor).toBe("auto");
    expect(document.documentElement.style.scrollBehavior).toBe("smooth");
  });

  it("restores document styles and cancels pending restoration frames on unmount", () => {
    const { unmount } = renderHero();
    expect(frames.size).toBeGreaterThan(0);
    unmount();
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(document.documentElement.style.overflowAnchor).toBe("auto");
    expect(document.body.style.overflowAnchor).toBe("auto");
    expect(document.documentElement.style.scrollBehavior).toBe("smooth");
  });

  it("allows natural scrolling and uses smooth movement for scene navigation", () => {
    renderHero();
    fireEvent.wheel(window, { deltaY: 120 });
    vi.stubGlobal("scrollY", 120);
    fireEvent.scroll(window);
    expect(window.scrollY).toBe(120);
    expect(vi.getTimerCount()).toBe(0);
    expect(document.documentElement.style.overflowAnchor).toBe("auto");
    expect(document.body.style.overflowAnchor).toBe("auto");
    fireEvent.click(screen.getByRole("button", { name: "Arrive in Tokyo" }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: (2340 - window.innerHeight) * .96, behavior: "smooth" });
  });
});
