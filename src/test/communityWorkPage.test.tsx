import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CommunityWorkPage from "@/pages/CommunityWorkPage";
import { ELEVENLABS_MEETUP } from "@/lib/elevenLabsMeetup";
import { mergeLumaCalendarArchive } from "@/lib/lumaCalendarArchive";

const mocks = vi.hoisted(() => ({ events: vi.fn(), refetch: vi.fn() }));
vi.mock("@/hooks/useCommunityEvents", () => ({ useCommunityEvents: mocks.events }));
vi.mock("@/components/SiteHeader", () => ({ default: () => <nav aria-label="Primary" /> }));
const kyoto = { ...ELEVENLABS_MEETUP, id: "kyoto-test", name: "Kyoto AI Hackathon", location: "Kyoto, Japan", startAt: "2026-09-01T00:00:00Z", endAt: "2026-09-02T00:00:00Z", format: "Hackathon", organizerName: "Kyoto organisers", organizerLinks: [] };
beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  mocks.events.mockReturnValue({ events: [ELEVENLABS_MEETUP, kyoto], now: Date.parse("2026-10-09T10:00:00Z"), isPending: false, isError: false, refetch: mocks.refetch });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const renderWork = (path = "/work") => render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><CommunityWorkPage /></MemoryRouter>);

describe("working event collection", () => {
  it("opens city deep links from the map and clears filters", () => {
    renderWork("/work?city=Tokyo");
    expect(screen.getByLabelText("City")).toHaveValue("Tokyo");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
  it("combines organiser and live-now filters with event types", () => {
    renderWork();
    fireEvent.change(screen.getByLabelText("Organiser / partner"), { target: { value: "ElevenLabs" } });
    fireEvent.change(screen.getByLabelText("When"), { target: { value: "active" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Hackathons" }));
    expect(screen.getByText("No events match just yet.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Show all events" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
  it("searches event content and displays date-derived states", () => {
    renderWork();
    expect(screen.getByText("Past event · Registration closed")).toBeVisible();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ElevenCreative" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Kyoto AI Hackathon" })).toBeNull();
    expect(screen.getByRole("link", { name: /Live now ElevenLabs/ })).toHaveAttribute("href", `/events/${ELEVENLABS_MEETUP.id}`);
  });
  it("shows honest loading and retry states", () => {
    mocks.events.mockReturnValue({ events: [], isPending: true, isError: false });
    const view = renderWork();
    expect(screen.getByRole("status")).toHaveTextContent("Loading events");
    view.unmount();
    mocks.events.mockReturnValue({ events: [], isPending: false, isError: true, refetch: mocks.refetch });
    renderWork();
    expect(screen.getByRole("alert")).toHaveTextContent("couldn’t load");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
  it("offers functional footer destinations without dummy links", () => {
    renderWork();
    expect(screen.getByRole("link", { name: "Careers" })).toHaveAttribute("href", "/#get-hired");
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "https://www.cognisorai.com/contact");
    expect(screen.getByRole("link", { name: "Create an event" })).toHaveAttribute("href", "/host/signin");
  });
  it("keeps the full Luma archive filterable when live listings are unavailable", () => {
    const now = Date.parse("2026-10-09T00:00:00Z");
    mocks.events.mockReturnValue({ events: mergeLumaCalendarArchive([], now), now, isPending: false, isError: true, refetch: mocks.refetch });
    renderWork("/work?status=past");
    expect(screen.getByRole("alert")).toHaveTextContent("verified Luma archive");
    expect(screen.getAllByRole("article")).toHaveLength(10);
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Kyoto" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Past event.*Impact Kyoto/ })).toHaveAttribute("href", "https://luma.com/cmevass2");
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Workshops" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
});
