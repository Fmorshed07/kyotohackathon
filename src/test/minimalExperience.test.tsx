import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnimatedBackground from "@/components/AnimatedBackground";
import HeroSection from "@/components/sections/HeroSection";
import FeaturePreviewSection from "@/components/sections/FeaturePreviewSection";

vi.mock("@/components/ScrollEarth", () => ({
  default: () => <div className="scroll-earth" aria-hidden="true"><canvas /></div>,
}));

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 0, bottom: 2160, height: 2160, left: 0, right: 1280, width: 1280, x: 0, y: 0, toJSON: () => ({}),
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function renderHero() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><HeroSection /></MemoryRouter>);
}

describe("minimal website experience", () => {
  it("keeps homepage destinations available over the decorative globe", () => {
    const { container } = renderHero();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Build beyond borders.");
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector(".scroll-earth")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link", { name: "Explore events" })).toHaveAttribute("href", "#live-events");
    expect(screen.getByRole("link", { name: "Join the community" })).toHaveAttribute("href", "/signin");
  });

  it("lets the user pause and resume the globe motion", () => {
    const { container } = renderHero();
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("data-motion", "on");
    fireEvent.click(screen.getByRole("button", { name: "Pause background animation" }));
    expect(section).toHaveAttribute("data-motion", "off");
    fireEvent.click(screen.getByRole("button", { name: "Resume background animation" }));
    expect(section).toHaveAttribute("data-motion", "on");
  });

  it("starts the complete globe experience without requiring an enable-motion step", () => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
    const { container } = renderHero();
    expect(container.querySelector("section")).toHaveAttribute("data-reduced", "false");
    expect(container.querySelector("section")).toHaveAttribute("data-motion", "on");
    expect(screen.queryByRole("button", { name: "Enable 3D motion" })).toBeNull();
    expect(screen.getByRole("button", { name: "Pause background animation" })).toBeEnabled();
  });

  it("keeps shared page decoration static and out of the accessibility tree", () => {
    const { container } = render(<AnimatedBackground />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("img, video, canvas")).toBeNull();
  });

  it("exposes all three feature destinations without an auto-rotating preview", () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><FeaturePreviewSection /></MemoryRouter>);
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Browse projects/ })).toHaveAttribute("href", "/projects");
    expect(screen.getByRole("link", { name: /Explore events/ })).toHaveAttribute("href", "/hackathons");
    expect(screen.getByRole("link", { name: /Host an event/ })).toHaveAttribute("href", "/host/signin");
  });
});
