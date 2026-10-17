import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OngoingEventNotice } from "@/components/OngoingEventNotice";
import { fetchPortalHackathonCatalog, fetchPublishedHackathons, getHostedHackathonUrl, hostedToPortalHackathon, type HostedHackathon } from "@/lib/aiHackathons";
import { IMPACT_OSAKA } from "@/lib/impactOsaka";
import { formatEventPreviewDate } from "@/lib/eventPreviews";

vi.mock("@/lib/aiHackathons", async original => ({
  ...await original<typeof import("@/lib/aiHackathons")>(),
  fetchPublishedHackathons: vi.fn(),
  fetchPortalHackathonCatalog: vi.fn(),
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => ({}) }));
vi.mock("@/data/lumaCalendarArchive", async original => ({
  ...await original<typeof import("@/data/lumaCalendarArchive")>(), LUMA_CALENDAR_ARCHIVE: [],
}));

const event = (patch: Partial<HostedHackathon> = {}): HostedHackathon => ({ ...IMPACT_OSAKA, ...patch });
const clients: QueryClient[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-18T09:00:00Z"));
  window.sessionStorage.clear();
  vi.mocked(fetchPublishedHackathons).mockReset().mockResolvedValue([event()]);
  vi.mocked(fetchPortalHackathonCatalog).mockReset().mockImplementation(async (_db, published = []) =>
    published.filter(entry => entry.published).map(hostedToPortalHackathon));
});

afterEach(() => {
  cleanup();
  clients.forEach(client => client.clear());
  clients.length = 0;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function showNotice(path = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OngoingEventNotice />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  return { ...view, client };
}

describe("ongoing event notifications", () => {
  it("replaces the hard-coded past voting prompt with the ongoing event", async () => {
    vi.mocked(fetchPublishedHackathons).mockResolvedValue([
      event({ id: "ai-ideathon-2026", name: "AI Ideathon 2026", status: "active", startAt: "2026-08-13T00:00:00Z", endAt: "2026-08-15T00:00:00Z" }),
      event(),
    ]);
    await showNotice();
    expect(screen.getByRole("complementary", { name: "Ongoing event notification" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: IMPACT_OSAKA.name })).toBeInTheDocument();
    expect(screen.getByText("Live now")).toBeInTheDocument();
    expect(screen.getByText(IMPACT_OSAKA.location)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View event" })).toHaveAttribute("href", getHostedHackathonUrl(IMPACT_OSAKA.id));
    expect(screen.queryByText(/Star the best project|Help choose the best project|AI Ideathon 2026/)).not.toBeInTheDocument();
    expect(document.querySelector("time")).toHaveAttribute("datetime", IMPACT_OSAKA.endAt);
    expect(document.querySelector("time")).toHaveTextContent(formatEventPreviewDate(IMPACT_OSAKA.endAt!, IMPACT_OSAKA.timezone));
  });

  it("stays quiet when there are only finished, upcoming, private or undated events", async () => {
    vi.mocked(fetchPublishedHackathons).mockResolvedValue([
      event({ id: "finished", status: "active", endAt: "2026-10-18T09:00:00Z" }),
      event({ id: "future", startAt: "2026-10-19T08:00:00Z", endAt: "2026-10-19T12:00:00Z" }),
      event({ id: "private", published: false }),
      event({ id: "unknown", startAt: undefined, endAt: undefined }),
      event({ id: "invalid", endAt: "invalid" }),
    ]);
    await showNotice();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("prioritizes the ongoing event ending soonest, independent of saved status", async () => {
    vi.mocked(fetchPublishedHackathons).mockResolvedValue([
      event({ id: "later", name: "Later finish" }),
      event({ id: "sooner", name: "Ending soon", endAt: "2026-10-18T10:00:00Z", status: "upcoming" }),
    ]);
    await showNotice();
    expect(screen.getByRole("heading", { name: "Ending soon" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Later finish" })).not.toBeInTheDocument();
  });

  it("keeps an ongoing event page focused on that event", async () => {
    vi.mocked(fetchPublishedHackathons).mockResolvedValue([
      event({ id: "sooner", name: "Other event", endAt: "2026-10-18T10:00:00Z" }), event(),
    ]);
    await showNotice(getHostedHackathonUrl(IMPACT_OSAKA.id));
    expect(screen.getByRole("heading", { name: IMPACT_OSAKA.name })).toBeInTheDocument();
  });

  it("appears at the start and disappears at the end without reloading", async () => {
    vi.setSystemTime(new Date("2026-10-18T07:59:59Z"));
    await showNotice();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(999); });
    expect(screen.getByRole("heading", { name: IMPACT_OSAKA.name })).toBeInTheDocument();
    vi.setSystemTime(new Date("2026-10-18T11:59:59Z"));
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("moves to the next ongoing event when the current one ends", async () => {
    vi.mocked(fetchPublishedHackathons).mockResolvedValue([
      event({ id: "ending", name: "Ending now", endAt: "2026-10-18T09:00:01Z" }), event(),
    ]);
    await showNotice();
    expect(screen.getByRole("heading", { name: "Ending now" })).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(999); });
    expect(screen.getByRole("heading", { name: IMPACT_OSAKA.name })).toBeInTheDocument();
  });

  it("remembers dismissals without immediately opening another popup", async () => {
    vi.mocked(fetchPublishedHackathons).mockResolvedValue([
      event({ id: "ending", name: "Ending now", endAt: "2026-10-18T09:00:01Z" }), event(),
    ]);
    const view = await showNotice();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss event notification" }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    view.unmount();
    await showNotice();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(998); });
    expect(screen.getByRole("heading", { name: IMPACT_OSAKA.name })).toBeInTheDocument();
  });

  it("does not let an old voting dismissal suppress current events", async () => {
    window.sessionStorage.setItem("cognisor_ai_ideathon_star_notice_dismissed", "1");
    await showNotice();
    expect(screen.getByRole("heading", { name: IMPACT_OSAKA.name })).toBeInTheDocument();
  });

  it("still allows dismissal if browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    await showNotice();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss event notification" }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("waits for the public catalog before showing anything", async () => {
    vi.mocked(fetchPublishedHackathons).mockReturnValue(new Promise(() => {}));
    await showNotice();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("does not advertise an event when the catalog cannot be loaded", async () => {
    vi.mocked(fetchPublishedHackathons).mockRejectedValue(new Error("Offline"));
    await showNotice();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("removes a notification when the refreshed public catalog unpublishes its event", async () => {
    const view = await showNotice();
    expect(screen.getByRole("heading", { name: IMPACT_OSAKA.name })).toBeInTheDocument();
    vi.mocked(fetchPublishedHackathons).mockResolvedValue([]);
    vi.mocked(fetchPortalHackathonCatalog).mockResolvedValue([]);
    await act(async () => { await view.client.invalidateQueries({ queryKey: ["public-community-events"] }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it.each(["/", "/hackathons", "/events/past-event", "/projects", "/projects/project-one"])("shows ongoing notices on public route %s", async path => {
    await showNotice(path);
    expect(screen.getByRole("heading", { name: IMPACT_OSAKA.name })).toBeInTheDocument();
  });

  it.each(["/signin", "/signup", "/admin", "/dashboard/participant", "/dashboard/judge", "/dashboard/host", "/dashboard/admin"])("does not show or fetch promotional notices on %s", async path => {
    await showNotice(path);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(fetchPublishedHackathons).not.toHaveBeenCalled();
  });
});
