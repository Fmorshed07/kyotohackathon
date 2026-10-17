import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPeopleWorkspace } from "@/components/dashboard/AdminPeopleWorkspace";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import type { AdminUser } from "@/components/dashboard/AdminDashboard";
import type { PortalHackathon } from "@/lib/hackathons";

const panelCalls = vi.hoisted(() => ({
  directory: vi.fn(),
  teams: vi.fn(),
  subscribers: vi.fn(),
  judgeInvites: vi.fn(),
}));

// Individual panels have their own interaction tests. These small boundaries make
// accidental mounting of an unrelated directory or contact list observable.
vi.mock("@/components/dashboard/AdminPeopleDirectory", () => ({
  AdminPeopleDirectory: (props: { users: AdminUser[]; initialFilter: string }) => {
    panelCalls.directory(props);
    return <section data-testid="people-directory" data-filter={props.initialFilter}>
      {props.users.map(user => <p key={user.id} data-person-id={user.id}>{user.profile?.fullName}</p>)}
    </section>;
  },
}));
vi.mock("@/components/dashboard/AdminTeamsPanel", () => ({
  AdminTeamsPanel: (props: unknown) => {
    panelCalls.teams(props);
    return <section data-testid="teams-panel">Team directory</section>;
  },
}));
vi.mock("@/components/dashboard/AdminNewsletterPanel", () => ({
  AdminNewsletterPanel: (props: unknown) => {
    panelCalls.subscribers(props);
    return <section data-testid="subscribers-panel">Subscriber directory</section>;
  },
}));
vi.mock("@/components/dashboard/JudgeInvitePanel", () => ({
  JudgeInvitePanel: (props: unknown) => {
    panelCalls.judgeInvites(props);
    return <section data-testid="judge-invite-panel">Judge invitation form</section>;
  },
}));

const event: PortalHackathon = {
  id: "impact-tokyo-2026",
  name: "Impact Tokyo 2026",
  shortName: "Tokyo",
  eventDate: "24 October 2026",
  location: "Tokyo, Japan",
  theme: "Build beyond borders",
  status: "upcoming",
};

const pendingJudge: AdminUser = {
  id: "global-judge",
  email: "judge@example.test",
  role: "judge",
  judgeApprovalStatus: "pending",
  hackathonIds: ["another-event"],
  profile: { fullName: "Global judge" },
};
const pendingHost: AdminUser = {
  id: "global-host",
  email: "host@example.test",
  role: "host",
  hostApprovalStatus: "pending",
  hackathonIds: ["another-event"],
  profile: { fullName: "Global host" },
};

type WorkspaceProps = ComponentProps<typeof AdminPeopleWorkspace>;

function makeProps(overrides: Partial<WorkspaceProps> = {}): WorkspaceProps {
  return {
    selectedHackathon: event,
    hackathons: [event],
    users: [
      { id: "participant", email: "participant@example.test", role: "participant", profile: { fullName: "Event participant" } },
      { ...pendingJudge, profile: { fullName: "Updated judge name" } },
    ],
    hostAccounts: [pendingHost, { id: "approved-host", email: "approved-host@example.test", role: "host", hostApprovalStatus: "approved", profile: { fullName: "Approved host" } }],
    judgeAccounts: [
      pendingJudge,
      { id: "global-mentor", email: "mentor@example.test", role: "mentor", profile: { fullName: "Global mentor" } },
      { id: "approved-judge", email: "approved-judge@example.test", role: "judge", judgeApprovalStatus: "approved", profile: { fullName: "Approved judge" } },
    ],
    isLoadingUsers: false,
    savingUserId: null,
    pendingRoles: {},
    onRoleChange: vi.fn(),
    onSaveRole: vi.fn().mockResolvedValue(undefined),
    onApproveJudge: vi.fn().mockResolvedValue(undefined),
    onRejectJudge: vi.fn().mockResolvedValue(undefined),
    onApproveHost: vi.fn().mockResolvedValue(undefined),
    onUpdateHackathonAccess: vi.fn().mockResolvedValue(undefined),
    message: null,
    submissions: [],
    isLoadingSubmissions: false,
    publishingSubmissionId: null,
    onSetSubmissionPublic: vi.fn().mockResolvedValue(undefined),
    adminGrantEmail: "new-admin@example.test",
    onAdminGrantEmailChange: vi.fn(),
    pendingAdminGrants: [
      { email: "invited-one@example.test", grantedAt: "2026-10-18T09:00:00Z" },
      { email: "invited-two@example.test", grantedAt: "2026-10-18T09:00:00Z" },
    ],
    isGrantingAdmin: false,
    onGrantAdminAccess: vi.fn().mockResolvedValue(undefined),
    broadcastSubject: "Submission update",
    onBroadcastSubjectChange: vi.fn(),
    broadcastMessage: "Please check the submission deadline.",
    onBroadcastMessageChange: vi.fn(),
    isSendingBroadcast: false,
    onSendParticipantBroadcast: vi.fn().mockResolvedValue(undefined),
    newsletterSubscribers: [{ email: "subscriber@example.test", source: "newsletter", createdAt: "2026-10-18T09:00:00Z" }],
    isLoadingNewsletter: false,
    judgeInviteLabel: "Tokyo judging panel",
    onJudgeInviteLabelChange: vi.fn(),
    judgeInviteHackathonIds: [event.id],
    onToggleJudgeInviteHackathon: vi.fn(),
    judgeInviteUrl: null,
    judgeInviteMessage: null,
    isCreatingJudgeInvite: false,
    onCreateJudgeInvite: vi.fn().mockResolvedValue(undefined),
    insights: <section data-testid="insights-panel">Audience insights</section>,
    ...overrides,
  };
}

function LocationControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <output data-testid="location">{location.pathname}{location.search}{location.hash}</output>
    <button onClick={() => navigate(-1)}>Go back in history</button>
    <button onClick={() => navigate({ ...location, hash: "manage-participants" })}>Legacy participant link</button>
    <button onClick={() => navigate({ ...location, hash: "manage-judges" })}>Legacy staff link</button>
    <button onClick={() => navigate({ ...location, hash: "manage-hosts" })}>Legacy host link</button>
  </>;
}

function showWorkspace({ hash = "", props = makeProps(), withSidebar = false } = {}) {
  const content = <AdminPeopleWorkspace {...props} />;
  render(<MemoryRouter
    initialEntries={[`/dashboard/admin/people?hackathon=${event.id}&view=compact${hash}`]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    {withSidebar ? <DashboardLayout
      role="admin"
      sessionUser={{ id: "admin", email: "admin@example.test", role: "admin" }}
      onSignOut={vi.fn().mockResolvedValue(undefined)}
      selectedHackathonId={event.id}
      hackathons={[event]}
    >{content}</DashboardLayout> : content}
    <LocationControls />
  </MemoryRouter>);
  return props;
}

function selectTab(name: string | RegExp) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("people workspace structure", () => {
  it("starts with only the directory and does not render contact or access forms", () => {
    const props = showWorkspace();
    expect(screen.getByRole("tab", { name: "Directory" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("people-directory")).toHaveAttribute("data-filter", "all");
    expect(panelCalls.teams).not.toHaveBeenCalled();
    expect(panelCalls.subscribers).not.toHaveBeenCalled();
    expect(panelCalls.judgeInvites).not.toHaveBeenCalled();
    expect(screen.queryByTestId("insights-panel")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Email address" })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(props.adminGrantEmail)).not.toBeInTheDocument();
    for (const email of ["subscriber@example.test", ...props.pendingAdminGrants.map(grant => grant.email)]) {
      expect(screen.queryByText(email)).not.toBeInTheDocument();
    }
    expect(props.onGrantAdminAccess).not.toHaveBeenCalled();
    expect(props.onApproveJudge).not.toHaveBeenCalled();
    expect(props.onApproveHost).not.toHaveBeenCalled();
  });

  it("merges event participants with global staff without duplicating a person", () => {
    showWorkspace();
    const directory = screen.getByTestId("people-directory");
    expect(directory.querySelectorAll("[data-person-id]")).toHaveLength(6);
    expect(directory.querySelectorAll('[data-person-id="global-judge"]')).toHaveLength(1);
    expect(within(directory).getByText("Updated judge name")).toBeInTheDocument();
    expect(within(directory).getByText("Global host")).toBeInTheDocument();
    expect(within(directory).getByText("Global mentor")).toBeInTheDocument();
  });

  it.each([
    ["manage-participants", "participant"],
    ["manage-judges", "staff"],
    ["manage-hosts", "host"],
  ])("opens a legacy #%s bookmark with the appropriate directory filter", (hash, filter) => {
    showWorkspace({ hash: `#${hash}` });
    expect(screen.getByRole("tab", { name: "Directory" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("people-directory")).toHaveAttribute("data-filter", filter);
  });

  it("updates filters when following a legacy link within the mounted directory", () => {
    showWorkspace();
    for (const [label, filter] of [["Legacy participant link", "participant"], ["Legacy staff link", "staff"], ["Legacy host link", "host"]]) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(screen.getByTestId("people-directory")).toHaveAttribute("data-filter", filter);
    }
  });

  it("collects pending host, judge, and mentor requests across events exactly once", () => {
    const props = showWorkspace();
    selectTab(/^Requests/);
    const directory = screen.getByTestId("people-directory");
    expect(directory).toHaveAttribute("data-filter", "pending");
    expect(directory.querySelectorAll("[data-person-id]")).toHaveLength(3);
    expect(within(directory).getByText("Updated judge name")).toBeInTheDocument();
    expect(within(directory).getByText("Global host")).toBeInTheDocument();
    expect(within(directory).getByText("Global mentor")).toBeInTheDocument();
    expect(within(directory).queryByText("Approved judge")).not.toBeInTheDocument();
    expect(within(directory).queryByText("Approved host")).not.toBeInTheDocument();
    expect(within(directory).queryByText("Event participant")).not.toBeInTheDocument();
    expect(panelCalls.directory).toHaveBeenLastCalledWith(expect.objectContaining({
      selectedHackathon: event,
      onApproveHost: props.onApproveHost,
      onApproveJudge: props.onApproveJudge,
      onRejectJudge: props.onRejectJudge,
      onUpdateHackathonAccess: props.onUpdateHackathonAccess,
    }));
    expect(screen.getByRole("tab", { name: /^Requests/ })).toHaveTextContent("3");
  });

  it("mounts teams and insights only when selected and preserves event context through back navigation", () => {
    const props = showWorkspace();
    selectTab("Teams");
    expect(screen.getByTestId("teams-panel")).toBeVisible();
    expect(screen.queryByTestId("people-directory")).not.toBeInTheDocument();
    expect(panelCalls.teams).toHaveBeenLastCalledWith(expect.objectContaining({
      selectedHackathon: event,
      submissions: props.submissions,
      onSetSubmissionPublic: props.onSetSubmissionPublic,
    }));
    expect(screen.getByTestId("location")).toHaveTextContent(`?hackathon=${event.id}&view=compact#event-teams`);
    selectTab("Insights");
    expect(screen.getByTestId("insights-panel")).toBeVisible();
    expect(screen.queryByTestId("teams-panel")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go back in history" }));
    expect(screen.getByTestId("teams-panel")).toBeVisible();
    expect(screen.queryByTestId("insights-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(`?hackathon=${event.id}&view=compact#event-teams`);
    fireEvent.click(screen.getByRole("button", { name: "Go back in history" }));
    expect(screen.getByTestId("people-directory")).toBeVisible();
    expect(screen.getByTestId("location")).toHaveTextContent(`/dashboard/admin/people?hackathon=${event.id}&view=compact`);
  });

  it("separates judge invitations from admin grants and reveals only one pending contact at a time", () => {
    const props = showWorkspace();
    selectTab("Invite & access");
    expect(screen.getByTestId("judge-invite-panel")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "Email address" })).not.toBeInTheDocument();
    expect(panelCalls.judgeInvites).toHaveBeenLastCalledWith(expect.objectContaining({
      selectedHackathonIds: [event.id],
      onGenerate: props.onCreateJudgeInvite,
    }));
    fireEvent.click(screen.getByRole("button", { name: "Admin access" }));
    expect(screen.queryByTestId("judge-invite-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email address" })).toHaveValue(props.adminGrantEmail);
    for (const grant of props.pendingAdminGrants) expect(screen.queryByText(grant.email)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Pending invitations (2)"));
    fireEvent.click(screen.getAllByRole("button", { name: "View email" })[0]);
    expect(screen.getByText(props.pendingAdminGrants[0].email)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "View email" }));
    expect(screen.queryByText(props.pendingAdminGrants[0].email)).not.toBeInTheDocument();
    expect(screen.getByText(props.pendingAdminGrants[1].email)).toBeVisible();
    expect(props.onGrantAdminAccess).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Grant admin access" }));
    expect(props.onGrantAdminAccess).toHaveBeenCalledOnce();
  });

  it.each([
    { adminGrantEmail: "   ", isGrantingAdmin: false },
    { adminGrantEmail: "new-admin@example.test", isGrantingAdmin: true },
  ])("blocks empty or already pending admin grants", overrides => {
    const props = showWorkspace({ hash: "#grant-admin-access", props: makeProps(overrides) });
    const button = screen.getByRole("button", { name: /Granting|Grant admin access/ });
    expect(button).toBeDisabled();
    fireEvent.submit(button.closest("form")!);
    expect(props.onGrantAdminAccess).not.toHaveBeenCalled();
  });

  it("keeps subscriber browsing separate from composing an event announcement", () => {
    const props = showWorkspace();
    selectTab("Messages");
    expect(screen.getByTestId("subscribers-panel")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "Subject" })).not.toBeInTheDocument();
    expect(panelCalls.subscribers).toHaveBeenLastCalledWith(expect.objectContaining({ subscribers: props.newsletterSubscribers }));
    fireEvent.click(screen.getByRole("button", { name: "Email participants" }));
    expect(screen.queryByTestId("subscribers-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Subject" })).toHaveValue(props.broadcastSubject);
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(props.broadcastMessage);
    expect(screen.getByText(`Send an update to all participants registered for ${event.name}.`)).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Subject" }), { target: { value: "New subject" } });
    expect(props.onBroadcastSubjectChange).toHaveBeenCalledWith("New subject");
    expect(props.onSendParticipantBroadcast).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Send announcement" }));
    expect(props.onSendParticipantBroadcast).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Subscribers" }));
    expect(screen.getByTestId("subscribers-panel")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "Subject" })).not.toBeInTheDocument();
  });

  it("activates people views from same-page sidebar links through the router", () => {
    showWorkspace({ withSidebar: true });
    fireEvent.click(screen.getByRole("link", { name: "Messages" }));
    expect(screen.getByTestId("subscribers-panel")).toBeVisible();
    expect(screen.getByRole("tab", { name: "Messages" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("location")).toHaveTextContent(`?hackathon=${event.id}&view=compact#newsletter`);
    fireEvent.click(screen.getByRole("link", { name: "Access requests" }));
    expect(screen.getByTestId("people-directory")).toHaveAttribute("data-filter", "pending");
    expect(screen.queryByTestId("subscribers-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(`?hackathon=${event.id}&view=compact#manage-judge-approvals`);
    fireEvent.click(screen.getByRole("button", { name: "Go back in history" }));
    expect(screen.getByTestId("subscribers-panel")).toBeVisible();
  });
});
