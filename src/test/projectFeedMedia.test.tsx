import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectFeedMedia } from "@/components/projects/ProjectFeedMedia";
import { getProjectFeedVideo, projectFeedEmbedUrl, projectFeedHttpUrl } from "@/lib/projectFeedMedia";

describe("project feed video URLs", () => {
  it("recognizes native signed video URLs and real provider hosts", () => {
    expect(getProjectFeedVideo("https://cdn.example.com/demo.MP4?token=abc")).toEqual({ kind: "native", url: "https://cdn.example.com/demo.MP4?token=abc" });
    expect(getProjectFeedVideo("https://youtu.be/aqz-KE-bpKQ?t=15")).toMatchObject({ kind: "youtube", id: "aqz-KE-bpKQ" });
    expect(getProjectFeedVideo("https://www.youtube.com/watch?feature=share&v=aqz-KE-bpKQ")).toMatchObject({ kind: "youtube", id: "aqz-KE-bpKQ" });
    expect(getProjectFeedVideo("https://youtube.com/shorts/aqz-KE-bpKQ")).toMatchObject({ kind: "youtube", id: "aqz-KE-bpKQ" });
    expect(getProjectFeedVideo("https://vimeo.com/123456789/a1b2c3d4")).toMatchObject({ kind: "vimeo", id: "123456789", hash: "a1b2c3d4" });
    expect(getProjectFeedVideo("https://player.vimeo.com/video/123456789?h=a1b2c3d4")).toMatchObject({ kind: "vimeo", id: "123456789", hash: "a1b2c3d4" });
    expect(getProjectFeedVideo("https://www.loom.com/share/1234567890abcdef1234567890abcdef")).toMatchObject({ kind: "loom", id: "1234567890abcdef1234567890abcdef" });
    expect(getProjectFeedVideo("https://drive.google.com/file/d/abcdef1234567890/view?usp=sharing")).toMatchObject({ kind: "drive", id: "abcdef1234567890" });
  });

  it("rejects provider lookalikes, credentials, and non-web schemes", () => {
    for (const url of ["https://evil.example/youtube.com/embed/aqz-KE-bpKQ", "https://youtube.com.evil.example/watch?v=aqz-KE-bpKQ", "https://youtube.com@evil.example/watch?v=aqz-KE-bpKQ", "https://youtube.com/watch?v=malformed", "javascript:alert(1)", "data:video/mp4;base64,AA", "https://vimeo.com/not-a-video", "https://loom.com.evil.example/share/1234567890abcdef1234567890abcdef", "https://drive.google.com.evil.example/file/d/abcdef1234567890/view"])
      expect(getProjectFeedVideo(url), url).toBeNull();
    expect(projectFeedHttpUrl("javascript:alert(1)")).toBe("");
    expect(getProjectFeedVideo("https://loom.com/share/abc")).toBeNull();
  });

  it("uses muted inline autoplay embeds and preserves unlisted Vimeo access", () => {
    const youtube = getProjectFeedVideo("https://youtu.be/aqz-KE-bpKQ")!;
    const url = new URL(projectFeedEmbedUrl(youtube, { autoplay: true, muted: true, origin: "https://portal.example" }));
    expect(url.origin).toBe("https://www.youtube-nocookie.com");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ autoplay: "1", mute: "1", playsinline: "1", enablejsapi: "1", origin: "https://portal.example" });
    const vimeo = getProjectFeedVideo("https://vimeo.com/123456789/a1b2c3d4")!;
    const vimeoUrl = new URL(projectFeedEmbedUrl(vimeo, { autoplay: false, muted: true }));
    expect(Object.fromEntries(vimeoUrl.searchParams)).toMatchObject({ h: "a1b2c3d4", autoplay: "0", muted: "1", dnt: "1" });
    expect(projectFeedEmbedUrl(getProjectFeedVideo("https://www.loom.com/share/1234567890abcdef1234567890abcdef")!, { autoplay: true, muted: true })).toBe("https://www.loom.com/embed/1234567890abcdef1234567890abcdef");
    expect(projectFeedEmbedUrl(getProjectFeedVideo("https://drive.google.com/file/d/abcdef1234567890/view")!, { autoplay: true, muted: true })).toBe("https://drive.google.com/file/d/abcdef1234567890/preview");
  });
});

describe("project feed playback", () => {
  let visibilityCallback: IntersectionObserverCallback;
  let play: ReturnType<typeof vi.spyOn>;
  let pause: ReturnType<typeof vi.spyOn>;

  const setInView = (visible: boolean) => act(() => visibilityCallback([{ isIntersecting: visible, intersectionRatio: visible ? 0.75 : 0 } as IntersectionObserverEntry], {} as IntersectionObserver));

  beforeEach(() => {
    play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { visibilityCallback = callback; }
      observe() {}
      disconnect() {}
    });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); });

  it("plays muted when visible and pauses offscreen and in a hidden tab", async () => {
    render(<ProjectFeedMedia title="Community demo" videoUrl="https://cdn.example.com/demo.mp4" autoplayEnabled reducedMotion={false} />);
    expect(play).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Community demo demo video")).toHaveProperty("muted", true);
    setInView(true);
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    pause.mockClear();
    setInView(false);
    expect(pause).toHaveBeenCalled();
    setInView(true);
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    pause.mockClear();
    act(() => { Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
    expect(pause).toHaveBeenCalled();
  });

  it("honors reduced motion and allows deliberate play, pause, and sound controls", async () => {
    render(<ProjectFeedMedia title="Quiet demo" videoUrl="https://cdn.example.com/demo.mp4" autoplayEnabled={false} reducedMotion />);
    setInView(true);
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Play Quiet demo video" }));
    await waitFor(() => expect(play).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Unmute Quiet demo video" }));
    expect(screen.getByLabelText("Quiet demo demo video")).toHaveProperty("muted", false);
    fireEvent.click(screen.getByRole("button", { name: "Pause Quiet demo video" }));
    expect(screen.getByRole("button", { name: "Play Quiet demo video" })).toBeInTheDocument();
    setInView(false);
    expect(screen.getByLabelText("Quiet demo demo video")).toHaveProperty("muted", true);
  });

  it("allows explicit autoplay opt-in when reduced motion is enabled", async () => {
    const { rerender } = render(<ProjectFeedMedia title="Opt in demo" videoUrl="https://cdn.example.com/demo.mp4" autoplayEnabled={false} reducedMotion />);
    setInView(true);
    expect(play).not.toHaveBeenCalled();
    rerender(<ProjectFeedMedia title="Opt in demo" videoUrl="https://cdn.example.com/demo.mp4" autoplayEnabled reducedMotion />);
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  });

  it("removes provider frames when offscreen so playback cannot continue", () => {
    render(<ProjectFeedMedia title="Embedded demo" videoUrl="https://youtu.be/aqz-KE-bpKQ" autoplayEnabled reducedMotion={false} />);
    expect(screen.queryByTitle("Embedded demo demo video")).not.toBeInTheDocument();
    setInView(true);
    expect(screen.getByTitle("Embedded demo demo video")).toHaveAttribute("allow", expect.stringContaining("autoplay"));
    setInView(false);
    expect(screen.queryByTitle("Embedded demo demo video")).not.toBeInTheDocument();
  });

  it("offers the original demo when native playback fails or the provider is unsupported", () => {
    const { rerender } = render(<ProjectFeedMedia title="Fallback demo" videoUrl="https://cdn.example.com/demo.mp4" autoplayEnabled reducedMotion={false} />);
    fireEvent.error(screen.getByLabelText("Fallback demo demo video"));
    expect(screen.getByRole("link", { name: "Watch original demo" })).toHaveAttribute("href", "https://cdn.example.com/demo.mp4");
    rerender(<ProjectFeedMedia title="Fallback demo" videoUrl="https://loom.com/share/abc" autoplayEnabled reducedMotion={false} />);
    expect(screen.getByRole("link", { name: "Watch original demo" })).toHaveAttribute("href", "https://loom.com/share/abc");
  });

  it.each([
    ["https://www.loom.com/share/1234567890abcdef1234567890abcdef", "https://www.loom.com/embed/1234567890abcdef1234567890abcdef"],
    ["https://drive.google.com/file/d/abcdef1234567890/view", "https://drive.google.com/file/d/abcdef1234567890/preview"],
  ])("previews %s inline with provider play controls", (url, embedUrl) => {
    render(<ProjectFeedMedia title="Provider demo" videoUrl={url} autoplayEnabled reducedMotion={false} />);
    setInView(true);
    expect(screen.getByTitle("Provider demo demo video")).toHaveAttribute("src", embedUrl);
    expect(screen.getByText("Press play in the preview · provider controls")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unmute Provider demo video" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause Provider demo video" })).not.toBeInTheDocument();
    setInView(false);
    expect(screen.queryByTitle("Provider demo demo video")).not.toBeInTheDocument();
  });
});
