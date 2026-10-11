import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ParticipantTeamPage from "@/pages/ParticipantTeamPage";
import type { TeamManagementWorkspaceProps } from "@/components/dashboard/TeamManagementWorkspace";

const backend = vi.hoisted(() => ({
  db: {},
  auth: { currentUser: { uid: "participant" } as { uid: string } | null },
  user: { id: "participant", email: "participant@example.com", role: "participant", hackathonIds: ["event-one", "event-two"] },
  getDoc: vi.fn(), setDoc: vi.fn(), submissions: vi.fn(), assertWritable: vi.fn(),
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => backend.db, getFirebaseAuth: () => backend.auth }));
vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  doc: (_source: unknown, collection: string, id: string) => ({ id, path: `${collection}/${id}` }),
  getDoc: backend.getDoc,
  setDoc: backend.setDoc,
}));
vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => ({ sessionUser: backend.user, loading: false, signOut: vi.fn() }) }));
vi.mock("@/hooks/useHackathonSelection", async () => {
  const { useState } = await import("react");
  return { useHackathonSelection: () => {
    const [selectedHackathonId, setSelectedHackathonId] = useState("event-one");
    return { selectedHackathonId, setSelectedHackathonId };
  } };
});
vi.mock("@/lib/aiHackathons", () => ({
  fetchPortalHackathonCatalog: async () => [],
  subscribeHackathon: () => () => {},
  assertSubmissionsWritable: backend.assertWritable,
}));
vi.mock("@/lib/portalInvites", () => ({
  listAccessibleSubmissions: backend.submissions,
  listTeamMembershipsForSubmission: async () => [],
  loadUserProfiles: async () => ({}),
  createTeamInvite: vi.fn(), revokeTeamInvite: vi.fn(), setTeamLeader: vi.fn(),
}));
vi.mock("@/lib/teammatePosts", () => ({
  listTeammatePosts: async () => [],
  closeOwnOpenPosts: vi.fn(), createTeammatePost: vi.fn(), deleteTeammatePost: vi.fn(), updateTeammatePost: vi.fn(),
}));
vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: ({ children, onHackathonChange }: { children: React.ReactNode; onHackathonChange: (id: string) => void }) => (
    <div><button onClick={() => onHackathonChange("event-two")}>Open second event</button>{children}</div>
  ),
}));
vi.mock("@/components/dashboard/TeamManagementWorkspace", () => ({
  TeamManagementWorkspace: (props: TeamManagementWorkspaceProps) => (
    <div>
      <input aria-label="Team name" disabled={props.isLoading || props.isReadOnly} value={props.teamName} onChange={(event) => props.onTeamNameChange(event.target.value)} />
      <button disabled={props.isLoading || props.isReadOnly} onClick={props.onTeamNameBlur}>Save team</button>
      {props.participantSubmissions.map((submission) => <button key={submission.id} onClick={() => props.onSelectSubmission(submission.id)}>Open {submission.id}</button>)}
    </div>
  ),
}));

const firstTeam = { id: "team-one", user_id: "participant", hackathon_id: "event-one", team_name: "First team" };
const secondTeam = { id: "team-two", user_id: "participant", hackathon_id: "event-two", team_name: "Second team" };
const view = () => <MemoryRouter><ParticipantTeamPage /></MemoryRouter>;

beforeEach(() => {
  vi.clearAllMocks();
  backend.auth.currentUser = { uid: "participant" };
  backend.getDoc.mockReset().mockResolvedValue({ exists: () => true, data: () => ({ fullName: "Participant", hackathon_ids: ["event-one", "event-two"] }) });
  backend.submissions.mockReset().mockResolvedValue([firstTeam, secondTeam]);
  backend.assertWritable.mockReset().mockResolvedValue(undefined);
  backend.setDoc.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("participant team editing safety", () => {
  it("loads the existing name and replaces an unsaved name when opening another event", async () => {
    render(view());
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Team name" })).toHaveValue("First team"));
    fireEvent.change(screen.getByRole("textbox", { name: "Team name" }), { target: { value: "First team's edit" } });

    fireEvent.click(screen.getByRole("button", { name: "Open second event" }));

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Team name" })).toHaveValue("Second team"));
    expect(backend.setDoc).not.toHaveBeenCalled();
  });

  it("blocks team creation on a failed lookup and supports retry", async () => {
    backend.submissions.mockRejectedValueOnce(new Error("Offline"));
    render(view());
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your teams");
    expect(screen.getByRole("button", { name: "Save team" })).toBeDisabled();
    expect(backend.setDoc).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Retry loading teams" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Team name" })).toHaveValue("First team"));
    expect(screen.getByRole("button", { name: "Save team" })).toBeEnabled();
  });

  it("renames a team without replacing its saved roster from a partial member lookup", async () => {
    backend.submissions.mockResolvedValue([{ ...firstTeam, member_names: "Participant\nTeammate", member_name_list: ["Participant", "Teammate"] }]);
    render(view());
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Team name" })).toHaveValue("First team"));
    fireEvent.change(screen.getByRole("textbox", { name: "Team name" }), { target: { value: "Renamed team" } });
    fireEvent.click(screen.getByRole("button", { name: "Save team" }));

    await waitFor(() => expect(backend.setDoc).toHaveBeenCalledOnce());
    expect(backend.setDoc).toHaveBeenCalledWith(
      { id: "team-one", path: "submissions/team-one" },
      { team_name: "Renamed team", updated_at: expect.any(String) },
      { merge: true },
    );
  });

  it.each(["account", "event"])("abandons a pending team save when the %s changes", async (change) => {
    let finishCheck!: () => void;
    backend.assertWritable.mockReturnValueOnce(new Promise<void>((resolve) => { finishCheck = resolve; }));
    render(view());
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Team name" })).toHaveValue("First team"));
    fireEvent.change(screen.getByRole("textbox", { name: "Team name" }), { target: { value: "Renamed team" } });
    fireEvent.click(screen.getByRole("button", { name: "Save team" }));
    expect(backend.assertWritable).toHaveBeenCalledOnce();
    if (change === "account") backend.auth.currentUser = { uid: "another-participant" };
    else fireEvent.click(screen.getByRole("button", { name: "Open second event" }));

    await act(async () => finishCheck());

    expect(backend.setDoc).not.toHaveBeenCalled();
  });
});
