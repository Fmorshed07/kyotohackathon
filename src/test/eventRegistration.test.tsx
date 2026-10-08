import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import GeneratedHackathonPage from "@/pages/GeneratedHackathonPage";
import type { HostedHackathon } from "@/lib/aiHackathons";
import { ELEVENLABS_MEETUP } from "@/lib/elevenLabsMeetup";
import { eventRegistrationLabel, isEventRegistrationClosed } from "@/lib/eventRegistration";

const mocks = vi.hoisted(() => ({ fetchEvent: vi.fn(), getDoc: vi.fn() }));

vi.mock("@/lib/aiHackathons", () => ({ fetchAiHackathon: mocks.fetchEvent }));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => ({}) }));
vi.mock("firebase/firestore", async (importOriginal) => ({
  ...await importOriginal<typeof import("firebase/firestore")>(),
  doc: (_db: unknown, _collection: string, id: string) => ({ id }),
  getDoc: mocks.getDoc,
}));
vi.mock("@/components/AnimatedBackground", () => ({ default: () => null }));
vi.mock("@/components/SiteHeader", () => ({ default: () => null }));

const ideathon: HostedHackathon = {
  id: "ai-ideathon-2026-q9pxii",
  name: "AI Ideathon 2026",
  shortName: "AI Ideathon",
  eventDate: "August 13th – 15th, 2026",
  location: "Online",
  theme: "AI for real-world impact",
  status: "past",
  // Deliberately retain the old registration metadata: past lifecycle must win.
  registrationStatus: "open",
  lumaUrl: "https://luma.com/ai-ideathon-2026",
  summary: "Teams presented their AI ideas at the completed event.",
  format: "Online ideathon",
  eligibility: "Open to participants",
  teamSize: "Solo or team",
  prize: "Community awards",
  requirements: [],
  schedule: [],
  rulebookUrl: "",
  coverImageUrl: "https://example.com/event-cover.png",
  bannerImageUrl: "https://example.com/event-banner.png",
  galleryUrls: [],
  guests: [],
  published: true,
  createdAt: "2026-08-01T00:00:00Z",
  createdBy: "test-organiser",
  aiGenerated: false,
  createdManually: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getDoc.mockResolvedValue({ data: () => ({ criteria: [] }) });
});
afterEach(cleanup);

async function renderEvent(event: HostedHackathon) {
  mocks.fetchEvent.mockResolvedValue(event);
  render(
    <MemoryRouter initialEntries={[`/events/${event.id}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/events/:hackathonId" element={<GeneratedHackathonPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: event.name, level: 1 });
  await waitFor(() => expect(mocks.fetchEvent).toHaveBeenCalled());
}

function expectNoEventSignup() {
  expect(screen.queryByRole("link", { name: /Join on Cognisor|Create participant account|Register now|Open registration/i })).not.toBeInTheDocument();
  expect(screen.queryAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("/signup"))).toHaveLength(0);
}

describe("event registration availability", () => {
  it("lets finished lifecycle override stale open or waitlist registration metadata", () => {
    expect(isEventRegistrationClosed(ideathon)).toBe(true);
    expect(isEventRegistrationClosed({ ...ideathon, registrationStatus: "waitlist" })).toBe(true);
    expect(eventRegistrationLabel(ideathon)).toBe("View on Luma");
    expect(isEventRegistrationClosed({ status: "upcoming", registrationStatus: "closed" })).toBe(true);
    expect(isEventRegistrationClosed({ status: "upcoming", registrationStatus: "waitlist" })).toBe(false);
    expect(isEventRegistrationClosed({ status: "active", registrationStatus: "open" })).toBe(false);
  });
});

describe("public event registration CTAs", () => {
  it.each(["stage", "folio", "signal"])("shows the finished AI Ideathon archive without registration in the %s layout", async (layoutStyle) => {
    await renderEvent({ ...ideathon, layoutStyle });
    expect(screen.getAllByText("Event finished").length).toBeGreaterThan(0);
    expectNoEventSignup();
    expect(screen.getByText("Archived event poster · Registration closed").closest("details")).not.toHaveAttribute("open");
    expect(screen.queryByRole("img", { name: `${ideathon.name} banner` })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /join waitlist/i })).not.toBeInTheDocument();
    const projectLinks = screen.getAllByRole("link", { name: /(?:browse|view|explore).*projects|project archive/i });
    expect(projectLinks.length).toBeGreaterThan(0);
    expect(projectLinks.some((link) => link.getAttribute("href")?.includes(ideathon.id))).toBe(true);
  });

  it("retains signup and external registration for an upcoming ordinary event", async () => {
    await renderEvent({ ...ideathon, id: "future-community-event", name: "Upcoming community event", status: "upcoming" });
    expect(screen.getByRole("link", { name: "Join on Cognisor" })).toHaveAttribute("href", "/signup?role=participant&hackathon=future-community-event");
    expect(screen.getByRole("link", { name: "Create participant account" })).toHaveAttribute("href", "/signup?role=participant&hackathon=future-community-event");
    expect(screen.getAllByRole("link", { name: "Register now" }).every((link) => link.getAttribute("href") === ideathon.lumaUrl)).toBe(true);
    expect(screen.queryByText("Event finished")).not.toBeInTheDocument();
  });

  it("closes registration without calling an upcoming event finished", async () => {
    await renderEvent({ ...ideathon, status: "upcoming", registrationStatus: "closed" });
    expectNoEventSignup();
    expect(screen.getAllByText("Registration closed").length).toBeGreaterThan(0);
    expect(screen.getByText("Registration for this event is closed.")).toBeInTheDocument();
    expect(screen.queryByText("Event finished")).not.toBeInTheDocument();
  });

  it("keeps the upcoming source meetup on the external Luma waitlist", async () => {
    await renderEvent({ ...ELEVENLABS_MEETUP, status: "upcoming" });
    await waitFor(() => expect(screen.getAllByRole("link", { name: "Join waitlist on Luma" }).length).toBeGreaterThan(0));
    expect(screen.getAllByRole("link", { name: "Join waitlist on Luma" }).every((link) => link.getAttribute("href") === ELEVENLABS_MEETUP.lumaUrl)).toBe(true);
    expect(screen.getByRole("heading", { name: "Event full · waitlist open" })).toBeInTheDocument();
    expectNoEventSignup();
  });
});
