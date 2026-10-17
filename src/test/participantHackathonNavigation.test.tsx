import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import type { PortalHackathon } from "@/lib/hackathons";
import type { SessionUser } from "@/types/portal";

const joinedEvents: PortalHackathon[] = [
  {
    id: "ai-ideathon-2026",
    name: "AI Ideathon 2026",
    shortName: "AI Ideathon",
    eventDate: "13–15 August 2026",
    location: "Online",
    theme: "AI for real world impact",
    status: "past",
  },
  {
    id: "community-sprint-2026",
    name: "Community Sprint 2026",
    shortName: "Community Sprint",
    eventDate: "12 September 2026",
    location: "Tokyo, Japan",
    theme: "Build for your community",
    status: "past",
  },
  {
    id: "impact-osaka-2026",
    name: "Impact Osaka 2026",
    shortName: "Impact Osaka",
    eventDate: "18 October 2026 · 17:00–21:00 JST",
    location: "Osaka, Japan",
    theme: "Useful AI for everyone",
    status: "active",
    coverImageUrl: "https://images.example.test/osaka.jpg",
  },
];

const returningParticipant: SessionUser = {
  id: "returning-participant",
  email: "returning@example.test",
  role: "participant",
  hackathonId: joinedEvents[0].id,
  hackathonIds: joinedEvents.map((event) => event.id),
};

function showDashboard() {
  const onHackathonChange = vi.fn();
  const onBrowseHackathons = vi.fn();
  const view = render(
    <MemoryRouter
      initialEntries={["/dashboard/participant"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <DashboardLayout
        sessionUser={returningParticipant}
        role="participant"
        hackathons={joinedEvents}
        selectedHackathonId={joinedEvents[0].id}
        onHackathonChange={onHackathonChange}
        onBrowseHackathons={onBrowseHackathons}
        onSignOut={vi.fn().mockResolvedValue(undefined)}
      >
        <p>Returning participant workspace</p>
      </DashboardLayout>
    </MemoryRouter>,
  );
  return { ...view, onHackathonChange, onBrowseHackathons };
}

const originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");

beforeAll(() => {
  // Radix scrolls the focused option into view; JSDOM has no layout to scroll.
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

afterEach(cleanup);

afterAll(() => {
  if (originalScrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
  } else {
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
  }
});

async function openHackathonChooser() {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Choose your hackathon" }), { key: "ArrowDown" });
  return screen.findByRole("listbox");
}

describe("returning participant hackathon navigation", () => {
  it("keeps every joined past event reachable from the sidebar", () => {
    const { onHackathonChange, onBrowseHackathons } = showDashboard();
    const previousEvent = screen.getByRole("button", { name: /Community Sprint/ });

    expect(screen.getByRole("button", { name: /AI Ideathon/ })).toHaveAttribute("data-active", "true");
    expect(previousEvent).toHaveTextContent(joinedEvents[1].eventDate);
    expect(screen.getByRole("button", { name: /Impact Osaka/ })).toBeInTheDocument();

    fireEvent.click(previousEvent);

    expect(onHackathonChange).toHaveBeenCalledExactlyOnceWith(joinedEvents[1].id);
    expect(onBrowseHackathons).not.toHaveBeenCalled();
  });

  it("shows joined event previews in the chooser and switches to the selected joined event", async () => {
    const { onHackathonChange, onBrowseHackathons } = showDashboard();
    const chooser = within(await openHackathonChooser());
    const previousEvent = chooser.getByRole("option", { name: /Community Sprint 2026/ });
    const activeEvent = chooser.getByRole("option", { name: /Impact Osaka 2026/ });

    expect(previousEvent).toHaveTextContent("Past");
    expect(previousEvent).toHaveTextContent(joinedEvents[1].eventDate);
    expect(previousEvent).toHaveTextContent(joinedEvents[1].location);
    expect(activeEvent).toHaveTextContent(joinedEvents[2].theme);
    expect(activeEvent.querySelector("img")).toHaveAttribute("src", joinedEvents[2].coverImageUrl);

    fireEvent.keyDown(activeEvent, { key: "Enter" });

    expect(onHackathonChange).toHaveBeenCalledExactlyOnceWith(joinedEvents[2].id);
    expect(onBrowseHackathons).not.toHaveBeenCalled();
  });

  it.each(["header", "sidebar"] as const)("opens event discovery from the %s without changing the participant's event", (surface) => {
    const { container, onHackathonChange, onBrowseHackathons } = showDashboard();
    const navigation = container.querySelector<HTMLElement>(surface === "header" ? "header" : '[data-sidebar="sidebar"]');
    expect(navigation).not.toBeNull();

    fireEvent.click(within(navigation!).getByRole("button", { name: /Join another hackathon/ }));

    expect(onBrowseHackathons).toHaveBeenCalledOnce();
    expect(onHackathonChange).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: "Choose your hackathon" })).toHaveTextContent(joinedEvents[0].name);
  });

  it("opens event discovery from the chooser without treating its action as a joined event", async () => {
    const { onHackathonChange, onBrowseHackathons } = showDashboard();
    const chooser = within(await openHackathonChooser());

    fireEvent.keyDown(chooser.getByRole("option", { name: /Join another hackathon/ }), { key: "Enter" });

    expect(onBrowseHackathons).toHaveBeenCalledOnce();
    expect(onHackathonChange).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: "Choose your hackathon" })).toHaveTextContent(joinedEvents[0].name);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
