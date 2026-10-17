import { useMemo } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useHackathonSelection } from "@/hooks/useHackathonSelection";
import type { PortalHackathon } from "@/lib/hackathons";
import type { SessionUser } from "@/types/portal";

const assignedEvents: PortalHackathon[] = [
  { id: "past-ideathon", name: "Past Ideathon 2026", shortName: "Past Ideathon", eventDate: "15 August 2026", location: "Online", theme: "AI for real world impact", status: "past" },
  { id: "past-sprint", name: "Past Community Sprint", shortName: "Past Sprint", eventDate: "12 September 2026", location: "Tokyo, Japan", theme: "Build for your community", status: "past" },
  { id: "current-osaka", name: "Current Osaka Hackathon", shortName: "Current Osaka", eventDate: "18 October 2026 · 17:00–21:00 JST", location: "Osaka, Japan", theme: "Useful AI for everyone", status: "active" },
  { id: "next-tokyo", name: "Next Tokyo Hackathon", shortName: "Next Tokyo", eventDate: "24 October 2026", location: "Tokyo, Japan", theme: "Build your next idea", status: "upcoming" },
];

const judge: SessionUser = {
  id: "returning-judge",
  email: "judge@example.test",
  role: "judge",
  // The explicit assigned catalog must win over these stale session entries.
  hackathonId: "stale-unassigned-event",
  hackathonIds: [...assignedEvents.map((event) => event.id), "stale-unassigned-event"],
};
const STORAGE_KEY = "test-judge-hackathon-navigation";

function JudgeWorkspace({ events = assignedEvents }: { events?: PortalHackathon[] }) {
  const allowedIds = useMemo(() => events.map((event) => event.id), [events]);
  const { selectedHackathonId, setSelectedHackathonId } = useHackathonSelection(
    STORAGE_KEY,
    allowedIds,
    events,
    { syncUrl: true, preferCurrent: true },
  );
  const location = useLocation();
  return (
    <DashboardLayout
      sessionUser={judge}
      role="judge"
      hackathons={events}
      selectedHackathonId={selectedHackathonId}
      onHackathonChange={setSelectedHackathonId}
      onSignOut={vi.fn().mockResolvedValue(undefined)}
    >
      <output data-testid="judge-location">{location.pathname}{location.search}{location.hash}</output>
      <output data-testid="judge-selected-event">{selectedHackathonId}</output>
    </DashboardLayout>
  );
}

function showWorkspace({ initialEntry = `/dashboard/judge?hackathon=${assignedEvents[0].id}`, events = assignedEvents }: {
  initialEntry?: string;
  events?: PortalHackathon[];
} = {}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <JudgeWorkspace events={events} />
    </MemoryRouter>,
  );
}

async function openChooser() {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Choose your hackathon" }), { key: "ArrowDown" });
  return within(await screen.findByRole("listbox"));
}

function expectSelectedEvent(event: PortalHackathon) {
  expect(screen.getByRole("combobox", { name: "Choose your hackathon" })).toHaveTextContent(event.name);
  expect(screen.getByTestId("judge-selected-event")).toHaveTextContent(new RegExp(`^${event.id}$`));
  expect(screen.getByTestId("judge-location")).toHaveTextContent(`hackathon=${event.id}`);
}

const originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, writable: true, value: vi.fn() });
});
beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); localStorage.clear(); });
afterAll(() => {
  if (originalScrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

describe("judge navigation across assigned hackathons", () => {
  it("keeps every past, current, and upcoming assignment selectable in the real event chooser", async () => {
    showWorkspace({ initialEntry: `/dashboard/judge?hackathon=${assignedEvents[0].id}&view=compact` });
    expectSelectedEvent(assignedEvents[0]);

    for (const [index, event] of [...assignedEvents.slice(1), assignedEvents[0]].entries()) {
      const chooser = await openChooser();
      expect(chooser.getAllByRole("option")).toHaveLength(assignedEvents.length);
      if (index === 0) {
        for (const assigned of assignedEvents) {
          expect(chooser.getByRole("option", { name: new RegExp(assigned.name) })).toHaveTextContent(assigned.eventDate);
        }
      }
      expect(chooser.queryByRole("option", { name: /stale-unassigned-event/ })).not.toBeInTheDocument();
      fireEvent.keyDown(chooser.getByRole("option", { name: new RegExp(event.name) }), { key: "Enter" });
      expectSelectedEvent(event);
      expect(screen.getByTestId("judge-location")).toHaveTextContent("view=compact");
    }
  });

  it("switches among every assignment in the sidebar without losing access to the event just left", () => {
    const { container } = showWorkspace();
    const sidebar = within(container.querySelector<HTMLElement>('[data-sidebar="sidebar"]')!);
    const entries = assignedEvents.map((event) => ({ event, entry: sidebar.getByRole("button", { name: new RegExp(event.shortName) }) }));
    for (const { event, entry } of [...entries.slice(1), entries[0]]) {
      fireEvent.click(entry);
      expect(entry).toHaveAttribute("data-active", "true");
      expectSelectedEvent(event);
      for (const assigned of entries) {
        expect(assigned.entry).toBeInTheDocument();
      }
    }
    expect(screen.queryByRole("button", { name: /stale-unassigned-event/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Join another hackathon/ })).not.toBeInTheDocument();
  });

  it("preserves the chosen event through final shortlist, scoring, project agent, and ranking navigation", async () => {
    showWorkspace();
    fireEvent.click(screen.getByRole("button", { name: /Past Sprint/ }));
    expectSelectedEvent(assignedEvents[1]);
    expect(screen.getByRole("link", { name: "Final shortlist" })).toHaveAttribute("href", "/dashboard/judge/final-shortlist?hackathon=past-sprint");

    fireEvent.click(screen.getByRole("link", { name: "Final shortlist" }));
    expect(screen.getByTestId("judge-location")).toHaveTextContent("/dashboard/judge/final-shortlist?hackathon=past-sprint");
    expectSelectedEvent(assignedEvents[1]);

    fireEvent.click(screen.getByRole("button", { name: /Next Tokyo/ }));
    expectSelectedEvent(assignedEvents[3]);
    fireEvent.click(screen.getByRole("link", { name: "Submissions" }));
    expect(screen.getByTestId("judge-location")).toHaveTextContent("/dashboard/judge?hackathon=next-tokyo#submissions");

    const chooser = await openChooser();
    fireEvent.keyDown(chooser.getByRole("option", { name: /Past Community Sprint/ }), { key: "Enter" });
    fireEvent.click(screen.getByRole("link", { name: "Project agent" }));
    expect(screen.getByTestId("judge-location")).toHaveTextContent("/dashboard/judge/project-screening?hackathon=past-sprint");

    fireEvent.click(screen.getByRole("link", { name: "Top 3 Ranking" }));
    expect(screen.getByTestId("judge-location")).toHaveTextContent("/dashboard/judge/final-shortlist?hackathon=past-sprint#top-3-ranking");
    expectSelectedEvent(assignedEvents[1]);
    fireEvent.click(screen.getByRole("link", { name: "Overview" }));
    expect(screen.getByTestId("judge-location")).toHaveTextContent("/dashboard/judge?hackathon=past-sprint#overview");
  });

  it("replaces an unassigned deep link with an assigned workspace and excludes stale session choices", async () => {
    localStorage.setItem(STORAGE_KEY, "stale-unassigned-event");
    showWorkspace({ initialEntry: "/dashboard/judge?hackathon=stale-unassigned-event" });

    expectSelectedEvent(assignedEvents[0]);
    const chooser = await openChooser();
    expect(chooser.getAllByRole("option")).toHaveLength(assignedEvents.length);
    expect(chooser.queryByRole("option", { name: /stale-unassigned-event/ })).not.toBeInTheDocument();
  });

  it("does not fall back to stale session assignments when the assigned catalog is explicitly empty", () => {
    showWorkspace({ initialEntry: "/dashboard/judge?hackathon=stale-unassigned-event", events: [] });

    expect(screen.queryByRole("combobox", { name: "Choose your hackathon" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /stale-unassigned-event|Past Ideathon|Past Sprint|Current Osaka|Next Tokyo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /stale-unassigned-event.*Board/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Assigned event boards appear here after an admin grants you access/)).toBeInTheDocument();
  });
});
