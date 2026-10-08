import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGlobeJourney } from "@/hooks/useGlobeJourney";

let top: number;
let visibility: DocumentVisibilityState;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let time: number;
let intersect: (visible: boolean) => void;
let renders: number;
const disconnect = vi.fn();

function Scene({ reduced = false, paused = false }: { reduced?: boolean; paused?: boolean }) {
  const { sectionRef, running } = useGlobeJourney({ reduced, paused });
  renders += 1;
  return (
    <section ref={sectionRef} data-running={running}>
      <div className="journey-copy journey-intro"><h1>Discover the world</h1><a href="#world">Explore the world</a></div>
      <div className="journey-copy journey-connect"><h2>Arrive in Japan</h2><a href="#japan">Explore Japan</a></div>
      <div className="journey-copy journey-begin"><h2>Meet in Kyoto</h2><a href="#kyoto">Explore Kyoto</a></div>
    </section>
  );
}

function flushFrames(count = 90) {
  act(() => {
    for (let i = 0; i < count && frames.size; i += 1) {
      const pending = Array.from(frames.values());
      frames.clear();
      time += 16.67;
      pending.forEach((callback) => callback(time));
    }
  });
}

beforeEach(() => {
  top = 0;
  visibility = "visible";
  frames = new Map();
  nextFrame = 0;
  time = 0;
  renders = 0;
  disconnect.mockClear();
  vi.stubGlobal("innerHeight", 1000);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({
    x: 0, y: top, top, left: 0, right: 1200, bottom: top + 2600, width: 1200, height: 2600, toJSON: () => ({}),
  }));
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) {
      intersect = (isIntersecting) => callback(
        [{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver,
      );
    }
    observe() {}
    disconnect = disconnect;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("globe scroll journey", () => {
  it("starts at the restored scroll position with a coherent chapter", () => {
    top = -800;
    const { container } = render(<Scene />);
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("data-chapter", "connect");
    expect(section).toHaveAttribute("data-running", "true");
    expect(section.style.getPropertyValue("--journey-progress")).toBe("0.50000");
    expect(section.style.getPropertyValue("--intro-opacity")).toBe("0.0000");
    expect(section.style.getPropertyValue("--chapter-opacity")).toBe("1.0000");
    expect(section.style.getPropertyValue("--outro-opacity")).toBe("0.0000");
  });

  it("smooths scroll into the final chapter without rendering React for each frame", () => {
    const { container } = render(<Scene />);
    const section = container.querySelector("section");
    flushFrames();
    const initialRenders = renders;
    top = -1600;
    fireEvent.scroll(window);
    flushFrames(1);
    const firstStep = Number(section.style.getPropertyValue("--journey-progress"));
    expect(firstStep).toBeGreaterThan(0);
    expect(firstStep).toBeLessThan(1);
    flushFrames();
    expect(section).toHaveAttribute("data-chapter", "begin");
    expect(section.style.getPropertyValue("--journey-progress")).toBe("1.00000");
    expect(section.style.getPropertyValue("--outro-opacity")).toBe("1.0000");
    expect(section.style.getPropertyValue("--chapter-opacity")).toBe("0.0000");
    expect(renders).toBe(initialRenders);
    expect(frames.size).toBe(0);
  });

  it("shows the intro for reduced motion and keeps paused chapters navigable without movement", () => {
    top = -900;
    const { container, rerender } = render(<Scene reduced />);
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("data-running", "false");
    expect(section).toHaveAttribute("data-chapter", "intro");
    expect(section.style.getPropertyValue("--journey-progress")).toBe("0.00000");
    expect(section.style.getPropertyValue("--intro-opacity")).toBe("1.0000");
    expect(section.style.getPropertyValue("--chapter-opacity")).toBe("0.0000");
    expect(section.style.getPropertyValue("--outro-opacity")).toBe("0.0000");
    expect(frames.size).toBe(0);

    rerender(<Scene paused />);
    expect(section).toHaveAttribute("data-running", "false");
    expect(section).toHaveAttribute("data-chapter", "connect");
    top = -1450;
    fireEvent.scroll(window);
    flushFrames(1);
    expect(section.style.getPropertyValue("--journey-progress")).toBe("0.90625");
    expect(section).toHaveAttribute("data-chapter", "begin");
    for (const chapter of ["intro", "chapter", "outro"]) {
      expect(section.style.getPropertyValue(`--${chapter}-y`)).toBe("0px");
    }
    expect(frames.size).toBe(0);

    rerender(<Scene />);
    expect(section).toHaveAttribute("data-running", "true");
    expect(section.style.getPropertyValue("--journey-progress")).toBe("0.90625");
  });

  it("suspends work offscreen and in hidden tabs, then restores the current position", () => {
    const { container, unmount } = render(<Scene />);
    const section = container.querySelector("section");
    const measure = vi.mocked(HTMLElement.prototype.getBoundingClientRect);
    act(() => intersect(false));
    expect(section).toHaveAttribute("data-running", "false");
    expect(frames.size).toBe(0);
    measure.mockClear();
    top = -800;
    fireEvent.scroll(window);
    expect(measure).not.toHaveBeenCalled();

    act(() => intersect(true));
    expect(section.style.getPropertyValue("--journey-progress")).toBe("0.50000");
    visibility = "hidden";
    fireEvent(document, new Event("visibilitychange"));
    expect(section).toHaveAttribute("data-running", "false");
    expect(frames.size).toBe(0);
    measure.mockClear();
    top = -1200;
    fireEvent.scroll(window);
    expect(measure).not.toHaveBeenCalled();

    visibility = "visible";
    fireEvent(document, new Event("visibilitychange"));
    expect(section).toHaveAttribute("data-running", "true");
    expect(section.style.getPropertyValue("--journey-progress")).toBe("0.75000");
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    measure.mockClear();
    fireEvent.scroll(window);
    expect(measure).not.toHaveBeenCalled();
  });

  it("exposes only the active chapter's links and keeps the opening h1 accessible", () => {
    const { container } = render(<Scene paused />);
    const intro = container.querySelector(".journey-intro");
    const japan = container.querySelector(".journey-connect");
    const kyoto = container.querySelector(".journey-begin");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Discover the world");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveTextContent("Explore the world");
    expect(intro).not.toHaveAttribute("inert");
    expect(japan).toHaveAttribute("inert");
    expect(kyoto).toHaveAttribute("inert");

    top = -800;
    fireEvent.scroll(window);
    flushFrames(1);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveTextContent("Explore Japan");
    expect(intro).toHaveAttribute("inert");
    expect(intro).toHaveAttribute("aria-hidden", "true");
    expect(japan).not.toHaveAttribute("inert");
    expect(japan).toHaveAttribute("aria-hidden", "false");

    top = -1600;
    fireEvent.scroll(window);
    flushFrames(1);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveTextContent("Explore Kyoto");
    expect(japan).toHaveAttribute("inert");
    expect(kyoto).not.toHaveAttribute("inert");
  });

  it("crossfades continuously across chapter boundaries without a blank text interval", () => {
    const { container } = render(<Scene paused />);
    const section = container.querySelector("section");
    const opacitiesAt = (progress: number) => {
      top = -progress * 1600;
      fireEvent.scroll(window);
      flushFrames(1);
      return ["intro", "chapter", "outro"].map((name) => Number(section.style.getPropertyValue(`--${name}-opacity`)));
    };
    for (const boundary of [0.3, 0.72]) {
      const before = opacitiesAt(boundary - 0.001);
      const after = opacitiesAt(boundary + 0.001);
      expect(before.reduce((total, opacity) => total + opacity, 0)).toBeCloseTo(1, 3);
      expect(after.reduce((total, opacity) => total + opacity, 0)).toBeCloseTo(1, 3);
      before.forEach((opacity, index) => expect(Math.abs(opacity - after[index])).toBeLessThan(0.025));
      expect(Math.max(...before)).toBeGreaterThanOrEqual(0.5);
      expect(Math.max(...after)).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("signals paused scroll updates for one renderer refresh without a recurring loop", () => {
    const { container } = render(<Scene paused />);
    const section = container.querySelector("section");
    const refresh = vi.fn();
    section.addEventListener("globejourneychange", refresh);
    top = -800;
    fireEvent.scroll(window);
    flushFrames(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenLastCalledWith(expect.objectContaining({ detail: { progress: 0.5 } }));
    expect(section).toHaveAttribute("data-running", "false");
    expect(frames.size).toBe(0);
    fireEvent.scroll(window);
    flushFrames(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
