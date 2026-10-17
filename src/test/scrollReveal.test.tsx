import type { CSSProperties, ReactNode } from "react";
import type { HTMLMotionProps } from "framer-motion";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ScrollRevealMotion } from "@/components/ScrollRevealMotion";

vi.mock("framer-motion", async () => {
  const { forwardRef } = await import("react");
  const MotionDiv = forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(({ initial, animate, transition, style, children }, ref) => (
    <div ref={ref} data-testid="motion" data-initial={JSON.stringify(initial)} data-animate={JSON.stringify(animate)} data-transition={JSON.stringify(transition)} style={style as CSSProperties}>{children as ReactNode}</div>
  ));
  MotionDiv.displayName = "MotionDiv";
  return { motion: { div: MotionDiv } };
});

let observers: ObserverMock[];
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let preference: MediaQueryList;
let preferenceListeners: Set<(event: MediaQueryListEvent) => void>;

class ObserverMock {
  constructor(readonly callback: IntersectionObserverCallback, readonly options?: IntersectionObserverInit) {
    observers.push(this);
  }
  observe = vi.fn();
  disconnect = vi.fn();
  emit(isIntersecting: boolean, intersectionRatio = isIntersecting ? 1 : 0) {
    act(() => this.callback([{ isIntersecting, intersectionRatio } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
  }
}

function flushFrame() {
  act(() => {
    const callbacks = Array.from(frames.values());
    frames.clear();
    callbacks.forEach(callback => callback(16.67));
  });
}

function setReducedMotion(matches: boolean) {
  Object.defineProperty(preference, "matches", { value: matches, configurable: true });
  act(() => preferenceListeners.forEach(listener => listener({ matches } as MediaQueryListEvent)));
}

function Reveal({ options }: { options?: Parameters<typeof useScrollReveal>[0] }) {
  const { ref, isVisible, reducedMotion } = useScrollReveal(options);
  return <div ref={ref} data-testid="reveal" data-visible={isVisible} data-reduced={reducedMotion}>Content</div>;
}

beforeEach(() => {
  observers = [];
  frames = new Map();
  nextFrame = 0;
  preferenceListeners = new Set();
  preference = {
    ...window.matchMedia("(prefers-reduced-motion: reduce)"),
    addEventListener: vi.fn((_type, listener) => preferenceListeners.add(listener)),
    removeEventListener: vi.fn((_type, listener) => preferenceListeners.delete(listener)),
  } as unknown as MediaQueryList;
  vi.spyOn(window, "matchMedia").mockReturnValue(preference);
  vi.stubGlobal("IntersectionObserver", ObserverMock);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("viewport reveals", () => {
  it("reveals once at the configured threshold without remounting its observer", () => {
    const { rerender } = render(<Reveal options={{ threshold: 0.2, rootMargin: "0px 0px -24px 0px" }} />);
    const element = screen.getByTestId("reveal");
    expect(element).toHaveAttribute("data-visible", "false");
    expect(observers[0].options).toEqual({ threshold: 0.2, rootMargin: "0px 0px -24px 0px" });
    observers[0].emit(true, 0.19);
    expect(frames.size).toBe(0);
    observers[0].emit(true, 0.2);
    expect(element).toHaveAttribute("data-visible", "false");
    flushFrame();
    expect(element).toHaveAttribute("data-visible", "true");
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    rerender(<Reveal options={{ threshold: 0.2, rootMargin: "0px 0px -24px 0px" }} />);
    observers[0].emit(false);
    expect(observers).toHaveLength(1);
    expect(element).toHaveAttribute("data-visible", "true");
  });

  it("can switch a completed one-time reveal into repeating entry and exit", () => {
    const { rerender } = render(<Reveal />);
    observers[0].emit(true);
    flushFrame();
    rerender(<Reveal options={{ triggerOnce: false }} />);
    expect(observers).toHaveLength(2);
    observers[1].emit(false);
    expect(screen.getByTestId("reveal")).toHaveAttribute("data-visible", "false");
    observers[1].emit(true);
    flushFrame();
    expect(screen.getByTestId("reveal")).toHaveAttribute("data-visible", "true");
    observers[1].emit(false);
    expect(screen.getByTestId("reveal")).toHaveAttribute("data-visible", "false");
    expect(observers[1].disconnect).not.toHaveBeenCalled();
  });

  it.each([true, false])("cancels queued reveals on exit and unmount (triggerOnce=%s)", triggerOnce => {
    const { unmount } = render(<Reveal options={{ triggerOnce }} />);
    observers[0].emit(true);
    expect(frames.size).toBe(1);
    observers[0].emit(false);
    expect(frames.size).toBe(0);
    flushFrame();
    expect(screen.getByTestId("reveal")).toHaveAttribute("data-visible", "false");
    observers[0].emit(true);
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    expect(preferenceListeners.size).toBe(0);
  });

  it("responds to live motion preference changes and resumes repeat tracking", () => {
    render(<Reveal options={{ triggerOnce: false }} />);
    observers[0].emit(true);
    setReducedMotion(true);
    expect(screen.getByTestId("reveal")).toHaveAttribute("data-visible", "true");
    expect(screen.getByTestId("reveal")).toHaveAttribute("data-reduced", "true");
    expect(frames.size).toBe(0);
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    setReducedMotion(false);
    expect(observers).toHaveLength(2);
    observers[1].emit(false);
    expect(screen.getByTestId("reveal")).toHaveAttribute("data-visible", "false");
    observers[1].emit(true);
    flushFrame();
    expect(screen.getByTestId("reveal")).toHaveAttribute("data-visible", "true");
  });

  it("starts visibly for reduced motion and never re-hides completed one-time content", () => {
    setReducedMotion(true);
    render(<Reveal />);
    expect(screen.getByTestId("reveal")).toHaveAttribute("data-visible", "true");
    expect(observers).toHaveLength(0);
    setReducedMotion(false);
    expect(screen.getByTestId("reveal")).toHaveAttribute("data-visible", "true");
    expect(observers).toHaveLength(0);
    expect(frames.size).toBe(0);
  });

  it("keeps content visible when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Reveal />);
    expect(screen.getByTestId("reveal")).toHaveAttribute("data-visible", "true");
    expect(screen.getByTestId("reveal")).toHaveAttribute("data-reduced", "false");
    expect(frames.size).toBe(0);
  });
});

describe("ScrollRevealMotion preferences", () => {
  it("preserves consumer animation targets and timing when motion is allowed", () => {
    const initial = { opacity: 0, x: -42, scale: 0.7 };
    const visible = { opacity: 0.8, x: 12, scale: 0.9 };
    const transition = { duration: 0.6, delay: 0.4 };
    render(<ScrollRevealMotion initial={initial} visible={visible} transition={transition}>Content</ScrollRevealMotion>);
    const element = screen.getByTestId("motion");
    expect(JSON.parse(element.dataset.initial!)).toEqual(initial);
    expect(JSON.parse(element.dataset.animate!)).toEqual({});
    observers[0].emit(true);
    flushFrame();
    expect(JSON.parse(element.dataset.animate!)).toEqual(visible);
    expect(JSON.parse(element.dataset.transition!)).toEqual(transition);
    setReducedMotion(true);
    expect(JSON.parse(element.dataset.initial!)).toBe(false);
    expect(JSON.parse(element.dataset.animate!)).toMatchObject({ ...visible, transition: { duration: 0, delay: 0 } });
    expect(element.style.transition).toBe("none");
  });

  it("uses final keyframes immediately, overriding delayed target and CSS transitions", () => {
    setReducedMotion(true);
    render(<ScrollRevealMotion
      initial={{ opacity: 0, y: 40 }}
      visible={{ opacity: [0, 1], y: [40, 0], scale: [0.9, 1], transition: { opacity: { delay: 2, duration: 3 } } }}
      transition={{ duration: 1, delay: 2 }}
      style={{ borderRadius: 12, transition: "all 0.6s" }}
    >Content</ScrollRevealMotion>);
    const element = screen.getByTestId("motion");
    expect(JSON.parse(element.dataset.initial!)).toBe(false);
    expect(JSON.parse(element.dataset.animate!)).toEqual({ opacity: 1, y: 0, scale: 1, transition: { type: false, duration: 0, delay: 0, repeat: 0 } });
    expect(JSON.parse(element.dataset.transition!)).toEqual({ type: false, duration: 0, delay: 0, repeat: 0 });
    expect(element.style.transition).toBe("none");
    expect(element.style.borderRadius).toBe("12px");
    expect(observers).toHaveLength(0);
  });
});
