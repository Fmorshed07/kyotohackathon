import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PeerPortalLivePreview from "@/components/PeerPortalLivePreview";
import LookingForJobsSection from "@/components/sections/LookingForJobsSection";

vi.mock("@/hooks/useScrollReveal", () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
}));

afterEach(cleanup);

describe("Peer Portal live preview", () => {
  it("keeps a direct link to the live website alongside the embedded preview", () => {
    render(<PeerPortalLivePreview />);
    expect(screen.getByRole("heading", { name: "Peer Portal — live website" })).toBeInTheDocument();
    expect(screen.getByText("www.peerportal.app")).toBeInTheDocument();
    expect(screen.getByText("If the preview is unavailable, open the full website in a new tab.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Open live preview" });
    expect(link).toHaveAttribute("href", "https://www.peerportal.app/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("provides an accessible lazy website embed with fallback guidance", () => {
    render(<PeerPortalLivePreview />);
    expect(screen.getByRole("article", { name: "Peer Portal — live website" })).toHaveAttribute("id", "peer-portal-preview");
    const frame = screen.getByTitle("Peer Portal live website preview");
    expect(frame).toHaveAttribute("src", "https://www.peerportal.app/");
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(frame).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    expect(document.getElementById(frame.getAttribute("aria-describedby")!)).toHaveTextContent("If the preview is unavailable");
    expect(screen.getByRole("link", { name: "Open live preview" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign up|log in/i })).not.toBeInTheDocument();
  });

  it("integrates one website preview and direct action into Get Hired without duplicates", () => {
    const { container } = render(<LookingForJobsSection />);
    expect(screen.getByRole("heading", { name: "Get hired with Peer Portal" })).toBeInTheDocument();
    expect(screen.getAllByRole("article", { name: "Peer Portal — live website" })).toHaveLength(1);
    expect(container.querySelectorAll("#peer-portal-preview")).toHaveLength(1);
    const links = screen.getAllByRole("link", { name: "Open live preview" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://www.peerportal.app/");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(container.querySelectorAll("iframe")).toHaveLength(1);
    expect(screen.getByTitle("Peer Portal live website preview")).toHaveAttribute("src", "https://www.peerportal.app/");
  });
});
