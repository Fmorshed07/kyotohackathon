import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ImmersiveGlobe from "@/components/ImmersiveGlobe";

let playing: WeakSet<HTMLMediaElement>;

beforeEach(() => {
  vi.useFakeTimers();
  playing = new WeakSet();
  vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(function () {
    return !playing.has(this);
  });
  vi.spyOn(HTMLMediaElement.prototype, "duration", "get").mockReturnValue(10.04);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function () {
    playing.add(this);
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function () {
    playing.delete(this);
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function approachLoop(video: HTMLVideoElement) {
  video.currentTime = 9.3;
  await act(async () => { fireEvent.timeUpdate(video); });
}

describe("immersive globe playback", () => {
  it("crossfades in both directions and resets only the outgoing copy after the fade", async () => {
    const { container } = render(<ImmersiveGlobe running reduced={false} />);
    const [first, second] = Array.from(container.querySelectorAll("video"));

    first.currentTime = 7;
    await act(async () => { fireEvent.timeUpdate(first); });
    expect(first).toHaveClass("is-active");
    expect(second.paused).toBe(true);

    await approachLoop(first);
    expect(second).toHaveClass("is-active");
    expect(first).not.toHaveClass("is-active");
    expect(first).toHaveClass("is-outgoing");
    expect(second).not.toHaveClass("is-outgoing");
    expect(first.paused).toBe(false);
    expect(second.paused).toBe(false);

    act(() => { vi.advanceTimersByTime(1000); });
    expect(first.paused).toBe(true);
    expect(first.currentTime).toBe(0);
    expect(first).not.toHaveClass("is-outgoing");
    expect(second.paused).toBe(false);

    await approachLoop(second);
    expect(first).toHaveClass("is-active");
    expect(second).toHaveClass("is-outgoing");
    expect(first).not.toHaveClass("is-outgoing");
    act(() => { vi.advanceTimersByTime(1000); });
    expect(second.paused).toBe(true);
    expect(second.currentTime).toBe(0);
    expect(second).not.toHaveClass("is-outgoing");
  });

  it("pauses both copies during a fade and resumes the visible copy at its saved position", async () => {
    const { container, rerender } = render(<ImmersiveGlobe running reduced={false} />);
    const [first, second] = Array.from(container.querySelectorAll("video"));
    await approachLoop(first);
    second.currentTime = 0.4;

    rerender(<ImmersiveGlobe running={false} reduced={false} />);
    expect(first.paused).toBe(true);
    expect(second.paused).toBe(true);
    expect(second.currentTime).toBe(0.4);
    expect(vi.getTimerCount()).toBe(0);

    rerender(<ImmersiveGlobe running reduced={false} />);
    expect(first.paused).toBe(true);
    expect(second.paused).toBe(false);
    expect(second.currentTime).toBe(0.4);
    expect(second).toHaveClass("is-active");
  });

  it("holds a still frame for reduced motion and responds when that preference changes", async () => {
    const { container, rerender } = render(<ImmersiveGlobe running reduced />);
    const [first, second] = Array.from(container.querySelectorAll("video"));
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(first.paused).toBe(true);

    rerender(<ImmersiveGlobe running reduced={false} />);
    expect(first.paused).toBe(false);
    await approachLoop(first);
    second.currentTime = 0.4;

    rerender(<ImmersiveGlobe running reduced />);
    expect(first).toHaveClass("is-active");
    expect(second).not.toHaveClass("is-active");
    for (const video of [first, second]) {
      expect(video.paused).toBe(true);
      expect(video.currentTime).toBe(0);
    }
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the outgoing copy visible if playback of the next copy is rejected", async () => {
    const { container } = render(<ImmersiveGlobe running reduced={false} />);
    const [first, second] = Array.from(container.querySelectorAll("video"));
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("Autoplay unavailable"));

    await approachLoop(first);
    expect(first).toHaveClass("is-active");
    expect(second).not.toHaveClass("is-active");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not complete a pending crossfade after playback has been paused", async () => {
    const { container, rerender } = render(<ImmersiveGlobe running reduced={false} />);
    const [first, second] = Array.from(container.querySelectorAll("video"));
    let resolvePlayback: () => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolvePlayback = resolve;
    }));

    await approachLoop(first);
    rerender(<ImmersiveGlobe running={false} reduced={false} />);
    await act(async () => { resolvePlayback(); });

    expect(first).toHaveClass("is-active");
    expect(second).not.toHaveClass("is-active");
    expect(first.paused).toBe(true);
    expect(second.paused).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears fade timers and media listeners on unmount", async () => {
    const { container, unmount } = render(<ImmersiveGlobe running reduced={false} />);
    const [first, second] = Array.from(container.querySelectorAll("video"));
    await approachLoop(first);
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(first.paused).toBe(true);
    expect(second.paused).toBe(true);
    vi.mocked(HTMLMediaElement.prototype.play).mockClear();
    await approachLoop(second);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });
});
