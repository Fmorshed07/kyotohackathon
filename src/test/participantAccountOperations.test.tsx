import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ParticipantDashboardPage from "@/pages/ParticipantDashboardPage";
import type { ParticipantDashboardProps } from "@/components/dashboard/ParticipantDashboard";
import type { PortalHackathon } from "@/lib/hackathons";
import { formDraftStorageKey, readFormDraft, writeFormDraft } from "@/lib/formDrafts";

const backend = vi.hoisted(() => ({
  selectedEvent: "event-one",
  db: {},
  sessionUser: { id: "account-a", email: "a@example.com", role: "participant", hackathonId: "event-one" } as {
    id: string; email: string; role: string; hackathonId: string; hackathonIds?: string[];
  },
  auth: { currentUser: { uid: "account-a" } as { uid: string } | null },
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  assertWritable: vi.fn(),
  catalog: vi.fn(),
  joinable: vi.fn(),
  selectEvent: vi.fn(),
  queueEmail: vi.fn(),
  submissions: vi.fn(),
  newSubmissionIds: 0,
}));

vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  collection: (_db: unknown, name: string) => ({ path: name }),
  doc: (source: { path?: string }, name?: string, id?: string) => {
    if (name) return { id, path: `${name}/${id}` };
    backend.newSubmissionIds += 1;
    const generatedId = backend.newSubmissionIds === 1 ? "new-project" : `new-project-${backend.newSubmissionIds}`;
    return { id: generatedId, path: `${source.path}/${generatedId}` };
  },
  getDoc: backend.getDoc,
  setDoc: backend.setDoc,
  deleteDoc: backend.deleteDoc,
}));
vi.mock("@/lib/firebaseClient", () => ({
  getFirestoreDb: () => backend.db,
  getFirebaseAuth: () => backend.auth,
}));
vi.mock("@/hooks/usePortalAuth", () => ({
  usePortalAuth: () => ({
    sessionUser: backend.sessionUser,
    loading: false,
    signOut: vi.fn(),
  }),
}));
vi.mock("@/hooks/useHackathonSelection", () => ({
  useHackathonSelection: () => ({ selectedHackathonId: backend.selectedEvent, setSelectedHackathonId: backend.selectEvent }),
}));
vi.mock("@/lib/aiHackathons", () => ({
  assertSubmissionsWritable: backend.assertWritable,
  fetchPortalHackathonCatalog: backend.catalog,
  fetchJoinablePortalHackathons: backend.joinable,
  subscribeHackathon: () => () => {},
}));
vi.mock("@/lib/portalInvites", () => ({
  listAccessibleSubmissions: backend.submissions,
  listTeamMembershipsForSubmission: async () => [],
  loadUserProfiles: async () => ({}),
}));
vi.mock("@/lib/profileMedia", () => ({ uploadProfileImage: vi.fn() }));
vi.mock("@/lib/participantEmail", () => ({ queueParticipantEmail: backend.queueEmail }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: ({ children, hackathons = [], selectedHackathonId, onBrowseHackathons }: {
    children: React.ReactNode;
    hackathons?: PortalHackathon[];
    selectedHackathonId?: string;
    onBrowseHackathons?: () => void;
  }) => <div>
    <output data-testid="accessible-events">{hackathons.map(event => event.id).join(",")}</output>
    <output data-testid="selected-event">{selectedHackathonId}</output>
    <button onClick={onBrowseHackathons}>Join another hackathon</button>
    {children}
  </div>,
}));
vi.mock("@/components/dashboard/ParticipantDashboard", () => ({
  ParticipantDashboard: ({ isLoadingWorkspace, isReadOnly, isSubmittingProject, participantForm, setParticipantForm, submissionMessage, autosaveStatus, onSave, onJoinHackathon, hackathonSummaries }: ParticipantDashboardProps) => (
    <div>
      <output data-testid="registered-events">{hackathonSummaries.map(summary => summary.hackathon.id).join(",")}</output>
      <input aria-label="Project title" value={participantForm.title} onChange={(event) => setParticipantForm((form) => ({ ...form, title: event.target.value }))} />
      <output data-testid="submission-track">{participantForm.trackId ?? ""}</output>
      <input type="checkbox" aria-label="Public preview" checked={participantForm.allowPublicPreview} onChange={(event) => setParticipantForm((form) => ({ ...form, allowPublicPreview: event.target.checked }))} />
      <button disabled={isLoadingWorkspace || isReadOnly || isSubmittingProject} onClick={() => void onSave()}>Save project</button>
      <button disabled={isLoadingWorkspace} onClick={() => void onJoinHackathon("event-two")}>Join event</button>
      {submissionMessage ? <p>{submissionMessage}</p> : null}
      {autosaveStatus ? <p>{autosaveStatus}</p> : null}
    </div>
  ),
}));

const event = (id: string): PortalHackathon => ({
  id, name: id, shortName: id, eventDate: "", location: "", theme: "", status: "active",
});
const snapshot = (id: string, data: Record<string, unknown>) => ({ id, exists: () => true, data: () => data });
const savedProject = snapshot("new-project", {
  user_id: "account-a", hackathon_id: "event-one", title: "Account A project", team_name: "Team A",
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  backend.selectedEvent = "event-one";
  vi.clearAllMocks();
  localStorage.clear();
  backend.auth.currentUser = { uid: "account-a" };
  backend.sessionUser = { id: "account-a", email: "a@example.com", role: "participant", hackathonId: "event-one" };
  backend.submissions.mockReset().mockResolvedValue([]);
  backend.newSubmissionIds = 0;
  backend.getDoc.mockReset().mockImplementation(async ({ path }: { path: string }) =>
    path.startsWith("users/")
      ? snapshot("account-a", { fullName: "Account A", hackathon_id: "event-one" })
      : path.startsWith("public_projects/") ? { exists: () => false, data: () => undefined } : savedProject,
  );
  backend.setDoc.mockReset().mockResolvedValue(undefined);
  backend.deleteDoc.mockReset().mockResolvedValue(undefined);
  backend.assertWritable.mockReset().mockResolvedValue(undefined);
  backend.catalog.mockReset().mockResolvedValue([event("event-one"), event("event-two")]);
  backend.joinable.mockReset().mockResolvedValue([event("event-two")]);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
  vi.unstubAllGlobals();
});

async function showDashboard() {
  const view = render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ParticipantDashboardPage />
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.getByRole("button", { name: "Save project" })).toBeEnabled());
  return view;
}

describe("participant operations during account changes", () => {
  it("does not mark Kyoto registered for a new account with an explicitly empty enrollment list", async () => {
    backend.selectedEvent = "impact-osaka-2026";
    backend.sessionUser = { ...backend.sessionUser, hackathonId: "impact-kyoto", hackathonIds: [] };
    backend.catalog.mockResolvedValue([event("impact-osaka-2026"), event("impact-kyoto")]);
    backend.getDoc.mockResolvedValue(snapshot("account-a", { fullName: "Account A", hackathon_id: "impact-kyoto", hackathon_ids: [] }));

    await showDashboard();

    expect(screen.getByTestId("registered-events")).toBeEmptyDOMElement();
    expect(screen.getByTestId("accessible-events")).toBeEmptyDOMElement();
    expect(backend.selectEvent).not.toHaveBeenCalledWith("impact-kyoto");
    expect(backend.setDoc).not.toHaveBeenCalled();
  });

  it("keeps an Osaka membership without adding a stale Kyoto primary to registered events", async () => {
    const osaka = "impact-osaka-2026";
    backend.selectedEvent = osaka;
    backend.sessionUser = { ...backend.sessionUser, hackathonId: "impact-kyoto", hackathonIds: [osaka] };
    backend.catalog.mockResolvedValue([event(osaka), event("impact-kyoto")]);
    backend.getDoc.mockResolvedValue(snapshot("account-a", { fullName: "Account A", hackathon_id: "impact-kyoto", hackathon_ids: [osaka] }));

    await showDashboard();

    expect(screen.getByTestId("registered-events")).toHaveTextContent(/^impact-osaka-2026$/);
    expect(screen.getByTestId("accessible-events")).toHaveTextContent(/^impact-osaka-2026$/);
    expect(backend.selectEvent).not.toHaveBeenCalledWith("impact-kyoto");
    expect(backend.setDoc).not.toHaveBeenCalled();
  });

  it("automatically saves the Osaka video challenge under the correct event and restores it on reload", async () => {
    const osaka = "impact-osaka-2026";
    backend.selectedEvent = osaka;
    backend.sessionUser.hackathonId = osaka;
    backend.catalog.mockResolvedValue([event(osaka)]);
    backend.getDoc.mockImplementation(async ({ path }: { path: string }) => path.startsWith("users/")
      ? snapshot("account-a", { fullName: "Account A", hackathon_id: osaka })
      : snapshot("new-project", { user_id: "account-a", hackathon_id: osaka, title: "AI video demo", track_id: "ai-video" }));
    const view = await showDashboard();
    expect(screen.getByTestId("submission-track")).toHaveTextContent("ai-video");
    fireEvent.change(screen.getByRole("textbox", { name: "Project title" }), { target: { value: "AI video demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Save project" }));
    expect(await screen.findByText("Submission saved successfully.")).toBeInTheDocument();
    expect(backend.setDoc).toHaveBeenCalledWith(expect.objectContaining({ path: "submissions/new-project" }), expect.objectContaining({ hackathon_id: osaka, track_id: "ai-video", title: "AI video demo" }));
    view.unmount();
    backend.submissions.mockResolvedValue([{ id: "new-project", user_id: "account-a", hackathon_id: osaka, title: "AI video demo", track_id: "ai-video" }]);
    await showDashboard();
    expect(screen.getByTestId("submission-track")).toHaveTextContent("ai-video");
    expect(screen.getByRole("textbox", { name: "Project title" })).toHaveValue("AI video demo");
  });

  it("normalizes an older Osaka draft to the single challenge without losing the participant's edits", async () => {
    const osaka = "impact-osaka-2026";
    backend.selectedEvent = osaka;
    backend.sessionUser.hackathonId = osaka;
    backend.catalog.mockResolvedValue([event(osaka)]);
    const key = formDraftStorageKey(["participant-project", "account-a", osaka, "new"]);
    writeFormDraft(key, { trackId: "working-agent", title: "My unfinished video" });

    const view = await showDashboard();
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Project title" })).toHaveValue("My unfinished video"));
    expect(screen.getByTestId("submission-track")).toHaveTextContent("ai-video");
    view.unmount();

    expect(readFormDraft<{ trackId: string; title: string }>(key)?.value).toMatchObject({
      trackId: "ai-video", title: "My unfinished video",
    });
    expect(backend.setDoc).not.toHaveBeenCalled();
  });
  it("reuses the created project when a secondary write fails and the participant retries", async () => {
    backend.setDoc.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Enrollment write failed"));
    await showDashboard();
    fireEvent.change(screen.getByRole("textbox", { name: "Project title" }), { target: { value: "One project only" } });
    fireEvent.click(screen.getByRole("button", { name: "Save project" }));
    expect(await screen.findByText("Enrollment write failed")).toBeInTheDocument();
    expect(backend.newSubmissionIds).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Save project" }));

    expect(await screen.findByText("Submission saved successfully.")).toBeInTheDocument();
    const projectWrites = backend.setDoc.mock.calls.filter(([reference]) => reference.path.startsWith("submissions/"));
    expect(projectWrites).toHaveLength(2);
    expect(backend.newSubmissionIds).toBe(1);
    expect(projectWrites[1][0].path).toBe(projectWrites[0][0].path);
    expect(projectWrites[1][1].created_at).toBe(projectWrites[0][1].created_at);
    expect(projectWrites[1][2]).toEqual({ merge: true });
  });

  it("reports failed public-preview withdrawal, retains the draft, and lets the participant retry", async () => {
    const project = { id: "existing-project", user_id: "account-a", hackathon_id: "event-one", title: "Public project", public_preview_consent: true };
    backend.submissions.mockResolvedValue([project]);
    backend.getDoc.mockImplementation(async ({ path }: { path: string }) => path.startsWith("users/")
      ? snapshot("account-a", { fullName: "Account A", hackathon_id: "event-one" })
      : snapshot("existing-project", { ...project, public_preview_consent: false }));
    backend.deleteDoc.mockRejectedValueOnce(new Error("Permission denied"));
    await showDashboard();
    fireEvent.click(screen.getByRole("checkbox", { name: "Public preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Save project" }));

    expect(await screen.findByText(/Could not remove the public preview/)).toBeInTheDocument();
    expect(backend.setDoc).not.toHaveBeenCalled();
    expect(backend.queueEmail).not.toHaveBeenCalled();
    const key = formDraftStorageKey(["participant-project", "account-a", "event-one", "existing-project"]);
    expect(readFormDraft<{ allowPublicPreview: boolean }>(key)?.value.allowPublicPreview).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Save project" }));

    expect(await screen.findByText("Submission saved successfully.")).toBeInTheDocument();
    expect(backend.deleteDoc).toHaveBeenCalledTimes(2);
    expect(backend.queueEmail).toHaveBeenCalledOnce();
    expect(readFormDraft(key)).toBeNull();
  });

  it("disables manual save during autosave and saves newer edits afterward without creating a duplicate", async () => {
    const pendingWrite = deferred<void>();
    backend.setDoc.mockReturnValueOnce(pendingWrite.promise);
    backend.getDoc.mockImplementation(async ({ path }: { path: string }) => {
      if (path.startsWith("users/")) return snapshot("account-a", { fullName: "Account A", hackathon_id: "event-one" });
      if (path.startsWith("public_projects/")) return { exists: () => false, data: () => undefined };
      const savedWrites = backend.setDoc.mock.calls.filter(([reference]) => reference.path.startsWith("submissions/"));
      const savedWrite = savedWrites[savedWrites.length - 1];
      return snapshot("new-project", savedWrite?.[1] ?? {});
    });
    await showDashboard();
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole("textbox", { name: "Project title" }), { target: { value: "First draft" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2600); });

    expect(backend.setDoc).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Save project" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save project" }));
    expect(backend.setDoc).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByRole("textbox", { name: "Project title" }), { target: { value: "Newer draft" } });
    await act(async () => pendingWrite.resolve(undefined));
    expect(screen.getByRole("textbox", { name: "Project title" })).toHaveValue("Newer draft");

    await act(async () => { await vi.advanceTimersByTimeAsync(2600); });

    const projectWrites = backend.setDoc.mock.calls.filter(([reference]) => reference.path.startsWith("submissions/"));
    expect(projectWrites).toHaveLength(2);
    expect(projectWrites[0][1].title).toBe("First draft");
    expect(projectWrites[1][1].title).toBe("Newer draft");
    expect(projectWrites[1][0].path).toBe(projectWrites[0][0].path);
    expect(projectWrites[1][2]).toEqual({ merge: true });
    expect(backend.queueEmail).not.toHaveBeenCalled();
  });

  it("does not repeat the same failed autosave until the participant retries", async () => {
    backend.assertWritable.mockRejectedValueOnce(new Error("Connection interrupted"));
    await showDashboard();
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole("textbox", { name: "Project title" }), { target: { value: "Retained draft" } });

    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });

    expect(backend.assertWritable).toHaveBeenCalledOnce();
    expect(backend.setDoc).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save project" })).toBeEnabled();
    expect(screen.getByText("Connection interrupted")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save project" }));
    await act(async () => {});
    expect(backend.assertWritable).toHaveBeenCalledTimes(2);
    expect(backend.queueEmail).toHaveBeenCalledOnce();
  });

  it("does not offer an empty writable project after an existing-project lookup fails", async () => {
    backend.submissions.mockRejectedValueOnce(new Error("Connection interrupted"));
    render(<MemoryRouter><ParticipantDashboardPage /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your projects");
    expect(screen.getByRole("button", { name: "Save project" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save project" }));
    expect(backend.setDoc).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Retry loading projects" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save project" })).toBeEnabled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the participant's edit when a same-account profile snapshot arrives", async () => {
    const view = await showDashboard();
    fireEvent.change(screen.getByRole("textbox", { name: "Project title" }), { target: { value: "Unfinished idea" } });
    backend.sessionUser = { ...backend.sessionUser, email: "updated@example.com" };

    view.rerender(<MemoryRouter><ParticipantDashboardPage /></MemoryRouter>);
    await act(async () => {});

    expect(screen.getByRole("textbox", { name: "Project title" })).toHaveValue("Unfinished idea");
    expect(backend.submissions).toHaveBeenCalledOnce();
  });

  it("opens discovery for unjoined events and previews an event without enrolling or changing workspaces", async () => {
    const nextEvent = {
      ...event("event-two"),
      name: "Next Community Hackathon",
      theme: "Build useful tools together",
      eventDate: "24 October 2026",
      location: "Tokyo, Japan",
      coverImageUrl: "https://images.example.test/next-event.jpg",
    };
    backend.joinable.mockResolvedValue([event("event-one"), nextEvent]);
    await showDashboard();
    backend.selectEvent.mockClear();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Join another hackathon" }));
    const dialog = screen.getByRole("dialog", { name: "Join another hackathon" });
    const discovery = within(dialog);
    const preview = discovery.getByRole("link", { name: /Preview Next Community Hackathon/ });

    expect(discovery.queryByRole("heading", { name: "event-one" })).not.toBeInTheDocument();
    expect(discovery.getByRole("img", { name: "Next Community Hackathon poster" })).toHaveAttribute("src", nextEvent.coverImageUrl);
    expect(discovery.getByRole("article", { name: nextEvent.name })).toHaveTextContent(nextEvent.eventDate);
    expect(preview).toHaveAttribute("target", "_blank");
    expect(preview).toHaveAttribute("href", "/events/event-two");
    fireEvent.click(preview);

    expect(backend.setDoc).not.toHaveBeenCalled();
    expect(backend.selectEvent).not.toHaveBeenCalled();
    expect(screen.getByTestId("selected-event")).toHaveTextContent(/^event-one$/);
    expect(dialog).toBeInTheDocument();
  });

  it("retries a failed event discovery load without writing enrollment", async () => {
    backend.catalog.mockRejectedValueOnce(new Error("Catalog unavailable"));
    backend.joinable.mockRejectedValueOnce(new Error("Connection interrupted"));
    await showDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Join another hackathon" }));
    const discovery = within(screen.getByRole("dialog", { name: "Join another hackathon" }));
    expect(await discovery.findByRole("alert")).toHaveTextContent("Could not load open hackathons");

    fireEvent.click(discovery.getByRole("button", { name: "Try again" }));

    expect(await discovery.findByRole("button", { name: "Join event-two" })).toBeEnabled();
    expect(discovery.queryByRole("alert")).not.toBeInTheDocument();
    expect(backend.catalog).toHaveBeenCalledTimes(2);
    expect(backend.joinable).toHaveBeenCalledTimes(2);
    expect(backend.setDoc).not.toHaveBeenCalled();
  });

  it("keeps discovery and the old workspace after a failed join, then preserves both enrollments on retry", async () => {
    backend.setDoc.mockRejectedValueOnce(new Error("Enrollment connection failed"));
    await showDashboard();
    backend.selectEvent.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Join another hackathon" }));
    const dialog = screen.getByRole("dialog", { name: "Join another hackathon" });
    const discovery = within(dialog);
    fireEvent.click(discovery.getByRole("button", { name: "Join event-two" }));

    expect(await discovery.findByRole("alert")).toHaveTextContent("Enrollment connection failed");
    expect(discovery.getByRole("button", { name: "Join event-two" })).toBeEnabled();
    expect(backend.selectEvent).not.toHaveBeenCalled();
    expect(screen.getByTestId("selected-event")).toHaveTextContent(/^event-one$/);
    expect(screen.getByTestId("registered-events")).toHaveTextContent(/^event-one$/);

    fireEvent.click(discovery.getByRole("button", { name: "Join event-two" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(backend.selectEvent).toHaveBeenCalledExactlyOnceWith("event-two");
    expect(backend.setDoc).toHaveBeenCalledTimes(2);
    expect(backend.setDoc).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: "users/account-a" }),
      { hackathon_id: "event-two", hackathon_ids: ["event-one", "event-two"] },
      { merge: true },
    );
    expect(screen.getByTestId("registered-events")).toHaveTextContent("event-one");
    expect(screen.getByTestId("registered-events")).toHaveTextContent("event-two");
    expect(backend.queueEmail).not.toHaveBeenCalled();
  });

  it("writes enrollment only once when join is requested repeatedly before the first write finishes", async () => {
    const pendingWrite = deferred<void>();
    backend.setDoc.mockReturnValueOnce(pendingWrite.promise);
    await showDashboard();
    backend.selectEvent.mockClear();
    const join = screen.getByRole("button", { name: "Join event" });

    act(() => {
      fireEvent.click(join);
      fireEvent.click(join);
    });
    fireEvent.click(join);

    expect(backend.setDoc).toHaveBeenCalledOnce();
    expect(backend.selectEvent).not.toHaveBeenCalled();
    await act(async () => { pendingWrite.resolve(undefined); });
    expect(backend.selectEvent).toHaveBeenCalledExactlyOnceWith("event-two");
    expect(backend.setDoc).toHaveBeenCalledOnce();
  });

  it("finishes enrollment and sends the saved submission confirmation for the same account", async () => {
    await showDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Join event" }));
    await waitFor(() => expect(backend.selectEvent).toHaveBeenCalledWith("event-two"));

    fireEvent.click(screen.getByRole("button", { name: "Save project" }));
    await waitFor(() => expect(backend.queueEmail).toHaveBeenCalledWith(expect.objectContaining({
      type: "submission_created", title: "Account A project", teamName: "Team A",
    })));
  });

  it.each(["account changes", "page unmounts"])("ignores a pending enrollment selection when the %s", async (change) => {
    const pendingWrite = deferred<void>();
    backend.setDoc.mockReturnValueOnce(pendingWrite.promise);
    const view = await showDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Join event" }));
    expect(backend.setDoc).toHaveBeenCalledTimes(1);
    backend.selectEvent.mockClear();

    if (change === "account changes") backend.auth.currentUser = { uid: "account-b" };
    else view.unmount();
    await act(async () => { pendingWrite.resolve(undefined); });

    expect(backend.selectEvent).not.toHaveBeenCalled();
  });

  it("does not begin a submission write if accounts change during the permission check", async () => {
    const pendingCheck = deferred<void>();
    backend.assertWritable.mockReturnValueOnce(pendingCheck.promise);
    await showDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Save project" }));
    expect(backend.assertWritable).toHaveBeenCalledOnce();

    backend.auth.currentUser = { uid: "account-b" };
    await act(async () => { pendingCheck.resolve(undefined); });

    expect(backend.setDoc).not.toHaveBeenCalled();
    expect(backend.queueEmail).not.toHaveBeenCalled();
  });

  it("stops follow-up enrollment and public writes if accounts change while the project saves", async () => {
    const pendingWrite = deferred<void>();
    backend.setDoc.mockReturnValueOnce(pendingWrite.promise);
    await showDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Save project" }));
    await waitFor(() => expect(backend.setDoc).toHaveBeenCalledOnce());

    backend.auth.currentUser = { uid: "account-b" };
    await act(async () => { pendingWrite.resolve(undefined); });

    expect(backend.setDoc).toHaveBeenCalledTimes(1);
    expect(backend.setDoc.mock.calls[0][0].path).toBe("submissions/new-project");
    expect(backend.deleteDoc).not.toHaveBeenCalled();
    expect(backend.queueEmail).not.toHaveBeenCalled();
  });

  it.each(["account changes", "page unmounts"])("does not send a delayed submission email when the %s", async (change) => {
    const pendingRead = deferred<typeof savedProject>();
    backend.getDoc.mockImplementation(({ path }: { path: string }) =>
      path.startsWith("users/")
        ? Promise.resolve(snapshot("account-a", { fullName: "Account A", hackathon_id: "event-one" }))
        : pendingRead.promise,
    );
    const view = await showDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Save project" }));
    await waitFor(() => expect(backend.getDoc).toHaveBeenCalledWith(expect.objectContaining({ path: "submissions/new-project" })));

    if (change === "account changes") backend.auth.currentUser = { uid: "account-b" };
    else view.unmount();
    await act(async () => { pendingRead.resolve(savedProject); });

    expect(backend.queueEmail).not.toHaveBeenCalled();
  });
});
