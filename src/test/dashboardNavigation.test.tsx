import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import type { PortalHackathon } from "@/lib/hackathons";
import type { SessionUser } from "@/types/portal";

const OSAKA_DATE = "Sunday, 18 October 2026 at 10:00 AM – Monday, 19 October 2026 at 6:30 PM JST";
const TOKYO_DATE = "Saturday, 24 October 2026 · 09:00–19:00 JST";

const events: PortalHackathon[] = [
  {
    id: "impact-osaka-2026",
    name: "Impact Osaka 2026",
    shortName: "Impact Osaka",
    eventDate: OSAKA_DATE,
    location: "Osaka, Japan",
    theme: "Build useful AI together",
    status: "active",
  },
  {
    id: "impact-tokyo-2026",
    name: "Impact Tokyo 2026",
    shortName: "Impact Tokyo",
    eventDate: TOKYO_DATE,
    location: "Tokyo, Japan",
    theme: "AI for the community",
    status: "upcoming",
  },
];

const participant: SessionUser = {
  id: "participant-test",
  email: "participant@example.test",
  role: "participant",
  hackathonId: events[0].id,
  hackathonIds: events.map((event) => event.id),
};

function CurrentLocation() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="dashboard-location">{pathname}{search}{hash}</output>;
}

function showDashboard(selectedHackathonId = events[0].id) {
  const onHackathonChange = vi.fn();
  render(
    <MemoryRouter
      initialEntries={["/dashboard/participant"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <DashboardLayout
        sessionUser={participant}
        role="participant"
        hackathons={events}
        selectedHackathonId={selectedHackathonId}
        onHackathonChange={onHackathonChange}
        onSignOut={vi.fn().mockResolvedValue(undefined)}
      >
        <p>Participant workspace</p>
      </DashboardLayout>
      <CurrentLocation />
    </MemoryRouter>,
  );
  return { onHackathonChange };
}

afterEach(cleanup);

describe("dashboard sidebar navigation", () => {
  it("preserves menu styling and active state on internal, external, and event-board links", () => {
    showDashboard();
    const overview = screen.getByRole("link", { name: "Overview" });
    const team = screen.getByRole("link", { name: "My Team" });
    const discord = screen.getByRole("link", { name: "Discord" });
    const board = screen.getByRole("link", { name: /Impact Osaka Board/ });
    const feed = screen.getByRole("link", { name: "Project feed & videos" });
    const guide = screen.getByRole("link", { name: "Guide" });

    for (const link of [overview, team, discord, board, feed, guide]) {
      expect(link).toHaveAttribute("data-sidebar", "menu-button");
      expect(link).toHaveClass("dash-nav-item");
    }
    expect(overview).toHaveAttribute("data-active", "true");
    expect(team).toHaveAttribute("data-active", "false");
    expect(discord).toHaveAttribute("href", "https://discord.gg/GD5xxzteA");
    expect(discord).toHaveAttribute("target", "_blank");
    expect(discord.getAttribute("rel")).toContain("noreferrer");
    expect(board).toHaveAttribute("href", "/boards/impact-osaka-2026");
    expect(board).toHaveTextContent(OSAKA_DATE);
    expect(feed).toHaveAttribute("href", "/feed");
    expect(guide).toHaveAttribute("href", "/resources?hackathon=impact-osaka-2026");
  });

  it("keeps team, board, and combined feed navigation working and updates the active menu entry", () => {
    showDashboard();
    fireEvent.click(screen.getByRole("link", { name: "My Team" }));
    expect(screen.getByTestId("dashboard-location")).toHaveTextContent("/dashboard/participant/team");
    expect(screen.getByRole("link", { name: "My Team" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("data-active", "false");

    fireEvent.click(screen.getByRole("link", { name: /Impact Osaka Board/ }));
    expect(screen.getByTestId("dashboard-location")).toHaveTextContent("/boards/impact-osaka-2026");

    fireEvent.click(screen.getByRole("link", { name: "Project feed & videos" }));
    expect(screen.getByTestId("dashboard-location")).toHaveTextContent("/feed");

    fireEvent.click(screen.getByRole("link", { name: "Guide" }));
    expect(screen.getByTestId("dashboard-location")).toHaveTextContent("/resources?hackathon=impact-osaka-2026");
  });

  it("keeps full event dates available and passes the chosen event to the switch handler", () => {
    const { onHackathonChange } = showDashboard();
    const osaka = screen.getByRole("button", { name: /Impact Osaka/ });
    const tokyo = screen.getByRole("button", { name: /Impact Tokyo/ });
    expect(osaka).toHaveAttribute("data-active", "true");
    expect(osaka).toHaveTextContent(OSAKA_DATE);
    expect(tokyo).toHaveTextContent(TOKYO_DATE);

    fireEvent.click(tokyo);
    expect(onHackathonChange).toHaveBeenCalledExactlyOnceWith("impact-tokyo-2026");
    expect(screen.getByTestId("dashboard-location")).toHaveTextContent("/dashboard/participant");
  });

  it("opens community chat inside the dashboard with the selected event and active menu styling", () => {
    showDashboard(events[1].id);
    const community = screen.getByRole("link", { name: "Community chat" });
    expect(community).toHaveAttribute("href", "/dashboard/community?hackathon=impact-tokyo-2026");
    expect(community).toHaveAttribute("data-sidebar", "menu-button");
    expect(community).toHaveClass("dash-nav-item");
    expect(community).toHaveAttribute("data-active", "false");

    fireEvent.click(community);

    expect(screen.getByTestId("dashboard-location")).toHaveTextContent("/dashboard/community?hackathon=impact-tokyo-2026");
    expect(screen.getByRole("link", { name: "Community chat" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("data-active", "false");
  });
});
