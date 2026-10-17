import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPeopleDirectory } from "@/components/dashboard/AdminPeopleDirectory";
import type { AdminUser } from "@/components/dashboard/AdminDashboard";
import type { PortalHackathon } from "@/lib/hackathons";
import type { ComponentProps } from "react";

afterEach(cleanup);

const events: PortalHackathon[] = [
  { id: "tokyo", name: "Tokyo Builders", shortName: "Tokyo", eventDate: "2026-10-18", location: "Tokyo", theme: "Build", status: "active" },
  { id: "osaka", name: "Osaka Builders", shortName: "Osaka", eventDate: "2026-11-18", location: "Osaka", theme: "Build", status: "upcoming" },
];
const users: AdminUser[] = Array.from({ length: 10 }, (_, index) => ({
  id: `account-${index}`, email: `person${index}@example.com`, role: "participant",
  hackathonId: "tokyo", profile: { fullName: `Person ${index}` },
}));
const judge: AdminUser = { id: "judge-a", email: "judge@example.com", role: "judge", judgeApprovalStatus: "pending", hackathonIds: ["tokyo"], profile: { fullName: "Aki Tanaka", organization: "Builder Studio" } };

function props(overrides: Partial<ComponentProps<typeof AdminPeopleDirectory>> = {}): ComponentProps<typeof AdminPeopleDirectory> {
  return {
    users, hackathons: events, selectedHackathon: events[0], isLoading: false, savingUserId: null,
    pendingRoles: {}, onRoleChange: vi.fn(), onSaveRole: vi.fn().mockResolvedValue(undefined),
    onApproveJudge: vi.fn().mockResolvedValue(undefined), onRejectJudge: vi.fn().mockResolvedValue(undefined),
    onApproveHost: vi.fn().mockResolvedValue(undefined), onUpdateHackathonAccess: vi.fn().mockResolvedValue(undefined), ...overrides,
  };
}

describe("admin people directory", () => {
  it("shows a loading status while keeping account rows unavailable", () => {
    render(<AdminPeopleDirectory {...props({ isLoading: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading people");
    expect(screen.queryByRole("button", { name: /^Manage / })).not.toBeInTheDocument();
  });

  it("paginates names and keeps all email addresses out of the directory", () => {
    render(<AdminPeopleDirectory {...props()} />);
    expect(screen.getAllByRole("button", { name: /^Manage / })).toHaveLength(8);
    expect(screen.getByText("Showing 1–8 of 10")).toBeInTheDocument();
    expect(screen.queryByText(/@example\.com/)).not.toBeInTheDocument();
    expect(screen.queryByText("Person 8")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next people page" }));
    expect(screen.getAllByRole("button", { name: /^Manage / })).toHaveLength(2);
    expect(screen.getByText("Person 8")).toBeInTheDocument();
    expect(screen.getByText("Showing 9–10 of 10")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search people" }), { target: { value: "person3@example.com" } });
    expect(screen.getByRole("button", { name: "Manage Person 3" })).toBeInTheDocument();
    expect(screen.getByText("Showing 1–1 of 1")).toBeInTheDocument();
    expect(screen.queryByText("person3@example.com")).not.toBeInTheDocument();
  });

  it("opens only one person's contact information and closes it when changing events", () => {
    const setup = props();
    const view = render(<AdminPeopleDirectory {...setup} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage Person 0" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Person 0");
    expect(screen.getByText("person0@example.com")).toBeInTheDocument();
    expect(screen.queryByText("person1@example.com")).not.toBeInTheDocument();
    view.rerender(<AdminPeopleDirectory {...setup} selectedHackathon={events[1]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("person0@example.com")).not.toBeInTheDocument();
  });

  it("searches names, filters roles and surfaces only requests needing approval", () => {
    const host: AdminUser = { id: "host", email: "host@example.com", role: "host", hostApprovalStatus: "pending", profile: { fullName: "Host Person" } };
    render(<AdminPeopleDirectory {...props({ users: [judge, ...users, host], initialFilter: "pending" })} />);
    expect(screen.getAllByRole("button", { name: /^Manage / })).toHaveLength(2);
    expect(screen.queryByText("Person 0")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Filter people by role" }), { target: { value: "staff" } });
    expect(screen.getAllByRole("button", { name: /^Manage / })).toHaveLength(1);
    expect(screen.getByText("Aki Tanaka")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search people" }), { target: { value: "nobody" } });
    expect(screen.getByText("No people found")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Search people" }), { target: { value: "aki tan" } });
    expect(screen.getByText("Aki Tanaka")).toBeInTheDocument();
  });

  it("keeps event changes local until Save access and reconciles successful server updates", async () => {
    const setup = props({ users: [judge] });
    const view = render(<AdminPeopleDirectory {...setup} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage Aki Tanaka" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("button", { name: "Save access" })).toBeDisabled();
    fireEvent.click(dialog.getByRole("checkbox", { name: "Osaka Builders" }));
    expect(setup.onUpdateHackathonAccess).not.toHaveBeenCalled();
    expect(dialog.getByRole("button", { name: "Save access" })).toBeEnabled();
    fireEvent.click(dialog.getByRole("button", { name: "Save access" }));
    expect(setup.onUpdateHackathonAccess).toHaveBeenCalledWith(judge, ["tokyo", "osaka"]);
    view.rerender(<AdminPeopleDirectory {...setup} users={[{ ...judge, hackathonIds: ["tokyo", "osaka"], judgeApprovalStatus: "approved" }]} message="Access updated." />);
    expect(dialog.getByRole("status")).toHaveTextContent("Access updated.");
    expect(dialog.queryByRole("button", { name: "Approve for Tokyo" })).not.toBeInTheDocument();
    expect(dialog.getByRole("checkbox", { name: "Osaka Builders" })).toBeChecked();
    expect(await dialog.findByRole("button", { name: "Save access" })).toBeDisabled();
  });

  it("discards unsaved access on close without writing and keeps unknown event grants", () => {
    const hiddenEventJudge = { ...judge, hackathonIds: ["tokyo", "archived-event"] };
    const setup = props({ users: [hiddenEventJudge] });
    render(<AdminPeopleDirectory {...setup} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage Aki Tanaka" }));
    expect(screen.getByRole("checkbox", { name: "archived-event" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Osaka Builders" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(setup.onUpdateHackathonAccess).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Manage Aki Tanaka" }));
    expect(screen.getByRole("checkbox", { name: "Osaka Builders" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "archived-event" })).toBeChecked();
  });

  it("preserves role and approval actions and shows parent failure feedback", () => {
    const setup = props({ users: [judge] });
    const view = render(<AdminPeopleDirectory {...setup} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage Aki Tanaka" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Account role" }), { target: { value: "mentor" } });
    expect(setup.onRoleChange).toHaveBeenCalledWith(judge.id, "mentor");
    view.rerender(<AdminPeopleDirectory {...setup} pendingRoles={{ [judge.id]: "mentor" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Save role" }));
    expect(setup.onSaveRole).toHaveBeenCalledWith(judge);
    fireEvent.click(screen.getByRole("button", { name: "Approve for Tokyo" }));
    expect(setup.onApproveJudge).toHaveBeenCalledWith(judge);
    fireEvent.click(screen.getByRole("button", { name: "Convert to participant" }));
    expect(setup.onRejectJudge).toHaveBeenCalledWith(judge);
    view.rerender(<AdminPeopleDirectory {...setup} message="Access update failed." />);
    expect(within(screen.getByRole("dialog")).getByRole("status")).toHaveTextContent("Access update failed.");
  });

  it("never derives an unnamed person's display identity from their email", () => {
    render(<AdminPeopleDirectory {...props({ users: [{ ...users[0], profile: undefined }] })} />);
    expect(screen.getByRole("heading", { name: "Unnamed user" })).toBeInTheDocument();
    expect(screen.getByText("Account account-")).toBeInTheDocument();
    expect(screen.queryByText("person0")).not.toBeInTheDocument();
  });

  it("shows host proposal details before approving that host", () => {
    const host: AdminUser = {
      id: "host", email: "host@example.com", role: "host", profile: { fullName: "Host Person" },
      hostApplication: { organizerTitle: "Organizer", eventName: "Tokyo Build", theme: "Public good", goals: "Support local teams", targetDate: "November", audience: "Builders", website: "", eventType: "Hackathon", format: "Online", expectedAttendees: "100", duration: "2 days", location: "Tokyo", timezone: "Asia/Tokyo", successDefinition: "", supportNeeded: "", experience: "", submittedAt: "2026-10-01" },
    };
    const setup = props({ users: [host] });
    render(<AdminPeopleDirectory {...setup} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage Host Person" }));
    expect(screen.getByText("Support local teams")).toBeInTheDocument();
    expect(screen.getByText("November")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve host" }));
    expect(setup.onApproveHost).toHaveBeenCalledWith(host);
  });
});
