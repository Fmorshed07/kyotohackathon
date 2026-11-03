import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GeneratedHackathonPage from "@/pages/GeneratedHackathonPage";
import HackathonsSection from "@/components/sections/HackathonsSection";
import { IMPACT_OSAKA } from "@/lib/impactOsaka";
import { PORTAL_HACKATHONS } from "@/lib/hackathons";
import type { HostedHackathon } from "@/lib/aiHackathons";

const backend = vi.hoisted(() => ({ event: vi.fn(), catalog: vi.fn(), published: vi.fn(), getDoc: vi.fn() }));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => ({}) }));
vi.mock("@/lib/aiHackathons", async original => ({
  ...await original<typeof import("@/lib/aiHackathons")>(),
  fetchAiHackathon: backend.event, fetchPortalHackathonCatalog: backend.catalog, fetchPublishedHackathons: backend.published,
}));
vi.mock("firebase/firestore", async original => ({ ...await original<typeof import("firebase/firestore")>(), doc: () => ({}), getDoc: backend.getDoc }));
vi.mock("@/components/AnimatedBackground", () => ({ default: () => null }));
vi.mock("@/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/components/PreviousHackathonsLivePreview", () => ({ default: () => null }));
vi.mock("@/components/hackathons/HackathonSubscribeForm", () => ({ HackathonSubscribeForm: () => null }));
vi.mock("@/components/hackathons/ElevenLabsParticipantShowcase", () => ({ default: () => null }));
vi.mock("@/components/hackathons/EventReportSection", () => ({ EventReportSection: ({ event }: { event: HostedHackathon }) => <section id="report" aria-label="Public event report"><h2>{event.name} report</h2></section> }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  backend.event.mockResolvedValue(IMPACT_OSAKA);
  backend.getDoc.mockResolvedValue({ data: () => ({ criteria: [] }) });
  backend.catalog.mockResolvedValue([...PORTAL_HACKATHONS, IMPACT_OSAKA]);
  backend.published.mockResolvedValue([IMPACT_OSAKA]);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("event report entry points", () => {
  it("embeds a report after overview and links its anchor on a public event page", async () => {
    render(<MemoryRouter initialEntries={[`/events/${IMPACT_OSAKA.id}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/events/:hackathonId" element={<GeneratedHackathonPage />} /></Routes></MemoryRouter>);
    await screen.findByRole("heading", { name: `${IMPACT_OSAKA.name} report` });
    expect(screen.getByRole("link", { name: "Event report" })).toHaveAttribute("href", "#report");
    const report = screen.getByRole("region", { name: "Public event report" });
    expect(document.getElementById("overview")!.nextElementSibling).toBe(report);
  });

  it("does not render the report for an unavailable event", async () => {
    backend.event.mockResolvedValue(null);
    render(<MemoryRouter initialEntries={["/events/private-event"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/events/:hackathonId" element={<GeneratedHackathonPage />} /></Routes></MemoryRouter>);
    await screen.findByRole("heading", { name: "This event is not live." });
    expect(screen.queryByRole("region", { name: "Public event report" })).toBeNull();
  });

  it("links each listed event to a local report and removes unsourced builder totals", async () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><HackathonsSection /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText("Loading live events…")).toBeNull());
    expect(screen.getByRole("link", { name: "All event reports" })).toHaveAttribute("href", "/reports");
    for (const event of [...PORTAL_HACKATHONS, IMPACT_OSAKA]) {
      const heading = screen.getByRole("heading", { name: event.name });
      const card = heading.closest("article")!;
      expect(within(card).getByRole("link", { name: `View report for ${event.name}` })).toHaveAttribute("href", `/reports?event=${event.id}`);
    }
    expect(screen.queryByText(/(?:48|62|36) Builders/)).toBeNull();
    expect(screen.queryByText("Most builders")).toBeNull();
  });
});
