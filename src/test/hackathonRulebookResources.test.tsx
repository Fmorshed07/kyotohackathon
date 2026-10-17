import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import HackathonRulebookSection, { HackathonRulebookCard } from "@/components/sections/HackathonRulebookSection";
import type { PortalHackathon } from "@/lib/hackathons";
import type { PortalRole, SessionUser } from "@/types/portal";

const mocks = vi.hoisted(() => ({
  db: {},
  catalog: vi.fn(),
  sessionUser: null as SessionUser | null,
  authLoading: false,
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => mocks.db }));
vi.mock("@/lib/aiHackathons", () => ({ fetchPortalHackathonCatalog: mocks.catalog }));
vi.mock("@/hooks/usePortalAuth", () => ({
  usePortalAuth: () => ({ sessionUser: mocks.sessionUser, loading: mocks.authLoading }),
}));

const hackathons: PortalHackathon[] = [
  { id: "past-ai", name: "Past AI Hackathon", shortName: "Past AI", eventDate: "15 August 2026", location: "Online", theme: "AI for impact", status: "past", rulebookUrl: "https://example.test/rules/past-ai.pdf" },
  { id: "current-osaka", name: "Current Osaka Hackathon", shortName: "Current Osaka", eventDate: "18 October 2026", location: "Osaka, Japan", theme: "Useful community AI", status: "active", rulebookUrl: "https://example.test/rules/osaka.pdf" },
  { id: "upcoming-tokyo", name: "Upcoming Tokyo Hackathon", shortName: "Upcoming Tokyo", eventDate: "24 October 2026", location: "Tokyo, Japan", theme: "Build your next idea", status: "upcoming" },
];

function CurrentLocation() {
  const location = useLocation();
  return <p data-testid="resources-location">{location.pathname}{location.search}{location.hash}</p>;
}

function showResources({ path = "/resources", cardEvents }: { path?: string; cardEvents?: PortalHackathon[] } = {}) {
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    {cardEvents ? <HackathonRulebookCard hackathons={cardEvents} /> : <HackathonRulebookSection />}
    <CurrentLocation />
  </MemoryRouter>);
}

async function chooseEvent(name: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Choose hackathon for rule book" }), { key: "ArrowDown" });
  fireEvent.keyDown(await screen.findByRole("option", { name: new RegExp(name) }), { key: "Enter" });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, writable: true, value: vi.fn() });
});
beforeEach(() => {
  mocks.catalog.mockReset().mockResolvedValue(hackathons);
  mocks.sessionUser = null;
  mocks.authLoading = false;
});
afterEach(cleanup);
afterAll(() => {
  if (originalScrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

describe("hackathon rule books in Resources", () => {
  it("loads the catalog and opens the pinned past event's own rule book", async () => {
    const loading = deferred<PortalHackathon[]>();
    mocks.catalog.mockReturnValueOnce(loading.promise);
    showResources({ path: "/resources?hackathon=past-ai" });

    expect(screen.getByRole("status")).toHaveTextContent("Loading hackathon rule books");
    expect(screen.queryByRole("link", { name: "Open rule book" })).not.toBeInTheDocument();
    await act(async () => { loading.resolve(hackathons); });

    const rulebook = screen.getByRole("link", { name: "Open rule book" });
    expect(mocks.catalog).toHaveBeenCalledExactlyOnceWith(mocks.db);
    expect(screen.getByRole("combobox", { name: "Choose hackathon for rule book" })).toHaveTextContent(hackathons[0].name);
    expect(rulebook).toHaveAttribute("href", hackathons[0].rulebookUrl);
    expect(rulebook).toHaveAttribute("target", "_blank");
    expect(rulebook.getAttribute("rel")).toContain("noopener");
    expect(rulebook.getAttribute("rel")).toContain("noreferrer");
  });

  it("changes the selected event and URL while keeping unrelated query parameters", async () => {
    showResources({ path: "/resources?event=past-ai&ref=dashboard&lang=ja#rulebook", cardEvents: hackathons });
    expect(screen.getByRole("link", { name: "Open rule book" })).toHaveAttribute("href", hackathons[0].rulebookUrl);

    await chooseEvent(hackathons[1].name);

    const params = new URL(screen.getByTestId("resources-location").textContent!, "https://example.test").searchParams;
    expect(params.get("hackathon")).toBe(hackathons[1].id);
    expect(params.has("event")).toBe(false);
    expect(params.get("ref")).toBe("dashboard");
    expect(params.get("lang")).toBe("ja");
    expect(screen.getByTestId("resources-location")).toHaveTextContent(/#rulebook$/);
    expect(screen.getByRole("link", { name: "Open rule book" })).toHaveAttribute("href", hackathons[1].rulebookUrl);
  });

  it("uses the active event by default and shows event details when no rule book is published", async () => {
    showResources({ cardEvents: hackathons });
    expect(screen.getByRole("link", { name: "Open rule book" })).toHaveAttribute("href", hackathons[1].rulebookUrl);

    await chooseEvent(hackathons[2].name);

    expect(screen.queryByRole("link", { name: "Open rule book" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("hasn’t added a rule book for this hackathon yet");
    expect(screen.getByRole("link", { name: "View event details" })).toHaveAttribute("href", "/events/upcoming-tokyo");
  });

  it("does not substitute another event's rule book for a missing pinned event", async () => {
    showResources({ path: "/resources?hackathon=unknown-event", cardEvents: hackathons });

    expect(screen.queryByRole("link", { name: "Open rule book" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("This hackathon isn’t available");

    await chooseEvent(hackathons[0].name);

    expect(screen.getByRole("link", { name: "Open rule book" })).toHaveAttribute("href", hackathons[0].rulebookUrl);
  });

  it("does not expose an unsafe rule book URL as a link", () => {
    showResources({ path: "/resources?hackathon=past-ai", cardEvents: [
      { ...hackathons[0], rulebookUrl: "javascript:alert('unsafe')" },
      hackathons[1],
    ] });

    expect(screen.queryByRole("link", { name: "Open rule book" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("hasn’t added a rule book for this hackathon yet");
    expect(screen.getByRole("link", { name: "View event details" })).toHaveAttribute("href", "/events/past-ai");
  });

  it("recovers from a failed catalog load when the visitor retries", async () => {
    mocks.catalog.mockRejectedValueOnce(new Error("Connection interrupted"));
    showResources({ path: "/resources?hackathon=past-ai" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load rule books");
    expect(screen.queryByRole("link", { name: "Open rule book" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("link", { name: "Open rule book" })).toHaveAttribute("href", hackathons[0].rulebookUrl);
    expect(mocks.catalog).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("links admins to manage the currently selected event's rule book", async () => {
    mocks.sessionUser = { id: "admin-account", email: "admin@example.test", role: "admin" };
    showResources({ path: "/resources?hackathon=past-ai" });
    await screen.findByRole("link", { name: "Open rule book" });
    expect(screen.getByRole("link", { name: "Manage rule book URLs" })).toHaveAttribute("href", "/dashboard/admin/events?hackathon=past-ai");

    await chooseEvent(hackathons[1].name);

    expect(screen.getByRole("link", { name: "Manage rule book URLs" })).toHaveAttribute("href", "/dashboard/admin/events?hackathon=current-osaka");
  });

  it.each(["judge", "mentor", "host", "participant", null] as const)("offers public rule books without admin management to %s", async (role: PortalRole | null) => {
    mocks.sessionUser = role ? { id: `account-${role}`, email: `${role}@example.test`, role } : null;
    showResources();

    expect(await screen.findByRole("link", { name: "Open rule book" })).toHaveAttribute("href", hackathons[1].rulebookUrl);
    expect(screen.queryByRole("link", { name: "Manage rule book URLs" })).not.toBeInTheDocument();
  });

  it("keeps administrative management hidden while the admin session is loading", async () => {
    mocks.sessionUser = { id: "admin-account", email: "admin@example.test", role: "admin" };
    mocks.authLoading = true;
    showResources();

    await screen.findByRole("link", { name: "Open rule book" });
    expect(screen.queryByRole("link", { name: "Manage rule book URLs" })).not.toBeInTheDocument();
  });
});
