import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScrollEarth from "@/components/ScrollEarth";
import { createEarthScene, type EarthOptions } from "@/lib/earthScene";
import { createEarthCanvasScene } from "@/lib/earthCanvasScene";
import { getJapanCamera } from "@/lib/japanCamera";

vi.mock("@/lib/earthScene", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/earthScene")>(),
  createEarthScene: vi.fn(() => null),
}));

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let timestamp: number;
let width: number;
let height: number;
let dotCount: number;
let lineCount: number;
let globeRadii: number[];
let resize: () => void;
let disconnect: ReturnType<typeof vi.fn>;
let clearRect: ReturnType<typeof vi.fn>;

function flushFrames(count = 1) {
  act(() => {
    for (let index = 0; index < count; index++) {
      const pending = Array.from(frames.values());
      frames.clear();
      timestamp += 16.67;
      pending.forEach(callback => callback(timestamp));
    }
  });
}

beforeEach(() => {
  frames = new Map();
  nextFrame = 0;
  timestamp = 0;
  width = 1440;
  height = 900;
  dotCount = 0;
  lineCount = 0;
  globeRadii = [];
  disconnect = vi.fn();
  clearRect = vi.fn();
  vi.mocked(createEarthScene).mockReset().mockReturnValue(null);
  const context = {
    setTransform: () => {}, clearRect,
    beginPath: () => {}, moveTo: () => {}, fill: () => {}, stroke: () => {},
    arc: (_x: number, _y: number, radius: number) => {
      if (radius > 100) globeRadii.push(radius);
      else dotCount++;
    },
    lineTo: () => { lineCount++; },
    createRadialGradient: () => ({ addColorStop: () => {} }),
    globalAlpha: 1, fillStyle: "", strokeStyle: "", lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((kind: string) => kind === "2d" ? context : null);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({
    top: 0, bottom: height, height, left: 0, right: width, width, x: 0, y: 0, toJSON: () => ({}),
  }));
  vi.stubGlobal("devicePixelRatio", 3);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (frame: number) => frames.delete(frame));
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
    disconnect() { disconnect(); }
  });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function view(progress: { current: number }, running = false, reduced = false) {
  return <section className="globe-journey"><div className="journey-stage"><ScrollEarth running={running} progress={progress} reduced={reduced} /></div></section>;
}

describe("Earth rendering without WebGL", () => {
  it("uses the detailed local geography and the same full-size opening camera", () => {
    const { container } = render(view({ current: 0 }));
    flushFrames();
    const canvas = container.querySelector<HTMLCanvasElement>('canvas[data-renderer="canvas2d"]')!;
    expect(container.querySelector(".scroll-earth")).toHaveAttribute("data-renderer", "canvas2d");
    expect(container.querySelector("svg")).toBeNull();
    expect(canvas.width).toBe(2160);
    expect(canvas.height).toBe(1350);
    expect(canvas).toHaveAttribute("data-camera", "world");
    expect(globeRadii).toContain(getJapanCamera({ width, height, progress: 0 }).radius);
    expect(dotCount).toBeGreaterThan(2000);
    expect(lineCount).toBeGreaterThan(1000);
    expect(frames.size).toBe(0);
  });

  it("paints the current Japan/Tokyo view while paused and follows viewport resizing", () => {
    const progress = { current: 0 };
    const { container } = render(view(progress));
    flushFrames();
    progress.current = 1;
    fireEvent(container.querySelector("section")!, new Event("globejourneychange"));
    flushFrames();
    const canvas = container.querySelector('canvas[data-renderer="canvas2d"]')!;
    const stage = container.querySelector<HTMLElement>(".journey-stage")!;
    expect(canvas).toHaveAttribute("data-camera", "japan");
    expect(canvas).toHaveAttribute("data-progress", "1.000");
    expect(stage.style.getPropertyValue("--tokyo-x")).toBe("964.80px");
    expect(stage.style.getPropertyValue("--tokyo-y")).toBe("585.00px");
    expect(stage.style.getPropertyValue("--location-opacity")).toBe("1.0000");
    expect(frames.size).toBe(0);
    width = 390;
    height = 844;
    act(() => resize());
    flushFrames();
    expect(stage.style.getPropertyValue("--tokyo-x")).toBe("195.00px");
    expect(stage.style.getPropertyValue("--tokyo-y")).toBe("582.36px");
    expect(frames.size).toBe(0);
  });

  it("caps animation work, stops when paused or reduced, and disposes its frame and listeners", () => {
    const progress = { current: 0 };
    const { container, rerender, unmount } = render(view(progress, true));
    flushFrames(6);
    expect(clearRect).toHaveBeenCalledTimes(3);
    expect(frames.size).toBe(1);
    rerender(view(progress));
    flushFrames();
    expect(frames.size).toBe(0);
    progress.current = 1;
    rerender(view(progress, true, true));
    flushFrames();
    expect(container.querySelector('canvas[data-renderer="canvas2d"]')).toHaveAttribute("data-progress", "0.000");
    expect(frames.size).toBe(0);
    rerender(view(progress, true));
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    expect(disconnect).toHaveBeenCalledTimes(1);
    const paints = clearRect.mock.calls.length;
    fireEvent.scroll(window);
    flushFrames();
    expect(clearRect.mock.calls.length).toBe(paints);
  });

  it("keeps the detailed fallback after context loss and returns to WebGL when it is restored", () => {
    let options: EarthOptions;
    const primary = { refresh: vi.fn(), dispose: vi.fn() };
    vi.mocked(createEarthScene).mockImplementation((_canvas, nextOptions) => { options = nextOptions; return primary; });
    const { container, unmount } = render(view({ current: 0 }));
    expect(container.querySelector(".scroll-earth")).toHaveAttribute("data-renderer", "webgl");
    act(() => options.onUnavailable());
    flushFrames();
    expect(container.querySelector(".scroll-earth")).toHaveAttribute("data-renderer", "canvas2d");
    expect(dotCount).toBeGreaterThan(2000);
    fireEvent(container.querySelector("canvas")!, new Event("webglcontextrestored"));
    expect(createEarthScene).toHaveBeenCalledTimes(2);
    expect(container.querySelector(".scroll-earth")).toHaveAttribute("data-renderer", "webgl");
    expect(container.querySelector('canvas[data-renderer="canvas2d"]')).toBeNull();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(primary.dispose).toHaveBeenCalledTimes(1);
    unmount();
    expect(primary.dispose).toHaveBeenCalledTimes(2);
  });

  it("returns gracefully when the browser cannot provide a 2D context either", () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    expect(createEarthCanvasScene(document.createElement("canvas"), {
      progress: () => 0, running: () => false, reduced: () => false, onUnavailable: () => {},
    })).toBeNull();
    expect(frames.size).toBe(0);
  });
});
