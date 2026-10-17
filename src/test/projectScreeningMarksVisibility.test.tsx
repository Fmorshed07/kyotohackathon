import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProjectScreeningMarksSection,
  type ProjectScreeningMarkRow,
} from "@/components/dashboard/ProjectScreeningMarksSection";
import { ProjectScreeningWorkspace } from "@/components/dashboard/ProjectScreeningWorkspace";
import { ProjectThemeMarksPanel } from "@/components/dashboard/ProjectThemeMarksPanel";
import { emptyPlatformOps } from "@/lib/platformOps";
import type { PortalHackathon } from "@/lib/hackathons";
import type { PortalRole, SessionUser } from "@/types/portal";

const mocks = vi.hoisted(() => ({
  sessionUser: null as SessionUser | null,
  loading: false,
  db: {},
  fetchPlatformOps: vi.fn(),
}));

vi.mock("@/hooks/usePortalAuth", () => ({
  usePortalAuth: () => ({ sessionUser: mocks.sessionUser, loading: mocks.loading, signOut: vi.fn() }),
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => mocks.db }));
vi.mock("@/lib/platformOps", async (original) => ({
  ...await original<typeof import("@/lib/platformOps")>(),
  fetchPlatformOps: mocks.fetchPlatformOps,
}));

const hackathon: PortalHackathon = {
  id: "community-ai-2026",
  name: "Community AI Hackathon",
  shortName: "Community AI",
  eventDate: "18 October 2026",
  location: "Tokyo, Japan",
  theme: "Useful AI for the community",
  status: "active",
};
const rows: ProjectScreeningMarkRow[] = [
  { id: "project-one", title: "Community helper", participantName: "Builder One", teamName: "Team One", source: "submission", status: "shortlisted", score: 88, themeFit: 92, conceptQuality: 83, summary: "Useful community support with a working demo." },
  { id: "project-two", title: "Local knowledge", participantName: "Builder Two", teamName: "Team Two", source: "submission", status: "pending", score: 61, themeFit: 54, conceptQuality: 72, summary: "Promising idea that needs a clearer event connection." },
];
const analyticsTitles = ["Theme vs concept", "Score distribution", "Positioning with marks"];

function setRole(role: PortalRole | null) {
  mocks.sessionUser = role ? { id: `account-${role}`, email: `${role}@example.test`, role } : null;
}

const section = () => <ProjectScreeningMarksSection rows={rows} activeId={rows[0].id} onSelect={vi.fn()} csvLabel={hackathon.name} />;
const themePanel = () => <ProjectThemeMarksPanel hackathon={hackathon} submissions={[
  { id: rows[0].id, user_id: "builder-one", title: rows[0].title, short_description: "A working AI assistant helps community volunteers answer questions with local resources." },
]} />;

function expectAnalyticsAbsent() {
  for (const title of analyticsTitles) expect(screen.queryByText(title)).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Screening analytics" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Download CSV" })).not.toBeInTheDocument();
  expect(screen.queryByRole("columnheader", { name: "Total mark" })).not.toBeInTheDocument();
}

beforeEach(() => {
  setRole("admin");
  mocks.loading = false;
  mocks.fetchPlatformOps.mockReset().mockResolvedValue(emptyPlatformOps());
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  // Give the real responsive charts a measurable container in JSDOM.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, bottom: 400, right: 800, width: 800, height: 400, toJSON: () => ({}),
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("AI screening analytics visibility", () => {
  it("shows populated charts, positioning marks, and CSV export to an authenticated admin", () => {
    render(section());

    for (const title of analyticsTitles) expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Screening analytics" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download CSV" })).toBeEnabled();
    expect(screen.getByRole("columnheader", { name: "Total mark" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent(rows[0].title);
    expect(screen.getByRole("table")).toHaveTextContent(rows[1].title);
  });

  it.each(["judge", "mentor", "host", "participant", null] as const)("does not render populated analytics for %s", (role) => {
    setRole(role);
    const { container } = render(section());

    expectAnalyticsAbsent();
    expect(container).toBeEmptyDOMElement();
  });

  it("waits for authentication to finish before showing an admin's analytics", () => {
    mocks.loading = true;
    const { container } = render(section());

    expectAnalyticsAbsent();
    expect(container).toBeEmptyDOMElement();
  });

  it("removes previously visible admin analytics immediately after switching to a judge account", () => {
    const view = render(section());
    expect(screen.getByText("Positioning with marks")).toBeInTheDocument();

    setRole("judge");
    view.rerender(section());

    expectAnalyticsAbsent();
    expect(view.container).toBeEmptyDOMElement();
  });

  it.each(["judge", "mentor", "host", "participant", null] as const)("does not fetch administrative theme marks for %s", (role) => {
    setRole(role);
    const { container } = render(themePanel());

    expect(mocks.fetchPlatformOps).not.toHaveBeenCalled();
    expectAnalyticsAbsent();
    expect(container).toBeEmptyDOMElement();
  });

  it("loads the selected event's theme marks for an authenticated admin", async () => {
    render(themePanel());

    await waitFor(() => expect(mocks.fetchPlatformOps).toHaveBeenCalledExactlyOnceWith(mocks.db, hackathon.id));
    for (const title of analyticsTitles) expect(screen.getByText(title)).toBeInTheDocument();
  });

  it("keeps the judge's read-only concept workspace available while withholding administrative analytics", () => {
    setRole("judge");
    render(<ProjectScreeningWorkspace
      hackathon={hackathon}
      participants={[{ id: "builder-one", email: "builder@example.test" }]}
      submissions={[{
        id: rows[0].id, participantId: "builder-one", participantEmail: "builder@example.test",
        teamName: "Team One", title: rows[0].title,
        shortDescription: "An AI assistant helps community volunteers find local resources with a working demo.",
        projectUrl: "https://example.test/demo", submissionPdfUrl: null, demoVideoUrl: null,
      }]}
      ops={emptyPlatformOps()}
      readOnly
      onRunAll={vi.fn()}
      onSetStatus={vi.fn()}
    />);

    expect(screen.getByRole("heading", { name: "Score concepts against the theme" })).toBeInTheDocument();
    expect(screen.getByText("Concept queue")).toBeInTheDocument();
    expect(screen.getAllByText(rows[0].title).length).toBeGreaterThan(0);
    expectAnalyticsAbsent();
  });
});
