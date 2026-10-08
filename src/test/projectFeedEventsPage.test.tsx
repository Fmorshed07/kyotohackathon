import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectFeedPage from "@/pages/ProjectFeedPage";
import type { HostedHackathon } from "@/lib/aiHackathons";
import { ELEVENLABS_MEETUP } from "@/lib/elevenLabsMeetup";

const backend = vi.hoisted(() => ({ db: {}, getDocs: vi.fn(), publishedEvents: vi.fn() }));

vi.mock("firebase/firestore", async original => ({
  ...await original<typeof import("firebase/firestore")>(),
  collection: (_db: unknown, name: string) => name,
  getDocs: backend.getDocs,
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => backend.db }));
vi.mock("@/lib/aiHackathons", () => ({ fetchPublishedHackathons: backend.publishedEvents }));
vi.mock("@/components/AnimatedBackground", () => ({ default: () => null }));
vi.mock("@/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/components/projects/ProjectFeedMedia", () => ({ ProjectFeedMedia: () => null }));
vi.mock("@/components/projects/ProjectShareMenu", () => ({ ProjectShareMenu: () => null }));
vi.mock("@/components/projects/ProjectStarEmailDialog", () => ({ ProjectStarEmailDialog: () => null }));
vi.mock("@/hooks/useProjectCommunityStars", () => ({
  useProjectCommunityStars: () => ({
    statsById: {}, myRatingById: {}, pendingId: null, emailPrompt: null,
    communityFill: () => 0, rate: vi.fn(), cancelStarEmail: vi.fn(), submitStarEmail: vi.fn(),
  }),
}));
vi.mock("@/hooks/useProjectShareCounts", () => ({
  useProjectShareCounts: () => ({ shareCount: () => 0, recordShare: vi.fn() }),
}));

const event = (id: string, name: string, patch: Partial<HostedHackathon>): HostedHackathon => ({
  ...ELEVENLABS_MEETUP, id, name, shortName: name, location: "Tokyo", ...patch,
});

const events = [
  event("archive", "Alpha archive", { status: "active", startAt: "2026-08-01T09:00:00Z", endAt: "2026-08-01T13:00:00Z" }),
  event("current-empty", "Beta gathering", { status: "past", startAt: "2026-10-09T12:00:00Z", endAt: "2026-10-09T14:00:00Z" }),
  event("future", "Gamma tomorrow", { status: "active", startAt: "2026-10-10T09:00:00Z", endAt: "2026-10-10T13:00:00Z" }),
  event("live", "Zeta live", { status: "past", startAt: "2026-10-09T09:00:00Z", endAt: "2026-10-09T11:00:00Z" }),
];

const project = (id: string, eventId: string, title: string, createdAt: string, video = false) => ({
  id,
  data: () => ({
    user_id: `builder-${id}`, hackathon_id: eventId, title, team_name: "Builders",
    created_at: createdAt, public_preview_consent: true,
    demo_video_url: video ? `https://example.test/${id}.mp4` : null,
  }),
});

const projects = [
  project("archive-project", "archive", "Archive build", "2026-10-09T09:59:00Z", true),
  project("future-project", "future", "Future build", "2026-10-09T09:00:00Z"),
  project("live-project", "live", "Live build", "2026-10-08T12:00:00Z", true),
];

const originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T10:00:00Z"));
  backend.getDocs.mockReset().mockResolvedValue({ docs: projects });
  backend.publishedEvents.mockReset().mockResolvedValue(events);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalScrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

async function showFeed(videoOnly = false) {
  render(<MemoryRouter initialEntries={[videoOnly ? "/videos" : "/feed"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ProjectFeedPage videoOnly={videoOnly} /></MemoryRouter>);
  await act(async () => {});
}

const articleNames = () => screen.getAllByRole("article").map(article => article.getAttribute("aria-label"));

function eventSidebar() {
  return within(screen.getByRole("heading", { name: "Explore by event" }).closest("section")!);
}

describe("current events in the public project feed", () => {
  it("orders the event selector and initial projects by actual event dates, with newest sorting still available", async () => {
    await showFeed();

    const options = eventSidebar().getAllByRole("button");
    expect(options).toHaveLength(5);
    ["All events", "Zeta live", "Beta gathering", "Gamma tomorrow", "Alpha archive"].forEach((name, index) => {
      expect(options[index]).toHaveAccessibleName(new RegExp(name));
    });
    expect(options[1]).toHaveTextContent("Live now");
    expect(options[2]).toHaveTextContent("Upcoming");
    expect(options[4]).toHaveTextContent("Past");
    expect(screen.getByRole("combobox", { name: "Sort projects" })).toHaveTextContent("Current events first");
    expect(articleNames()).toEqual(["Live build by Builders", "Future build by Builders", "Archive build by Builders"]);

    // Exercise the actual dropdown so a new default cannot make the old sort unreachable.
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Sort projects" }), { key: "ArrowDown" });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    fireEvent.click(screen.getByRole("option", { name: "Newest first" }));
    expect(screen.getByRole("combobox", { name: "Sort projects" })).toHaveTextContent("Newest first");
    expect(articleNames()).toEqual(["Archive build by Builders", "Future build by Builders", "Live build by Builders"]);
  });

  it("lets visitors select a current event before its first project and open that event", async () => {
    await showFeed();
    const emptyOption = eventSidebar().getByRole("button", { name: /Beta gathering/ });
    expect(emptyOption).toHaveTextContent("0");
    fireEvent.click(emptyOption);

    expect(emptyOption).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No projects from this event yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View event" })).toHaveAttribute("href", "/events/current-empty");
    expect(screen.queryByText("Try another event, search term, or preview filter.")).not.toBeInTheDocument();
  });

  it("keeps zero-video current events selectable without inflating the video event count", async () => {
    await showFeed(true);
    expect(articleNames()).toEqual(["Live build by Builders", "Archive build by Builders"]);
    expect(eventSidebar().getByRole("button", { name: /Beta gathering/ })).toHaveTextContent("0");
    expect(eventSidebar().getByRole("button", { name: /Gamma tomorrow/ })).toHaveTextContent("0");

    const stats = within(screen.getByText("Community in motion").closest("section")!);
    expect(stats.getByText("events").parentElement).toHaveTextContent(/^2events$/);
    expect(stats.getByText("video previews").parentElement).toHaveTextContent(/^2video previews$/);
  });

  it("reorders visible projects when an upcoming event starts and the live event ends", async () => {
    backend.publishedEvents.mockResolvedValue([
      event("finishing", "Finishing event", { status: "active", startAt: "2026-10-09T09:00:00Z", endAt: "2026-10-09T10:00:30Z" }),
      event("starting", "Starting event", { status: "upcoming", startAt: "2026-10-09T10:00:30Z", endAt: "2026-10-09T12:00:00Z" }),
    ]);
    backend.getDocs.mockResolvedValue({ docs: [
      project("starting-project", "starting", "Next build", "2026-10-09T09:59:00Z"),
      project("finishing-project", "finishing", "Earlier build", "2026-10-09T09:00:00Z"),
    ] });
    await showFeed();
    expect(articleNames()).toEqual(["Earlier build by Builders", "Next build by Builders"]);

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(articleNames()).toEqual(["Next build by Builders", "Earlier build by Builders"]);
    expect(eventSidebar().getByRole("button", { name: /Starting event/ })).toHaveTextContent("Live now");
    expect(eventSidebar().getByRole("button", { name: /Finishing event/ })).toHaveTextContent("Past");
    expect(backend.getDocs).toHaveBeenCalledTimes(1);
    expect(backend.publishedEvents).toHaveBeenCalledTimes(1);
  });
});
