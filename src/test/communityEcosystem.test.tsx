import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import JapanHeroSection from "@/components/ecosystem/JapanHeroSection";
import PartnersSection from "@/components/ecosystem/PartnersSection";
import { CommunityEventArt } from "@/components/ecosystem/CommunityEventArt";
import { COMMUNITY_PARTNERS, FEATURED_BRAND_ROWS } from "@/data/communityPartners";
import { communityEventCity, communityEventHref, communityEventKind, communityEventPartners, communityEventStatus, filterCommunityEvents, projectJapanPoint } from "@/lib/communityEcosystem";
import { ELEVENLABS_MEETUP } from "@/lib/elevenLabsMeetup";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const filters = { search: "", city: "", kind: "", partner: "", status: "" };
const start = Date.parse(ELEVENLABS_MEETUP.startAt!);
const end = Date.parse(ELEVENLABS_MEETUP.endAt!);

describe("Japan community experience", () => {
  it("renders a native Japan map without background image or video", () => {
    const { container } = render(<MemoryRouter><JapanHeroSection /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Japan builds.The world moves.");
    expect(container.querySelector("img, video, canvas")).toBeNull();
    expect(container.querySelector(".japan-map-art")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link", { name: "Explore events" })).toHaveAttribute("href", "#live-events");
    expect(screen.getByRole("button", { name: "Explore Tokyo" })).toHaveAttribute("aria-pressed", "true");
  });

  it("changes the city story and destination on selection", () => {
    render(<MemoryRouter><JapanHeroSection /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Explore Kyoto" }));
    expect(screen.getByRole("button", { name: "Explore Kyoto" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Discover Kyoto events" })).toHaveAttribute("href", "/work?city=Kyoto");
    expect(screen.getByText("Old traditions. Entirely new possibilities.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Explore Osaka" }));
    expect(screen.getByRole("link", { name: "Discover Osaka events" })).toHaveAttribute("href", "https://www.cognisorai.com/events/impact-osaka-hackathon-2026");
  });

  it("pauses and resumes map movement", () => {
    const { container } = render(<MemoryRouter><JapanHeroSection /></MemoryRouter>);
    expect(container.querySelector("section")).toHaveAttribute("data-motion", "on");
    fireEvent.click(screen.getByRole("button", { name: "Pause background animation" }));
    expect(container.querySelector("section")).toHaveAttribute("data-motion", "off");
    fireEvent.click(screen.getByRole("button", { name: "Resume background animation" }));
    expect(container.querySelector("section")).toHaveAttribute("data-motion", "on");
  });

  it("plays map and logos by default even when the OS requests reduced motion", () => {
    const media = window.matchMedia("");
    vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
    const { container } = render(<MemoryRouter><JapanHeroSection /><PartnersSection /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Pause background animation" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Pause partner animation" })).toBeEnabled();
    expect(container.querySelectorAll('[data-motion="on"]')).toHaveLength(2);
    expect(screen.queryByText("Reduced motion")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Pause partner animation" }));
    expect(container.querySelector('#partners')).toHaveAttribute("data-motion", "off");
    fireEvent.click(screen.getByRole("button", { name: "Resume partner animation" }));
    expect(container.querySelector('#partners')).toHaveAttribute("data-motion", "on");
  });

  it("offers all 51 source logos in a static directory, without announcing marquee duplicates", () => {
    render(<PartnersSection />);
    expect(COMMUNITY_PARTNERS).toHaveLength(51);
    expect(new Set(COMMUNITY_PARTNERS.map(partner => partner.image)).size).toBe(51);
    expect(screen.getAllByRole("img")).toHaveLength(9);
    fireEvent.click(screen.getByRole("button", { name: "Pause partner animation" }));
    expect(screen.getByRole("button", { name: "Resume partner animation" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /View every logo/ }));
    expect(screen.getByRole("button", { name: /Back to the logo wall/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("img")).toHaveLength(51);
    expect(screen.getByRole("img", { name: "ElevenLabs" })).toBeVisible();
    expect(screen.queryByRole("img", { name: "OpenAI" })).toBeNull();
    expect(screen.getByRole("button", { name: "Partner directory is static" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Back to the logo wall/ }));
    expect(screen.getAllByRole("img")).toHaveLength(9);
    expect(screen.getByRole("button", { name: "Resume partner animation" })).toHaveAttribute("aria-pressed", "true");
  });

  it("prioritises all requested brands in two seamless rows with accessible originals only", () => {
    const { container } = render(<PartnersSection />);
    expect(FEATURED_BRAND_ROWS.flat().map(brand => brand.name)).toEqual([
      "Alchemist Japan", "Antler", "ElevenLabs", "Qwen", "Alibaba Cloud",
      "Creators Circuit", "Tokyo International University — Impact Next", "Lovable", "OpenAI",
    ]);
    expect(container.querySelectorAll(".partner-ribbon")).toHaveLength(2);
    for (const track of container.querySelectorAll(".partner-track")) {
      const [original, duplicate] = track.querySelectorAll(".partner-track-set");
      expect(duplicate).toHaveAttribute("aria-hidden", "true");
      expect(Array.from(original.querySelectorAll("[data-logo-source]"), logo => logo.getAttribute("data-logo-source")))
        .toEqual(Array.from(duplicate.querySelectorAll("[data-logo-source]"), logo => logo.getAttribute("data-logo-source")));
      expect(Array.from(duplicate.querySelectorAll("img"), img => img.alt)).toEqual(
        Array(duplicate.querySelectorAll("img").length).fill(""),
      );
    }
    expect(screen.getByRole("img", { name: "OpenAI" }).closest(".partner-logo"))
      .toHaveTextContent("Technology");
  });

  it("keeps a brand readable if its logo cannot load", () => {
    render(<PartnersSection />);
    fireEvent.error(screen.getByRole("img", { name: "Alchemist Japan" }));
    expect(screen.getByRole("img", { name: "Alchemist Japan" })).toHaveTextContent("Alchemist Japan");
  });

  it("uses replacement artwork without blend-mode dependency and unique community masks", () => {
    const { container } = render(<PartnersSection />);
    expect(FEATURED_BRAND_ROWS.flat().every(brand => brand.transparentArtwork)).toBe(true);
    expect(FEATURED_BRAND_ROWS.flat().every(brand => brand.image.startsWith("/partners/featured/"))).toBe(true);
    expect(FEATURED_BRAND_ROWS.flat().filter(brand => brand.image.endsWith(".svg"))).toHaveLength(7);
    const masks = Array.from(container.querySelectorAll("mask"));
    expect(masks).toHaveLength(4);
    expect(new Set(masks.map(mask => mask.id)).size).toBe(4);
    for (const name of ["Creators Circuit", "Tokyo International University — Impact Next"]) {
      const logo = screen.getByRole("img", { name });
      expect(logo.tagName.toLowerCase()).toBe("svg");
      const image = logo.querySelector("image")!;
      expect(image).toHaveAttribute("href", expect.stringContaining("/partners/featured/"));
      fireEvent.error(image);
      expect(screen.getByRole("img", { name })).toHaveTextContent(name);
    }
  });

  it("provides a readable fallback when event artwork fails", () => {
    const { container } = render(<CommunityEventArt event={ELEVENLABS_MEETUP} />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".is-fallback")).toHaveTextContent("ElevenLabs Tokyo");
  });
});

describe("community catalog filters", () => {
  it("recognises cities inside venue addresses and Japanese names", () => {
    expect(communityEventCity(ELEVENLABS_MEETUP)).toBe("Tokyo");
    expect(communityEventCity({ location: "京都市、Japan" })).toBe("Kyoto");
    expect(communityEventCity({ location: "大阪、日本" })).toBe("Osaka");
    expect(communityEventCity({ location: "Virtual" })).toBe("Online");
  });
  it("projects Tokyo consistently with the native coastline", () => {
    const point = projectJapanPoint(139.6917, 35.6895);
    expect(point.x).toBeCloseTo(442.2925);
    expect(point.y).toBeCloseTo(257.7625);
  });
  it("uses exact start/end timestamps over stale saved status", () => {
    expect(communityEventStatus(ELEVENLABS_MEETUP, start - 1)).toBe("upcoming");
    expect(communityEventStatus(ELEVENLABS_MEETUP, start)).toBe("active");
    expect(communityEventStatus(ELEVENLABS_MEETUP, end)).toBe("past");
    expect(communityEventStatus({ ...ELEVENLABS_MEETUP, startAt: "invalid", status: "past" }, start)).toBe("past");
  });
  it("filters real organisers, city, type, date status, and search together", () => {
    expect(communityEventKind(ELEVENLABS_MEETUP)).toBe("Meetups");
    expect(communityEventKind({ name: "Impact Dhaka 2026", format: "Portal catalog" })).toBe("Hackathons");
    expect(communityEventPartners(ELEVENLABS_MEETUP)).toContain("ElevenLabs");
    expect(filterCommunityEvents([ELEVENLABS_MEETUP], { search: "creative", city: "Tokyo", kind: "Meetups", partner: "ElevenLabs", status: "active" }, start)).toHaveLength(1);
    expect(filterCommunityEvents([ELEVENLABS_MEETUP], { ...filters, city: "Osaka" }, start)).toHaveLength(0);
    expect(filterCommunityEvents([ELEVENLABS_MEETUP], { ...filters, partner: "Unrelated company" }, start)).toHaveLength(0);
    expect(filterCommunityEvents([{ ...ELEVENLABS_MEETUP, published: false }], filters, start)).toHaveLength(0);
  });
  it("does not link a missing legacy Kyoto page", () => {
    expect(communityEventHref({ ...ELEVENLABS_MEETUP, id: "impact-kyoto", createdBy: "portal-catalog" })).toBe("/hackathons");
    expect(communityEventHref(ELEVENLABS_MEETUP)).toBe(`/events/${ELEVENLABS_MEETUP.id}`);
  });
});
