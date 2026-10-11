import type { ComponentProps } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HostDashboardPage from "@/pages/HostDashboardPage";
import type { HostEventBriefEditor } from "@/components/dashboard/HostEventBriefEditor";
import type { HostEventBriefForm } from "@/lib/hostEventBriefForm";
import { formDraftStorageKey, readFormDraft } from "@/lib/formDrafts";
import type { SessionUser } from "@/types/portal";

const backend = vi.hoisted(() => ({
  db: {}, user: {} as SessionUser, events: [] as Array<{ id: string; data: () => Record<string, unknown> }>,
  getDocs: vi.fn(), updateDoc: vi.fn(), addDoc: vi.fn(), publish: vi.fn(), setStatus: vi.fn(),
}));

vi.mock("@/hooks/usePortalAuth", () => ({
  usePortalAuth: () => ({ sessionUser: backend.user, loading: false, signOut: vi.fn() }),
}));
vi.mock("@/lib/firebaseClient", () => ({ getFirestoreDb: () => backend.db }));
vi.mock("firebase/firestore", async (original) => ({
  ...await original<typeof import("firebase/firestore")>(),
  collection: (_db: unknown, name: string) => name,
  doc: (_db: unknown, name: string, id: string) => `${name}/${id}`,
  query: (collection: string) => collection,
  where: vi.fn(),
  getDocs: backend.getDocs, updateDoc: backend.updateDoc, addDoc: backend.addDoc,
}));
vi.mock("@/lib/aiHackathons", async (original) => ({
  ...await original<typeof import("@/lib/aiHackathons")>(),
  publishHostEventPublicly: backend.publish,
  setHackathonStatus: backend.setStatus,
  subscribeHackathon: () => () => {},
}));
vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sectionClass: "", dashJumpLinkClass: "",
}));
vi.mock("@/components/dashboard/HostEventBriefEditor", () => ({
  HostEventBriefEditor: ({ value, onChange, selectedEventId, eventOptions, onSelectEvent, disabled }: ComponentProps<typeof HostEventBriefEditor>) => (
    <div>
      <input aria-label="Event name" value={value.name} disabled={disabled} onChange={(event) => onChange({ ...value, name: event.target.value })} />
      <input aria-label="Event location" value={value.location} disabled={disabled} onChange={(event) => onChange({ ...value, location: event.target.value })} />
      <input aria-label="Event start" value={value.startAt} disabled={disabled} onChange={(event) => onChange({ ...value, startAt: event.target.value })} />
      <select aria-label="Selected event" value={selectedEventId} disabled={disabled} onChange={(event) => onSelectEvent(event.target.value)}>
        <option value="">New draft</option>
        {eventOptions.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
      </select>
    </div>
  ),
}));
vi.mock("@/components/dashboard/HostEventJudgingWorkspace", () => ({ HostEventJudgingWorkspace: () => null, HostJudgingUnavailableNotice: () => null }));
vi.mock("@/components/dashboard/JudgeInvitePanel", () => ({ JudgeInvitePanel: () => null }));
vi.mock("@/components/dashboard/LumaEventImporter", () => ({ LumaEventImporter: () => null }));

const event = (id: string, name: string, patch: Record<string, unknown> = {}) => ({
  id,
  data: () => ({ name, owner_id: "host-a", start_at: "2026-10-15T05:00:00Z", location: "Kyoto", status: "draft", ...patch }),
});
const draftKey = (id: string) => formDraftStorageKey(["host-event", "host-a", id])!;
const page = () => <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><HostDashboardPage /></MemoryRouter>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function showDashboard() {
  const view = render(page());
  await act(async () => {});
  expect(screen.getByLabelText("Event name")).toHaveValue("Event A");
  return view;
}

function editName(value: string) {
  fireEvent.change(screen.getByLabelText("Event name"), { target: { value } });
}
async function advance(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}
function hasUnsavedChanges() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  localStorage.clear();
  vi.clearAllMocks();
  backend.user = { id: "host-a", role: "host", email: "host@example.com", hostApprovalStatus: "approved" };
  backend.events = [event("event-a", "Event A"), event("event-b", "Event B")];
  backend.getDocs.mockReset().mockImplementation(async (collection: string) => ({ docs: collection === "host_events" ? backend.events : [] }));
  backend.updateDoc.mockReset().mockResolvedValue(undefined);
  backend.addDoc.mockReset().mockResolvedValue({ id: "created-event" });
  backend.publish.mockReset().mockResolvedValue({ id: "public-a", status: "upcoming", published: true });
  backend.setStatus.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); });

describe("host event editor save races", () => {
  it("does not reload or leave a new draft when the host session profile refreshes", async () => {
    const view = await showDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Start a new event" }));
    editName("Unsaved new event");
    backend.user = { ...backend.user, profile: { fullName: "Updated host" } };
    view.rerender(page());
    await act(async () => {});

    expect(backend.getDocs).toHaveBeenCalledTimes(3);
    expect(screen.getByLabelText("Selected event")).toHaveValue("");
    expect(screen.getByLabelText("Event name")).toHaveValue("Unsaved new event");
  });

  it("keeps the next event's form, baseline, and draft when an earlier autosave completes", async () => {
    const save = deferred<void>();
    backend.updateDoc.mockReturnValueOnce(save.promise);
    await showDashboard();
    editName("Event A saved name");
    await advance(2500);
    expect(backend.updateDoc).toHaveBeenCalledWith("host_events/event-a", expect.objectContaining({ name: "Event A saved name" }));
    fireEvent.change(screen.getByLabelText("Selected event"), { target: { value: "event-b" } });
    editName("Event B draft");
    await advance(500);

    await act(async () => { save.resolve(undefined); });
    expect(screen.getByLabelText("Event name")).toHaveValue("Event B draft");
    expect(readFormDraft<HostEventBriefForm>(draftKey("event-b"))?.value.name).toBe("Event B draft");
    editName("Event B");
    expect(hasUnsavedChanges()).toBe(false);
    fireEvent.change(screen.getByLabelText("Selected event"), { target: { value: "event-a" } });
    expect(screen.getByLabelText("Event name")).toHaveValue("Event A saved name");
  });

  it("retains newer text and its browser draft when an autosave returns an older snapshot", async () => {
    const save = deferred<void>();
    backend.updateDoc.mockReturnValueOnce(save.promise);
    await showDashboard();
    editName("Submitted name");
    await advance(2500);
    editName("Newer name");
    await advance(500);
    expect(readFormDraft<HostEventBriefForm>(draftKey("event-a"))?.value.name).toBe("Newer name");
    await act(async () => { save.resolve(undefined); });

    expect(screen.getByLabelText("Event name")).toHaveValue("Newer name");
    expect(readFormDraft<HostEventBriefForm>(draftKey("event-a"))?.value.name).toBe("Newer name");
    expect(hasUnsavedChanges()).toBe(true);
    await advance(2500);
    expect(backend.updateDoc).toHaveBeenLastCalledWith("host_events/event-a", expect.objectContaining({ name: "Newer name" }));
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("keeps dirty event details when lifecycle changes refresh the saved event record", async () => {
    backend.events = [event("event-a", "Event A", { public_hackathon_id: "public-a", status: "published" })];
    await showDashboard();
    editName("Unsaved event title");
    fireEvent.click(screen.getByRole("button", { name: "Go live" }));
    await act(async () => {});

    expect(backend.setStatus).toHaveBeenCalledWith(backend.db, "public-a", "active");
    expect(screen.getByLabelText("Event name")).toHaveValue("Unsaved event title");
    expect(hasUnsavedChanges()).toBe(true);
  });

  it("does not replace a fresh draft with a late published-event save", async () => {
    backend.events = [event("event-a", "Event A", { public_hackathon_id: "public-a", status: "published" })];
    const publication = deferred<{ id: string; status: string; published: boolean }>();
    backend.publish.mockReturnValueOnce(publication.promise);
    await showDashboard();
    editName("Saved event title");
    fireEvent.click(screen.getByRole("button", { name: "Save event brief" }));
    await act(async () => {});
    expect(backend.publish).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Start a new event" }));
    await act(async () => { publication.resolve({ id: "public-a", status: "upcoming", published: true }); });

    expect(screen.getByLabelText("Selected event")).toHaveValue("");
    expect(screen.getByLabelText("Event name")).toHaveValue("");
    expect(hasUnsavedChanges()).toBe(false);
    expect(screen.queryByText("Event details saved and public page updated.")).not.toBeInTheDocument();
  });

  it("does not select a late created event after the host starts another new draft", async () => {
    const creation = deferred<{ id: string }>();
    backend.addDoc.mockReturnValueOnce(creation.promise);
    await showDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Start a new event" }));
    editName("Creating event");
    fireEvent.change(screen.getByLabelText("Event location"), { target: { value: "Kyoto" } });
    fireEvent.change(screen.getByLabelText("Event start"), { target: { value: "2026-10-15T14:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Create event draft" }));
    expect(backend.addDoc).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Start a new event" }));
    await act(async () => { creation.resolve({ id: "created-event" }); });

    expect(screen.getByLabelText("Selected event")).toHaveValue("");
    expect(screen.getByLabelText("Event name")).toHaveValue("");
    expect(hasUnsavedChanges()).toBe(false);
  });
});
