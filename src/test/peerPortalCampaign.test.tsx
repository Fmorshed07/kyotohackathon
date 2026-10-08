import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PeerPortalCampaign from "@/components/PeerPortalCampaign";
import LookingForJobsSection from "@/components/sections/LookingForJobsSection";

afterEach(cleanup);

const guideTitles = [
  "Create your free Peer Portal account",
  "Import your Cognisor builder story",
  "Score your CV for Japan-fit hires",
  "Ship resume + portfolio assets",
  "Match roles that can hire you",
  "Apply, interview, and get hired",
];

describe("Peer Portal campaign", () => {
  it("shows the supplied artwork with a descriptive alternative and a direct external action", () => {
    const { container } = render(<PeerPortalCampaign />);

    const artwork = screen.getByRole("img", { name: /Peer Portal/i });
    expect(artwork).toHaveAccessibleName(/career|hir|job|profile|opportunit|Japan/i);
    expect(artwork).toHaveAttribute("src", "/images/peer-portal-careers.png");
    expect(artwork).toHaveAttribute("width", "1080");
    expect(artwork).toHaveAttribute("height", "1080");

    const link = screen.getByRole("link", { name: "Explore Peer Portal" });
    expect(link).toHaveAttribute("href", "https://peerportal.app/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(container.querySelector("iframe")).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/live[\s-]*(?:website[\s-]*)?preview|preview is unavailable/i);
  });

  it("integrates one campaign into the accessible Get Hired section without the old embed", () => {
    render(<LookingForJobsSection />);

    const section = screen.getByRole("region", { name: "Get hired with Peer Portal" });
    expect(section).toHaveAttribute("id", "get-hired");
    expect(within(section).getByRole("heading", { name: "Get hired with Peer Portal" })).toBeInTheDocument();
    expect(within(section).getAllByRole("img", { name: /Peer Portal/i })).toHaveLength(1);
    expect(within(section).getAllByRole("link", { name: "Explore Peer Portal" })).toHaveLength(1);
    expect(section.querySelector("iframe")).not.toBeInTheDocument();
    expect(section).not.toHaveTextContent(/live[\s-]*(?:website[\s-]*)?preview|preview is unavailable/i);
  });

  it("lets visitors open and close the retained six-step career guide using native details", () => {
    render(<LookingForJobsSection />);

    const summary = screen.getByText("Your path from profile to opportunity");
    const details = summary.closest("details");
    expect(details).not.toBeNull();
    expect(summary.closest("summary")).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    for (const title of guideTitles) {
      expect(screen.getByText(title)).not.toBeVisible();
    }

    fireEvent.click(summary);

    expect(details).toHaveAttribute("open");
    for (const title of guideTitles) {
      expect(screen.getByRole("heading", { name: title })).toBeVisible();
    }
    const steps = details!.querySelectorAll("ol > li");
    expect(steps).toHaveLength(6);
    guideTitles.forEach((title, index) => {
      expect(within(steps[index] as HTMLElement).getByRole("heading", { name: title })).toBeInTheDocument();
    });

    fireEvent.click(summary);

    expect(details).not.toHaveAttribute("open");
    expect(screen.getByText(guideTitles[0])).not.toBeVisible();
  });
});
