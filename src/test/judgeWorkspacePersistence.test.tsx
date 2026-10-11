import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JudgeDashboardPage from "@/pages/JudgeDashboardPage";
import type { JudgeDashboardProps } from "@/components/dashboard/JudgeDashboard";
import type { JudgeFinalShortlistPanel } from "@/components/dashboard/JudgeFinalShortlistPanel";
import type { Submission } from "@/types/portal";
import { readFormDraft } from "@/lib/formDrafts";

const mocks = vi.hoisted(() => ({
  db: {},
  selectedEvent: "event-a",
  user: { id: "judge", email: "judge@example.com", role: "judge", judgeApprovalStatus: "approved", hackathonIds: ["event-a", "event-b"] },
  criteria: [{ id: "impact", title: "Impact", weight: 100, questions: [] }],
  events: ["event-a", "event-b"].map((id) => ({ id, name: id, shortName: id, eventDate: "", location: "", theme: "", status: "active" })),
  submissions: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  guard: vi.fn(),
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => mocks.db }));
vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => ({ sessionUser: mocks.user, loading: false, signOut: vi.fn() }) }));
vi.mock("@/hooks/useHackathonCriteria", () => ({ useHackathonCriteria: () => ({ criteria: mocks.criteria, isLoading: false }) }));
vi.mock("@/hooks/useHackathonSelection", () => ({ useHackathonSelection: () => ({ selectedHackathonId: mocks.selectedEvent, selectedHackathon: mocks.events.find((event) => event.id === mocks.selectedEvent), setSelectedHackathonId: vi.fn() }) }));
vi.mock("@/hooks/useUnsavedChangesGuard", () => ({ useUnsavedChangesGuard: mocks.guard }));
vi.mock("@/lib/aiHackathons", () => ({ fetchPortalHackathonCatalog: async () => mocks.events }));
vi.mock("@/lib/hackathons", async (original) => ({ ...await original<typeof import("@/lib/hackathons")>(), fetchSubmissionsForHackathon: mocks.submissions }));
vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  doc: (_db: unknown, collection: string, id: string) => ({ id, path: `${collection}/${id}` }),
  getDoc: mocks.getDoc,
  updateDoc: mocks.updateDoc,
  setDoc: mocks.setDoc,
}));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>, sectionClass: "" }));
vi.mock("@/components/dashboard/JudgeDashboard", () => ({
  JudgeDashboard: ({ submissions, isLoadingSubmissions, judgeMessage, onNotesChange, onSave }: JudgeDashboardProps) => <div>
    <p>{isLoadingSubmissions ? "Loading workspace" : "Workspace ready"}</p>
    <p>{judgeMessage}</p>
    {submissions.map((submission) => <div key={submission.id}>
      <label>{submission.id} notes<input value={submission.judge_notes ?? ""} onChange={(event) => onNotesChange(submission.id, event.target.value)} /></label>
      <button disabled={isLoadingSubmissions} onClick={() => void onSave(submission.id)}>Save {submission.id}</button>
    </div>)}
  </div>,
}));
vi.mock("@/components/dashboard/JudgeFinalShortlistPanel", () => ({
  JudgeFinalShortlistPanel: ({ submissions, isLoading, top3Ranks, onNotesChange, onTop3RankChange }: ComponentProps<typeof JudgeFinalShortlistPanel>) => <div>
    <p>{isLoading ? "Loading workspace" : "Workspace ready"}</p>
    <label>First place<input value={top3Ranks.first ?? ""} onChange={(event) => onTop3RankChange("first", event.target.value)} /></label>
    {submissions.map((submission) => <label key={submission.id}>{submission.id} final notes<input value={submission.judge_notes ?? ""} onChange={(event) => onNotesChange(submission.id, event.target.value)} /></label>)}
  </div>,
}));

const submission = (id: string, event = "event-a"): Submission => ({
  id, hackathon_id: event, user_id: `owner-${id}`, title: id, team_name: id,
  member_names: null, short_description: null, project_url: null, submission_pdf_url: null,
  demo_video_url: null, created_at: null, judge_score: null, judge_notes: null,
  judge_scores: { judge: 70 }, judge_notes_by_judge: { judge: "Original note" },
  judge_criteria_scores_by_judge: { judge: { impact: 70 } }, final_shortlisted: true,
});
const emptyRanking = { exists: () => false, data: () => undefined };
const draftKey = "cognisor_form_draft:judge-workspace:judge:event-a";
type Draft = { scoresBySubmission: Record<string, { notes: string }>; top3Ranks: { first: string | null } };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
}
const page = (path = "/dashboard/judge") => <MemoryRouter initialEntries={[path]}><JudgeDashboardPage /></MemoryRouter>;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  mocks.selectedEvent = "event-a";
  mocks.submissions.mockReset().mockResolvedValue([submission("project-1"), submission("project-2")]);
  mocks.getDoc.mockReset().mockResolvedValue(emptyRanking);
  mocks.updateDoc.mockReset().mockResolvedValue(undefined);
  mocks.setDoc.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

describe("judge workspace save isolation", () => {
  it("keeps a failed submission dirty when a different submission autosaves successfully", async () => {
    mocks.updateDoc.mockImplementation(async ({ id }: { id: string }) => {
      if (id === "project-2") throw new Error("Write rejected");
    });
    render(page());
    await screen.findByText("Workspace ready");
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole("textbox", { name: "project-1 notes" }), { target: { value: "Saved note" } });
    fireEvent.change(screen.getByRole("textbox", { name: "project-2 notes" }), { target: { value: "Still unsaved" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(3500); });

    expect(mocks.updateDoc).toHaveBeenCalledTimes(2);
    expect(mocks.guard).toHaveBeenLastCalledWith(true);
    expect(readFormDraft<Draft>(draftKey)?.value.scoresBySubmission["project-2"].notes).toBe("Still unsaved");
    expect(screen.getByText(/Some scores could not be saved/)).toBeInTheDocument();
  });

  it("keeps an unsaved top-three ballot after score autosave succeeds", async () => {
    render(page("/dashboard/judge/final-shortlist"));
    await screen.findByText("Workspace ready");
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole("textbox", { name: "First place" }), { target: { value: "project-1" } });
    fireEvent.change(screen.getByRole("textbox", { name: "project-1 final notes" }), { target: { value: "Final round note" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(3500); });

    expect(mocks.updateDoc).toHaveBeenCalledOnce();
    expect(mocks.setDoc).not.toHaveBeenCalled();
    expect(mocks.guard).toHaveBeenLastCalledWith(true);
    expect(readFormDraft<Draft>(draftKey)?.value.top3Ranks.first).toBe("project-1");
  });

  it("ignores a late submission load after the judge switches events", async () => {
    const oldLoad = deferred<Submission[]>();
    mocks.submissions.mockImplementation((_db, event) => event === "event-a" ? oldLoad.promise : Promise.resolve([submission("event-b-project", "event-b")]));
    const view = render(page());
    await waitFor(() => expect(mocks.submissions).toHaveBeenCalledWith(mocks.db, "event-a"));
    mocks.selectedEvent = "event-b";
    view.rerender(page());
    await screen.findByText("Workspace ready");
    expect(screen.getByRole("textbox", { name: "event-b-project notes" })).toBeInTheDocument();
    await act(async () => { oldLoad.resolve([submission("stale-event-a-project")]); });
    expect(screen.getByRole("textbox", { name: "event-b-project notes" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "stale-event-a-project notes" })).not.toBeInTheDocument();
    expect(mocks.getDoc).toHaveBeenCalledOnce();
  });

  it("ignores an old event's late ranking without ending the new event's loading state", async () => {
    const oldRanking = deferred<typeof emptyRanking>();
    const newLoad = deferred<Submission[]>();
    mocks.getDoc.mockReturnValueOnce(oldRanking.promise).mockResolvedValue(emptyRanking);
    mocks.submissions.mockImplementation((_db, event) => event === "event-a" ? Promise.resolve([submission("project-1")]) : newLoad.promise);
    const view = render(page());
    await waitFor(() => expect(mocks.getDoc).toHaveBeenCalledOnce());
    mocks.selectedEvent = "event-b";
    view.rerender(page());
    await act(async () => { oldRanking.resolve(emptyRanking); });
    expect(screen.getByText("Loading workspace")).toBeInTheDocument();
    await act(async () => { newLoad.resolve([submission("event-b-project", "event-b")]); });
    expect(await screen.findByText("Workspace ready")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "event-b-project notes" })).toBeInTheDocument();
  });

  it("preserves edits typed during a manual save and keeps them in the browser draft", async () => {
    const saving = deferred<void>();
    mocks.updateDoc.mockReturnValue(saving.promise);
    render(page());
    await screen.findByText("Workspace ready");
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole("textbox", { name: "project-1 notes" }), { target: { value: "Sent note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save project-1" }));
    fireEvent.change(screen.getByRole("textbox", { name: "project-1 notes" }), { target: { value: "Newer unfinished note" } });
    await act(async () => { saving.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });

    expect(screen.getByRole("textbox", { name: "project-1 notes" })).toHaveValue("Newer unfinished note");
    expect(mocks.guard).toHaveBeenLastCalledWith(true);
    expect(readFormDraft<Draft>(draftKey)?.value.scoresBySubmission["project-1"].notes).toBe("Newer unfinished note");
    expect(mocks.getDoc).toHaveBeenCalledOnce();
  });

  it.each(["submissions", "rankings"])("preserves the existing draft after %s fails to load and restores it after retry", async (failure) => {
    const existingDraft = JSON.stringify({
      version: 1,
      savedAt: "2026-10-01T00:00:00Z",
      value: { scoresBySubmission: { "project-1": { notes: "Keep this unsaved draft", criteria: { impact: 81 } } }, top3Ranks: { first: null, second: null, third: null } },
    });
    localStorage.setItem(draftKey, existingDraft);
    if (failure === "submissions") mocks.submissions.mockRejectedValueOnce(new Error("Temporary load failure"));
    else mocks.getDoc.mockRejectedValueOnce(new Error("Temporary load failure"));
    render(page());
    expect(await screen.findByRole("alert")).toHaveTextContent("Temporary load failure");
    expect(screen.getByText("Loading workspace")).toBeInTheDocument();
    expect(localStorage.getItem(draftKey)).toBe(existingDraft);
    expect(mocks.updateDoc).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Retry loading scores" }));
    await screen.findByText("Workspace ready");
    expect(screen.getByRole("textbox", { name: "project-1 notes" })).toHaveValue("Keep this unsaved draft");
    expect(mocks.guard).toHaveBeenLastCalledWith(true);
  });

  it("queues a newer manual save behind an in-flight autosave for the same submission", async () => {
    const autosave = deferred<void>();
    const manualSave = deferred<void>();
    mocks.updateDoc.mockReturnValueOnce(autosave.promise).mockReturnValueOnce(manualSave.promise);
    render(page());
    await screen.findByText("Workspace ready");
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole("textbox", { name: "project-1 notes" }), { target: { value: "Autosave note" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.updateDoc).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByRole("textbox", { name: "project-1 notes" }), { target: { value: "Newer manually saved note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save project-1" }));
    await act(async () => { await Promise.resolve(); });
    expect(mocks.updateDoc).toHaveBeenCalledOnce();
    await act(async () => { autosave.resolve(); });
    expect(mocks.updateDoc).toHaveBeenCalledTimes(2);
    expect(mocks.updateDoc.mock.calls[1][1]).toMatchObject({ "judge_notes_by_judge.judge": "Newer manually saved note" });
    await act(async () => { manualSave.resolve(); });

    expect(screen.getByRole("textbox", { name: "project-1 notes" })).toHaveValue("Newer manually saved note");
    expect(mocks.guard).toHaveBeenLastCalledWith(false);
    expect(readFormDraft(draftKey)).toBeNull();
  });
});
