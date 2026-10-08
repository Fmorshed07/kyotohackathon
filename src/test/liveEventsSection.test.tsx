import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LiveEventsSection from "@/components/sections/LiveEventsSection";
import { fetchPortalHackathonCatalog, fetchPublishedHackathons, getHostedHackathonUrl, hostedToPortalHackathon, type HostedHackathon } from "@/lib/aiHackathons";
import { ELEVENLABS_MEETUP } from "@/lib/elevenLabsMeetup";
import { getHackathonPublicUrl, PORTAL_HACKATHONS } from "@/lib/hackathons";
import { downloadEventCalendar } from "@/lib/eventCalendar";

// Isolate lifecycle/spotlight fixtures; the real Luma snapshot has its own integration coverage.
vi.mock("@/data/lumaCalendarArchive", async original => ({ ...await original<typeof import("@/data/lumaCalendarArchive")>(), LUMA_CALENDAR_ARCHIVE: [] }));

vi.mock("@/lib/aiHackathons", async (original) => ({
  ...await original<typeof import("@/lib/aiHackathons")>(),
  fetchPublishedHackathons: vi.fn(),
  fetchPortalHackathonCatalog: vi.fn(),
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => ({}) }));
vi.mock("@/lib/eventCalendar", async (original) => ({
  ...await original<typeof import("@/lib/eventCalendar")>(),
  downloadEventCalendar: vi.fn(),
}));

const event = (patch: Partial<HostedHackathon> = {}): HostedHackathon => ({
  ...ELEVENLABS_MEETUP,
  id: "test-event",
  name: "Community meetup",
  startAt: "2026-10-09T09:01:00Z",
  endAt: "2026-10-09T09:02:00Z",
  ...patch,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T09:00:00Z"));
  vi.mocked(fetchPublishedHackathons).mockReset().mockResolvedValue([event()]);
  vi.mocked(downloadEventCalendar).mockReset();
  vi.mocked(fetchPortalHackathonCatalog).mockReset().mockImplementation(async (_db, publishedEvents = []) =>
    publishedEvents.filter((entry) => entry.published).map(hostedToPortalHackathon),
  );
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

async function showSection() {
  const result = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><LiveEventsSection /></MemoryRouter>);
  await act(async () => {});
  return result;
}

describe("homepage event cards", () => {
  it("automatically moves an event from upcoming to live to its finished archive", async () => {
    await showSection();
    expect(screen.getByRole("heading", { name: "Next up" })).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View event" })).toHaveAttribute("href", getHostedHackathonUrl("test-event"));
    expect(screen.getByRole("heading", { name: "Community meetup" })).toBeInTheDocument();
    expect(document.querySelector("time")).toHaveAttribute("datetime", "2026-10-09T09:01:00Z");

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByRole("heading", { name: "Live now" })).toBeInTheDocument();
    expect(screen.queryByText("Upcoming")).not.toBeInTheDocument();
    expect(document.querySelector("time")).toHaveAttribute("datetime", "2026-10-09T09:02:00Z");

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByText("No events are live right now")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Past events" })).toBeInTheDocument();
    const past = within(document.getElementById("past-events")!);
    expect(past.getByRole("heading", { name: "Community meetup" })).toBeInTheDocument();
    expect(past.getByText("Finished")).toBeInTheDocument();
    expect(past.getByText("Registration closed")).toBeInTheDocument();
    expect(past.getByRole("link", { name: "View archive" })).toHaveAttribute("href", getHostedHackathonUrl("test-event"));
    expect(past.queryByRole("link", { name: /register|join waitlist/i })).not.toBeInTheDocument();
    expect(fetchPublishedHackathons).toHaveBeenCalledTimes(1);
  });

  it("limits the live lineup to three public events and switches the spotlight without losing archives", async () => {
    vi.setSystemTime(new Date("2026-10-09T09:01:30Z"));
    vi.mocked(fetchPublishedHackathons).mockResolvedValue([
      ...[1, 2, 3, 4].map((id) => event({ id: `live-${id}`, name: `Live event ${id}` })),
      event({ id: "past", name: "Past event", status: "active", startAt: "2026-10-09T09:00:00Z", endAt: "2026-10-09T09:01:00Z" }),
      event({ id: "future", name: "Future event", startAt: "2026-10-09T09:01:45Z" }),
      event({ id: "private", name: "Private event", published: false }),
      event({ id: "undated", name: "Undated event", endAt: undefined }),
    ]);
    await showSection();
    const spotlight = screen.getByRole("article", { name: "Live event 1" });
    expect(within(spotlight).getByText("Live now")).toBeInTheDocument();
    expect(spotlight.querySelector(".event-poster img")).toHaveAttribute("src", ELEVENLABS_MEETUP.coverImageUrl || ELEVENLABS_MEETUP.bannerImageUrl);
    const lineup = within(screen.getByRole("group", { name: "Choose an event to preview" }));
    expect(lineup.getAllByRole("button")).toHaveLength(3);
    expect(lineup.getByRole("button", { name: "Preview Live event 1" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Next event" }));
    expect(screen.getByRole("article", { name: "Live event 2" })).toBeInTheDocument();
    expect(lineup.getByRole("button", { name: "Preview Live event 2" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(lineup.getByRole("button", { name: "Preview Live event 3" }));
    expect(screen.getByRole("article", { name: "Live event 3" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View event" })).toHaveAttribute("href", getHostedHackathonUrl("live-3"));
    for (const name of ["Future event", "Private event", "Undated event", "Live event 4"]) {
      expect(screen.queryByRole("heading", { name })).not.toBeInTheDocument();
    }
    expect(within(document.getElementById("past-events")!).getByRole("heading", { name: "Past event" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse all events" })).toHaveAttribute("href", "/hackathons");
  });

  it("shows published historical events even without precise start and end times", async () => {
    vi.mocked(fetchPublishedHackathons).mockResolvedValue([
      event({ id: "past-ideathon", name: "AI Ideathon", status: "past", registrationStatus: "closed", startAt: undefined, endAt: undefined, eventDate: "19 September 2026" }),
      event({ id: "private-archive", name: "Private archive", status: "past", published: false, startAt: undefined, endAt: undefined }),
    ]);
    await showSection();
    expect(screen.getByRole("heading", { name: "Past events" })).toBeInTheDocument();
    expect(screen.getByText("No events are live right now")).toBeInTheDocument();
    const past = within(document.getElementById("past-events")!);
    expect(past.getAllByRole("article")).toHaveLength(1);
    const card = past.getByRole("article");
    expect(within(card).getByRole("heading", { name: "AI Ideathon" })).toBeInTheDocument();
    expect(within(card).getByText("19 September 2026")).toBeInTheDocument();
    expect(within(card).getByText("Finished")).toBeInTheDocument();
    expect(within(card).getByText("Registration closed")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "View archive" })).toHaveAttribute("href", getHostedHackathonUrl("past-ideathon"));
    expect(within(card).getByRole("link", { name: "AI Ideathon" })).toHaveAttribute("href", getHostedHackathonUrl("past-ideathon"));
    expect(within(card).queryByRole("link", { name: /register|signup|join waitlist/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Private archive" })).not.toBeInTheDocument();
  });

  it("retains upcoming cards beside the three most recent past events", async () => {
    vi.mocked(fetchPublishedHackathons).mockResolvedValue([
      event({ id: "older", name: "July event", startAt: "2026-07-04T00:00:00Z", endAt: "2026-07-04T10:00:00Z" }),
      event({ id: "next", name: "Next community meetup", startAt: "2026-10-10T09:00:00Z", endAt: "2026-10-10T13:00:00Z" }),
      event({ id: "oldest", name: "March event", startAt: "2026-03-07T00:00:00Z", endAt: "2026-03-07T10:00:00Z" }),
      event({ id: "recent", name: "Yesterday event", startAt: "2026-10-08T00:00:00Z", endAt: "2026-10-08T10:00:00Z" }),
      event({ id: "newest", name: "Just ended event", status: "active", registrationStatus: "open", startAt: "2026-10-09T08:00:00Z", endAt: "2026-10-09T08:59:00Z" }),
    ]);
    await showSection();
    expect(screen.getByRole("heading", { name: "Next up" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Next community meetup" })).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View event" })).toHaveAttribute("href", getHostedHackathonUrl("next"));
    const cards = within(document.getElementById("past-events")!).getAllByRole("article");
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => within(card).getByRole("heading").textContent)).toEqual(["Just ended event", "Yesterday event", "July event"]);
    expect(screen.queryByRole("heading", { name: "March event" })).not.toBeInTheDocument();
    for (const card of cards) {
      expect(within(card).getByText("Finished")).toBeInTheDocument();
      expect(within(card).getByText("Registration closed")).toBeInTheDocument();
      expect(card.querySelector("img")).toHaveClass("object-contain");
    }
  });

  it("links a legacy public archive to its official external event site", async () => {
    const tokyo = PORTAL_HACKATHONS.find((entry) => entry.id === "impact-tokyo")!;
    vi.mocked(fetchPublishedHackathons).mockResolvedValue([]);
    vi.mocked(fetchPortalHackathonCatalog).mockResolvedValue([tokyo]);
    await showSection();
    const past = within(document.getElementById("past-events")!);
    const card = past.getByRole("article");
    expect(within(card).getByRole("heading", { name: tokyo.name })).toBeInTheDocument();
    expect(within(card).getByText("Finished")).toBeInTheDocument();
    expect(within(card).getByText("Registration closed")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "View archive" })).toHaveAttribute("href", getHackathonPublicUrl(tokyo.id));
    expect(within(card).getByRole("link", { name: tokyo.name })).toHaveAttribute("href", getHackathonPublicUrl(tokyo.id));
    expect(within(card).queryByRole("link", { name: /register|signup|join waitlist/i })).not.toBeInTheDocument();
  });

  it.each([1, 2, 3])("makes all %i upcoming events available in the full spotlight", async (count) => {
    vi.mocked(fetchPublishedHackathons).mockResolvedValue(Array.from({ length: count }, (_, index) => event({ id: `upcoming-${index}`, name: `Upcoming event ${index}` })));
    await showSection();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    if (count > 1) expect(within(screen.getByRole("group", { name: "Choose an event to preview" })).getAllByRole("button")).toHaveLength(count);
    for (let index = 0; index < count; index += 1) {
      if (count > 1) fireEvent.click(screen.getByRole("button", { name: `Preview Upcoming event ${index}` }));
      const card = screen.getByRole("article", { name: `Upcoming event ${index}` });
      expect(card.querySelector(".event-poster img")).toHaveAttribute("src", ELEVENLABS_MEETUP.coverImageUrl || ELEVENLABS_MEETUP.bannerImageUrl);
      expect(within(card).getByText("Upcoming")).toBeInTheDocument();
      expect(within(card).getByRole("link", { name: "View event" })).toHaveAttribute("href", getHostedHackathonUrl(`upcoming-${index}`));
    }
    expect(screen.queryByRole("heading", { name: "Past events" })).not.toBeInTheDocument();
  });

  it("wraps spotlight navigation, exports the selected event calendar, and lets visitors pause motion", async () => {
    const events = [1, 2, 3].map((id) => event({ id: `choice-${id}`, name: `Event choice ${id}` }));
    vi.mocked(fetchPublishedHackathons).mockResolvedValue(events);
    await showSection();
    expect(screen.getByRole("timer", { name: "Time until event starts" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous event" }));
    expect(screen.getByRole("article", { name: "Event choice 3" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next event" }));
    expect(screen.getByRole("article", { name: "Event choice 1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview Event choice 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to calendar" }));
    expect(downloadEventCalendar).toHaveBeenCalledWith(events[1]);
    const section = document.getElementById("live-events")!;
    expect(section).toHaveAttribute("data-motion", "on");
    fireEvent.click(screen.getByRole("button", { name: "Pause animations" }));
    expect(section).toHaveAttribute("data-motion", "off");
    fireEvent.click(screen.getByRole("button", { name: "Resume animations" }));
    expect(section).toHaveAttribute("data-motion", "on");
  });

  it("recovers from a failed load when the user retries", async () => {
    vi.mocked(fetchPublishedHackathons).mockRejectedValueOnce(new Error("Network unavailable"));
    await showSection();
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t load current events");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Try again" })); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Community meetup" })).toBeInTheDocument();
  });

  it("refreshes after returning to the page and clears its timers when unmounted", async () => {
    const view = await showSection();
    vi.setSystemTime(new Date("2026-10-09T09:03:00Z"));
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(screen.getByText("No events are live right now")).toBeInTheDocument();
    expect(within(document.getElementById("past-events")!).getByRole("heading", { name: "Community meetup" })).toBeInTheDocument();
    expect(fetchPublishedHackathons).toHaveBeenCalledTimes(2);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
