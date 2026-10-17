import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminNewsletterPanel } from "@/components/dashboard/AdminNewsletterPanel";
import { AdminTeamsPanel, type AdminTeamRow } from "@/components/dashboard/AdminTeamsPanel";
import type { PortalHackathon } from "@/lib/hackathons";
import { downloadCsv } from "@/lib/submissionCsv";

vi.mock("@/components/dashboard/DashboardLayout", () => ({ sectionClass: "dashboard-section" }));
vi.mock("@/lib/submissionCsv", () => ({ downloadCsv: vi.fn() }));
vi.mock("@/components/ui/sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const subscribers = Array.from({ length: 10 }, (_, index) => ({
  email: `subscriber${index + 1}@example.test`,
  source: index % 2 ? "project-star" : "newsletter",
  createdAt: "2026-10-18T10:00:00Z",
}));

const event: PortalHackathon = {
  id: "tokyo",
  name: "Tokyo Hackathon",
  shortName: "Tokyo",
  status: "active",
  eventDate: "October 2026",
  location: "Tokyo",
  theme: "Build together",
};

const teams: AdminTeamRow[] = Array.from({ length: 8 }, (_, index) => ({
  id: `team-${index + 1}`,
  teamName: `Team ${index + 1}`,
  title: `Project ${index + 1}`,
  participantEmail: `owner${index + 1}@example.test`,
  teamLeaderName: `Leader ${index + 1}`,
  teamLeaderEmail: `leader${index + 1}@example.test`,
  memberCount: 2,
  members: [
    { user_id: `builder-${index + 1}`, name: `Builder ${index + 1}`, email: `builder${index + 1}@example.test`, isLeader: true, isOwner: true },
    { user_id: `partner-${index + 1}`, name: `Partner ${index + 1}`, email: `partner${index + 1}@example.test`, isLeader: false, isOwner: false },
  ],
  extraMemberNames: [],
  isPublic: false,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("newsletter contact directory", () => {
  it("paginates contacts and reveals only the selected email", () => {
    render(<AdminNewsletterPanel subscribers={subscribers} isLoading={false} />);
    expect(screen.getAllByRole("button", { name: /Reveal email for subscriber/ })).toHaveLength(8);
    expect(screen.queryByText(subscribers[0].email)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reveal email for subscriber 1" }));
    expect(screen.getByText(subscribers[0].email)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Reveal email for subscriber 2" }));
    expect(screen.queryByText(subscribers[0].email)).not.toBeInTheDocument();
    expect(screen.getByText(subscribers[1].email)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next subscribers" }));
    expect(screen.getAllByRole("button", { name: /Reveal email for subscriber/ })).toHaveLength(2);
    expect(screen.queryByText(subscribers[1].email)).not.toBeInTheDocument();
    expect(screen.getByText("Showing 9–10 of 10 subscribers")).toBeVisible();
  });

  it("searches full contact emails while keeping results masked and resetting pagination", () => {
    render(<AdminNewsletterPanel subscribers={subscribers} isLoading={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Next subscribers" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Search newsletter subscribers" }), { target: { value: subscribers[1].email } });
    expect(screen.getByText("Showing 1–1 of 1 subscribers")).toBeVisible();
    expect(screen.queryByText(subscribers[1].email)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reveal email for subscriber 1" }));
    expect(screen.getByText(subscribers[1].email)).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Search newsletter subscribers" }), { target: { value: "no-such-contact" } });
    expect(screen.getByText("No subscribers match your search.")).toBeVisible();
  });

  it("retains full copy and CSV export actions despite the masked paginated view", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<AdminNewsletterPanel subscribers={subscribers} isLoading={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy emails" }));
    expect(writeText).toHaveBeenCalledWith(subscribers.map((item) => item.email).join("\n"));
    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    expect(downloadCsv).toHaveBeenCalledWith("cognisor-newsletter.csv", expect.stringContaining(subscribers[9].email));
  });
});

describe("team directory", () => {
  it("shows six compact teams and searches across pages", () => {
    render(<AdminTeamsPanel selectedHackathon={event} submissions={teams} isLoading={false} />);
    expect(screen.getAllByRole("button", { name: /Open roster/ })).toHaveLength(6);
    expect(screen.queryByText("Builder 1")).not.toBeInTheDocument();
    expect(screen.queryByText(teams[0].teamLeaderEmail!)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next teams" }));
    expect(screen.getByText("Showing 7–8 of 8 teams")).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Search teams" }), { target: { value: "builder2@example.test" } });
    expect(screen.getByRole("button", { name: "Open roster for Team 2" })).toBeVisible();
    expect(screen.getByText("Showing 1–1 of 1 teams")).toBeVisible();
    expect(screen.queryByText("builder2@example.test")).not.toBeInTheDocument();
  });

  it("opens only one roster at a time and reveals individual contacts on demand", () => {
    render(<AdminTeamsPanel selectedHackathon={event} submissions={teams} isLoading={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Open roster for Team 1" }));
    expect(screen.getByText("Builder 1")).toBeVisible();
    expect(screen.queryByRole("link", { name: "builder1@example.test" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show email for Builder 1" }));
    expect(screen.getByRole("link", { name: "builder1@example.test" })).toHaveAttribute("href", "mailto:builder1@example.test");
    fireEvent.click(screen.getByRole("button", { name: "Show email for Partner 1" }));
    expect(screen.queryByRole("link", { name: "builder1@example.test" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "partner1@example.test" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Open roster for Team 2" }));
    expect(screen.queryByText("Builder 1")).not.toBeInTheDocument();
    expect(screen.getByText("Builder 2")).toBeVisible();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("does not use emails as fallback display names", () => {
    const row = { ...teams[0], teamLeaderName: null, members: [{ ...teams[0].members[0], name: "builder1@example.test" }] };
    render(<AdminTeamsPanel selectedHackathon={event} submissions={[row]} isLoading={false} />);
    expect(screen.getByText("Leader: Team creator")).toBeVisible();
    expect(screen.queryByText(row.participantEmail)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open roster for Team 1" }));
    expect(screen.getByText("Team member")).toBeVisible();
    expect(screen.queryByText("builder1@example.test")).not.toBeInTheDocument();
  });

  it("preserves the confirmation before publishing a selected team", () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminTeamsPanel selectedHackathon={event} submissions={[teams[0]]} isLoading={false} onSetSubmissionPublic={publish} />);
    fireEvent.click(screen.getByRole("button", { name: "Open roster for Team 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Make public" }));
    expect(publish).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Make public" }));
    expect(publish).toHaveBeenCalledWith("team-1", true);
  });
});
